var View = require('kappa-view-level')
var through = require('through2')
var readonly = require('read-only-stream')
var charwise = require('charwise')
var xtend = require('xtend')
var EventEmitter = require('events').EventEmitter

module.exports = function (lvl) {
  var events = new EventEmitter()

  return View(lvl, {
    map: function (msg) {
      if (msg.value.type.startsWith('chat/') && msg.value.content.channel) {
        var key = 'msg!' + msg.value.content.channel + '!' + charwise.encode(msg.value.timestamp)
        return [
          [key, msg]
        ]
      } else {
        return []
      }
    },

    indexed: function (msgs) {
      msgs.forEach(function (msg) {
        events.emit('message', msg)
        events.emit(msg.value.content.channel, msg)
      })
    },

    api: {
      read: function (core, channel, opts) {
        opts = opts || {}

        var t = through.obj()

        if (opts.gt) opts.gt = 'msg!' + channel + '!' + charwise.encode(opts.gt)  + '!'
        else opts.gt = 'msg!' + channel + '!'
        if (opts.lt) opts.lt = 'msg!' + channel + '!' + charwise.encode(opts.lt)  + '~'
        else opts.lt = 'msg!' + channel + '~'

        this.ready(function () {
          var v = lvl.createValueStream(xtend(opts, {
            reverse: true
          }))
          v.pipe(t)
        })

        return readonly(t)
      },

      events: events
    }
  })
}
