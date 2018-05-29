var View = require('kappa-view-level')
var through = require('through2')
var readonly = require('read-only-stream')
var charwise = require('charwise')
var xtend = require('xtend')
var timestamp = require('monotonic-timestamp')

module.exports = function (lvl) {
  return View(lvl, {
    map: function (msg) {
      var mappings = []

      // user info (full replacement; not a patch)
      if (msg.value.type === 'about') {
        var key = 'user!' + msg.key
        var value = msg.value.content
        mappings.push([key, value])
      }

      return mappings
    },

    api: {
      get: function (core, key, cb) {
        this.ready(function () {
          lvl.get('user!' + key, cb)
        })
      },

      getAll: function (core, cb) {
        this.ready(function () {
          var res = {}
          var v = lvl.createReadStream({
            gt: 'user!' + '!',
            lt: 'user!' + '~'
          })
          v.on('data', function (key, info) {
            res[key] = info
          })
          v.once('end', cb.bind(null, null, res))
          v.once('error', cb)
        })
      }
    }
  })
}
