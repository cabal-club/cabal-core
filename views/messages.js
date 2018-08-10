var View = require('kappa-view-level')
var through = require('through2')
var readonly = require('read-only-stream')
var charwise = require('charwise')
var xtend = require('xtend')
var events = require('events')

module.exports = function (lvl) {
  var emitter = new events.EventEmitter()

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
        emitter.emit('message', msg)
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

      listen: function (core, channel, fn) {
        emitter.on('message', function (msg) {
          if (msg.value.content.channel === channel) {
            fn(msg)
          }
        })
      }
    }
  })
}
