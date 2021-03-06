const EventEmitter = require('events').EventEmitter
const pump = require('pump')
const Writable = require('readable-stream').Writable
const makeView = require('kappa-view')
  
/* view data structure
1. archive!<channelname>: '<pubkey of archivist>@<sequence of message for archivist's feed>'
example: 
  archive!default: 'feed..b01@1337'
2. unarchive!<channelname>: '<pubkey of archivist>@<sequence of message for archivist's feed>'
example: 
  archive!default: 'feed..b01@1337'

message schema: 
{ 
  key: <pubkey of archivist>,
  seq: <sequence of archive action in log>,
  value: {
    type: 'channel/archive' or 'channel/unarchive',
    content: {
      channel: <channel>,
      reason: <optional string reason for archiving || ''>
    }
  }
}
*/

function getAuthorizedKeys (kcore, cb) {
  return Promise.all([getKeys('admin'), getKeys('mod')]).then(res => cb(res[0].concat(res[1]).map(row => row.id)))

  // collect pubkeys for cabal-wide mods or admins
  function getKeys (flag) {
    return new Promise((resolve, reject) => {
      function processResult (err, result) {
        if (err) return resolve([])
        resolve(result)
      }
      kcore.api.moderation.listByFlag({ flag, channel: '@' }, processResult)
    })
  }
}

module.exports = function (cabal, lvl) {
  var events = new EventEmitter()

  return makeView(lvl, function (db) {
    return {
      maxBatch: 500,
      map: function (msgs, next) {
        // 1. go over each msg
        // 2. check if it's an archive/unarchive msg (skip if not)
        // 3. accumulate a level PUT for message type, level DEL for opposite
        //    e.g. if channel/archive -> PUT archive:<channel>, DEL unarchive:<channel>
        // 4. write it all to leveldb as a batch
        const ops = []
        msgs.forEach(function (msg) {
          if (!sanitize(msg)) { return }
          const channel = msg.value.content.channel
          const reason = msg.value.content.reason || ''
          const key = msg.key
          if (/^channel\/(un)?archive$/.test(msg.value.type)) {
            const activeType = (msg.value.type === "channel/archive") ? "archive" : "unarchive"
            const oppositeType = (activeType === "archive") ? "unarchive" : "archive"

            ops.push({
              type: 'put',
              key: `${activeType}!${channel}!${key}`,
              value: `${key}@${msg.seq}`
            })

            ops.push({
              type: 'del',
              key: `${oppositeType}!${channel}!${key}`
            })

            events.emit(activeType, channel, reason, key)
          }
        })
        if (ops.length) db.batch(ops, next)
        else next()
      },
      api: {
        // get the list of channels explicitly unarchived by key, typically the local user
        getUnarchived: function (core, peerkey, cb) {
          this.ready(function () {
            const channels = []
            db.createKeyStream({
              gt: 'unarchive!!',
              lt: 'unarchive!~'
            })
              .on('data', function (row) {
                // structure of `row`: unarchive!<channel>!<key>
                const [_, channel, key] = row.split('!') // drop 'unarchive' when splitting on !
                if (key === peerkey) { channels.push(channel) }
              })
              .once('end', function () {
                cb(null, channels)
              })
              .once('error', cb)
          })
        },
        // get the list of currently archived channels 
        get: function (core, cb) {
          this.ready(() => {
            // query mod view to determine if archiving will be applied locally (archiver is a mod or an admin)
            getAuthorizedKeys(core, authorizedKeys => {
              const channels = []
              db.createKeyStream({
                gt: 'archive!!',
                lt: 'archive!~'
              })
                .on('data', (row) => {
                  // structure of `row`: archive!<channel>!<key>
                  const [_, channel, key] = row.split('!') // drop 'archive' when splitting on !
                  if (authorizedKeys.indexOf(key) >= 0) { channels.push(channel) }
                })
                .once('end', () => {
                  // the local user's **unarchived** channels take precedence over other's archived channels
                  cabal.getLocalKey((err, localKey) => {
                    if (err) return cb(null, channels)
                    core.api.archives.getUnarchived(localKey, (err, unarchivedChannels) => {
                      unarchivedChannels = unarchivedChannels || []
                      unarchivedChannels.forEach(ch => {
                        const i = channels.indexOf(ch)
                        // if the local user has unarchived a previously archived channel:
                        // remove the archived channel from the result
                        if (i >= 0) { channels.splice(i, 1) }
                      })
                      cb(null, channels)
                    })
                  })
                })
                .once('error', cb)
            })
          })
        },
        events: events
      }
    }
  })
}

// Either returns a well-formed chat message, or null.
function sanitize (msg) {
  if (typeof msg !== 'object') return null
  if (typeof msg.value !== 'object') return null
  if (typeof msg.value.content !== 'object') return null
  if (typeof msg.value.timestamp !== 'number') return null
  if (typeof msg.value.type !== 'string') return null
  if (typeof msg.value.content.channel !== 'string') return null
  return msg
}
