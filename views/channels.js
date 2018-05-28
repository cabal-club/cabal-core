var View = require('kappa-view-level')

module.exports = function (db, lvl) {
  return View(lvl, {
    map: function (msg) {
      if (msg.value.type === 'text/chat' && msg.value.content.channel) {
        return [
          [ 'channel!' + msg.value.content.channel, 1 ]
        ]
      } else {
        return []
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
      }
    }
  })
}
