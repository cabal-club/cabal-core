var View = require('kappa-view-level')
var EventEmitter = require('events').EventEmitter

module.exports = function (lvl) {
  var events = new EventEmitter()

  return View(lvl, {
    map: function (msg) {
      if (!sanitize(msg)) return []
      var mappings = []
      if (msg.value.type === 'chat/topic' && msg.value.content && msg.value.content.channel) {
        var key = 'channel!topic!' + msg.value.content.channel
        var value = msg.value.content.text
        mappings.push([key, value])
      }
      return mappings
    },

    indexed: function (msgs) {
      msgs
        .filter(msg => Boolean(sanitize(msg)))
        .filter(msg => msg.value.type.startsWith('chat/topic') && msg.value.content && msg.value.content.channel)
        .sort(cmpMsg)
        .forEach(function (msg) {
          events.emit(msg.value.content.channel, msg)
          events.emit('update', msg)
        })
    },

    api: {
      get: function (core, channel, cb) {
        if (!channel) return
        this.ready(function () {
          lvl.get('channel!topic!' + channel, (err, topic) => {
            cb(err, topic)
          })
        })
      },

      events: events
    }
  })
}

function cmpMsg (a, b) {
  return a.value.timestamp - b.value.timestamp
}

// Either returns a well-formed channel message, or null.
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
