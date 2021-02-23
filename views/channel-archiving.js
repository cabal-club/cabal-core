const EventEmitter = require('events').EventEmitter
const pump = require('pump')
const Writable = require('readable-stream').Writable
const makeView = require('kappa-view')
  
/*
view data structure, the value (1) doesn't matter
archive!<channelname>: '<pubkey of archivist>:<reason string>'
archive!default: 'feed..b01:unused channel'

ARCHIVE msg: leveldb PUT
UNARCHIVE msg: leveldb DEL

message schema: 
{ 
  channel: <channel>,
  type: 'channel/archive' or 'channel/unarchive',
  key: <pubkey of archivist>,
  reason: <optional string reason for archiving>
}
*/

function getAuthorizedKeys (kcore, cb) {
  return Promise.all([getKeys('admin'), getKeys('mod')]).then(res => cb(res[0].concat(res[1]).map(row => row.id)))

  // collect pubkeys for cabal-wide mods or admins
  function getKeys (flag) {
    return new Promise((resolve, reject) => {
      function processResult (err, result) {
        if (err) resolve([])
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
        // 3. accumulate a levelup PUT or DEL operation for it
        // 4. write it all to leveldb as a batch
        const ops = []
        msgs.forEach(function (msg) {
          if (!sanitize(msg)) { return }
          const channel = msg.value.content.channel
          const reason = msg.value.content.reason || ''
          const key = msg.key
          if (msg.value.type === 'channel/archive') {
            ops.push({
              type: 'del',
              key: `unarchive!${channel}!${key}`
            })
            ops.push({
              type: 'put',
              key: `archive!${channel}!${key}`,
              value: `${key}@${msg.seq}`
            })

            events.emit('archive', channel, reason, key)
          } else if (msg.value.type === 'channel/unarchive') {
            ops.push({
              type: 'put',
              key: `unarchive!${channel}!${key}`,
              value: `${key}@${msg.seq}`
            })
            ops.push({
              type: 'del', 
              key: `archive!${channel}!${key}`,
            })
            events.emit('unarchive', channel, reason, key)
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
                const pieces = row.split('!')
                const channel = pieces[1]
                const key = pieces[2]
                if (key === peerkey) {
                  channels.push(channel)
                }
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
                  const pieces = row.split('!')
                  const channel = pieces[1]
                  const key = pieces[2]
                  if (authorizedKeys.indexOf(key) >= 0) {
                    channels.push(channel)
                  }
                })
                .once('end', () => {
                  // the local user's **unarchived** channels take precedence over other's archived channels
                  cabal.getLocalKey((err, localKey) => {
                    if (err) return cb(null, channels)
                    core.api.archives.getUnarchived(localKey, (err, unarchivedChannels) => {
                      unarchivedChannels = unarchivedChannels || []
                      unarchivedChannels.forEach(ch => {
                        const i = channels.indexOf(ch)
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
