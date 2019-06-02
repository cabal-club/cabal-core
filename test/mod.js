var Cabal = require('..')
var test = require('tape')
var ram = require('random-access-memory')
var randomBytes = require('crypto').randomBytes
var collect = require('collect-stream')

test('ban a user by key', function (t) {
  t.plan(6)
  var addr = randomBytes(32).toString('hex')
  var cabal0 = Cabal(ram, 'cabal://' + addr)
  cabal0.ready(function () {
    cabal0.getLocalKey(function (err, key) {
      t.error(err)
      var cabal1 = Cabal(ram, 'cabal://' + key + '@' + addr)
      var cabal2 = Cabal(ram, 'cabal://' + key + '@' + addr)
      var pending = 3
      cabal1.ready(function () {
        if (--pending === 0) ready(cabal0, cabal1, cabal2)
      })
      cabal2.ready(function () {
        if (--pending === 0) ready(cabal0, cabal1, cabal2)
      })
      if (--pending === 0) ready(cabal0, cabal1, cabal2)
    })
  })
  function ready (cabal0, cabal1, cabal2) {
    cabal1.getLocalKey(function (err, key1) {
      t.error(err)
      cabal0.publish({
        type: 'ban/add',
        content: { key: key1 }
      })
      sync([cabal0,cabal1,cabal2])
      setTimeout(function () {
        collect(cabal2.moderation.listBans('@'), function (err, bans) {
          t.error(err)
          t.deepEqual(bans, [{ key: key1 }])
        })
        cabal2.moderation.isBanned({ key: key1 }, function (err, banned) {
          t.error(err)
          t.ok(banned)
        })
      }, 1000)
    })
  }
})

function sync (cabals) {
  for (var i = 0; i < cabals.length; i++) {
    var a = cabals[i]
    var b = cabals[(i+1)%cabals.length]
    var ra = a.replicate({ live: true })
    var rb = b.replicate({ live: true })
    ra.pipe(rb).pipe(ra)
  }
}
