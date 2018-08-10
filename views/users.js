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
        var key = 'user!about!' + msg.key
        var value = msg.value.content
        mappings.push([key, value])
      } else {
        mappings.push(['user!key!' + msg.key, 1])
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
          v.on('data', function (row) {
            var parts = row.key.split('!')
            var key = parts[2]
            if (parts.length === 3 && parts[1] === 'about') {
              if (!res[key]) res[key] = {}
              res[key].name = row.value.name
            } else if (!res[key]) {
              res[key] = {
                name: key.substring(0, 12)
              }
            }
          })
          v.once('end', cb.bind(null, null, res))
          v.once('error', cb)
        })
      }
    }
  })
}
