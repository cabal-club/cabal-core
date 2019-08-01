var EventEmitter = require('events').EventEmitter
  
/*
view data structure, the value (1) doesn't matter
member!default!01fee: 1
member!cabal-core!01fee: 1
member!default!83732: 1

JOIN msg: leveldb PUT
LEAVE msg: leveldb DEL
*/

module.exports = function (lvl) {
  var events = new EventEmitter()

  return {
    maxBatch: 100,
    map: function (msgs, next) {
      // 1. go over each msg
      // 2. check if it's a leave/join msg (skip if not)
      // 3. accumulate a levelup PUT or DEL operation for it
      // 4. write it all to leveldb as a batch
      var ops = []
      var seen = {}
      msgs.forEach(function (msg) {
        if (!sanitize(msg)) return
        if (msg.value.type === 'channel/join') {
          var channel = msg.value.content.channel
          var key = msg.key
          var pair = channel+key // a composite key, to know if we have seen this pari
          ops.push({
            type: 'put',
            key: 'member!' + channel + '!' + key,
            value: 1
          })

          if (!seen[pair]) events.emit('add', channel, key)
          seen[pair] = true
        } else if (msg.value.type === 'channel/leave') {
          ops.push({
            type: "del", 
            key: 'member!' + channel + '!' + key,
          })
          if (seen[pair]) { 
            delete seen[pair]
            events.emit('remove', channel, key)
          }
        }
        lvl.batch(ops, next)
      })
    },
    // get(channel) => [Key] 
    // isMember(key, channel) => Boolean
    // getMemberships(key) => [String]
    api: {
      // get which channels the passed in peer has joined
      getMemberships: function (core, key, cb) {
        this.ready(function () {
          var channels = []
          lvl.createKeyStream({
            gt: 'member!!',
            lt: 'member!~'
          })
            .on('data', function (row) {
              // structure of `row`: member!<channel>!<userkey>
              var pieces = row.split('!')
              var channel = pieces[1]
              var userKey = pieces[2]
              if (key !== userKey) return
              channels.push(channel)
            })
            .once('end', function () {
              cb(null, channels)
            })
            .once('error', cb)
        })
      },

      // get a list of peers which have joined `channel`
      getUsers: function (core, channel, cb) {
        this.ready(function () {
          var users = []
          lvl.createKeyStream({
            gt: 'member!' + channel + '!',
            lt: 'member!' + channel + '~'
          })
            .on('data', function (row) {
              var pieces = row.split('!')
              var user = pieces[2]
              users.push(user)
            })
            .once('end', function () {
              cb(null, users)
            })
            .once('error', cb)
        })
      },
      // isMember(key, channel) => Boolean
      // check if peer with <key> is joined to <channel>
      isMember: function (core, key, channel, cb) {
        this.ready(function () {
          var users = []
          lvl.get('member!' + channel + '!' + key, function memberResult (err, res) {
              // actual error
              if (err && !err.notFound) return cb(err, null)
              // note: if not found, err.notFound is set
              if (err && err.notFound) return cb(null, false) // peer was not member
              cb(null, true) // peer was a member of the channel
          })
        })
      },
      events: events
    },

    storeState: function (state, cb) {
      state = state.toString('base64')
      lvl.put('state', state, cb)
    },

    fetchState: function (cb) {
      lvl.get('state', function (err, state) {
        if (err && err.notFound) cb()
        else if (err) cb(err)
        else cb(null, Buffer.from(state, 'base64'))
      })
    },
  }
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
