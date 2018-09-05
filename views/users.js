var View = require('kappa-view-level')
var through = require('through2')
var readonly = require('read-only-stream')
var charwise = require('charwise')
var xtend = require('xtend')
var timestamp = require('monotonic-timestamp')
var EventEmitter = require('events').EventEmitter

// TODO: some way to make this index be cumulative, not just piecewise updates
//       (this could be done by making each field a level key entry

module.exports = function (lvl) {
  var events = new EventEmitter()

  return View(lvl, {
    map: function (msg) {
      if (!sanitize(msg)) return []

      var mappings = []

      // user info (full replacement; not a patch)
      if (msg.value.type === 'about') {
        var key = 'user!about!' + msg.key
        var value = msg.value.content
        mappings.push([key, value])
      } else {
        mappings.push(['user!key!' + msg.key, 1])
      }

      return mappings
    },

    indexed: function (msgs) {
      msgs.forEach(function (msg) {
        if (!sanitize(msg)) return
        if (msg.value.type === 'about') {
          events.emit(msg.key, msg)
          events.emit('update', msg.key, msg)
        }
      })
    },

    api: {
      get: function (core, key, cb) {
        this.ready(function () {
          lvl.get('user!about!' + key, cb)
        })
      },

      getAll: function (core, cb) {
        this.ready(function () {
          var res = {}
          var v = lvl.createReadStream({
            gt: 'user!' + '!',
            lt: 'user!' + '~'
          })
          v.on('data', function (row) {
            var parts = row.key.split('!')
            var key = parts[2]
            if (parts.length === 3 && parts[1] === 'about') {
              if (!res[key]) res[key] = { key: key }
              res[key].name = row.value.name
            } else if (!res[key]) {
              res[key] = {
                key: key
              }
            }
          })
          v.once('end', cb.bind(null, null, res))
          v.once('error', cb)
        })
      },

      events: events
    }
  })
}

// Either returns a well-formed user message, or null.
function sanitize (msg) {
  if (typeof msg !== 'object') return null
  if (typeof msg.value !== 'object') return null
  if (typeof msg.value.content !== 'object') return null
  if (typeof msg.value.timestamp !== 'number') return null
  if (typeof msg.value.type !== 'string') return null
  return msg
}
