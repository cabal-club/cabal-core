var EventEmitter = require('events').EventEmitter

module.exports = function (lvl) {
  var events = new EventEmitter()

  return {
    maxBatch: 100,

    map: function (msgs, next) {
      var ops = []
      var seen = {}
      var pending = 0
      msgs.forEach(function (msg) {
        if (!sanitize(msg)) return
        if (msg.value && msg.value.content && msg.value.content.channel) {
          var channel = msg.value.content.channel
          pending++
          lvl.get('channel!' + channel, function (err) {
            if (err && err.notFound) {
              if (!seen[channel]) events.emit('add', channel)
              seen[channel] = true

              ops.push({
                type: 'put',
                key: 'channel!' + channel,
                value: 1
              })
            }
            if (!--pending) done()
          })
        }
      })
      if (!pending) done()

      function done () {
        lvl.batch(ops, next)
      }
    },

    api: {
      get: function (core, cb) {
        this.ready(function () {
          var channels = []
          lvl.createKeyStream({
            gt: 'channel!!',
            lt: 'channel!~'
          })
            .on('data', function (channel) {
              channels.push(channel.replace('channel!', ''))
            })
            .once('end', function () {
              cb(null, channels)
            })
            .once('error', cb)
        })
      },

      events: events
    },

    storeState: function (state, cb) {
      lvl.put('state', state, cb)
    },

    fetchState: function (cb) {
      lvl.get('state', function (err, state) {
        if (err && err.notFound) cb()
        else if (err) cb(err)
        else cb(null, state)
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
