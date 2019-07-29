var EventEmitter = require('events').EventEmitter


/*

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
      msgs.forEach(function (msg) {
      	if (msg.value.type === 'join') {
          ops.push({
            type: 'put',
            key: 'member!' + msg.value.channel + '!' + msg.key,
            value: 1
          })
        } else if (msg.value.type === 'leave') {
          ops.push({
            type: "del", 
            key: 'member!' + msg.value.channel + '!' + msg.key,
          })
        }

        lvl.batch(ops, next)
    },

    // get(channel) => [Key] ???
    // isMember(key, channel) => Boolean
    // getMemberships(key) => [String]

    api: {
      // member!channel!key
      getMemberships: function (core, key, cb) {
        this.ready(function () {
          var channels = []
          lvl.createKeyStream({
            gt: 'member!!',
            lt: 'member!~'
          })
            .on('data', function (row) {
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
      get: function (core, channel, cb) {
        this.ready(function () {
          var users = []
          lvl.createKeyStream({
            gt: 'member!' + channel + '!',
            lt: 'member!' + channel + '~'
          })
            .on('data', function (row) {
              var pieces = row.split('!')
              var userChannel = pieces[1] 
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
      isMember: function (core, key, channel, cb) {
        this.ready(function () {
        // if not found, err.notFound is set
          var users = []
          lvl.get('member!' + channel + '!' + key, function memberResult (err, res) {
              if (err && !err.notFound) return cb(err, null)
              if (err && err.notFound) return cb(null, false) // user was not member
              cb(null, true) // user was a member of the channel
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
  if (typeof msg.value.content.text !== 'string') return null
  return msg
}
