var Cabal = require('..')
var test = require('tape')
var ram = require('random-access-memory')
var randomBytes = require('crypto').randomBytes
var collect = require('collect-stream')
var pump = require('pump')

test('ban a user by key', function (t) {
  t.plan(7)

  var addr = randomBytes(32).toString('hex')
  var cabal0 = Cabal(ram, 'cabal://' + addr)
  var key0 = null
  cabal0.ready(function () {
    cabal0.getLocalKey(function (err, key) {
      t.error(err)
      key0 = key
      var cabal1 = Cabal(ram, 'cabal://' + addr, { modKey: key })
      var cabal2 = Cabal(ram, 'cabal://' + addr, { modKey: key })
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
      sync([cabal0,cabal1,cabal2], function (err) {
        t.error(err)
        collect(cabal2.moderation.listBans('@'), function (err, bans) {
          t.error(err)
          t.deepEqual(bans, [
            { type: 'key', id: key1, key: key0+'@0' }
          ])
        })
        cabal2.moderation.isBanned({ key: key1 }, function (err, banned) {
          t.error(err)
          t.ok(banned)
        })
      })
    })
  }
})

test('banning a user /wo a modkey is local-only', function (t) {
  t.plan(9)

  var addr = randomBytes(32).toString('hex')
  var cabal0 = Cabal(ram, 'cabal://' + addr)
  cabal0.ready(function () {
    cabal0.getLocalKey(function (err, key) {
      t.error(err)
      var cabal1 = Cabal(ram, 'cabal://' + addr)
      var cabal2 = Cabal(ram, 'cabal://' + addr)
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

      sync([cabal0,cabal1,cabal2], function (err) {
        t.error(err)
        cabal0.moderation.isBanned({ key: key1 }, function (err, banned) {
          t.error(err)
          t.ok(banned)
        })
        cabal1.moderation.isBanned({ key: key1 }, function (err, banned) {
          t.error(err)
          t.notOk(banned)
        })
        cabal2.moderation.isBanned({ key: key1 }, function (err, banned) {
          t.error(err)
          t.notOk(banned)
        })
      })
    })
  }
})

test('delegated moderator ban a user by key', function (t) {
  t.plan(16)

  var addr = randomBytes(32).toString('hex')
  var cabal0 = Cabal(ram, 'cabal://' + addr)
  var key0 = null
  cabal0.ready(function () {
    cabal0.getLocalKey(function (err, key) {
      t.error(err)
      key0 = key
      var cabal1 = Cabal(ram, addr, { modKey: key })
      var cabal2 = Cabal(ram, addr, { modKey: key })
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
      cabal2.getLocalKey(function (err, key2) {
        t.error(err)
        cabal0.publish({
          type: 'mod/add',
          content: { key: key2, role: 'mod' }
        })
        cabal2.publish({
          type: 'ban/add',
          content: { key: key1 }
        })
        sync([cabal0,cabal1,cabal2], function (err) {
          t.error(err)
          collect(cabal0.moderation.listBans('@'), function (err, bans) {
            t.error(err)
            t.deepEqual(bans, [
              { type: 'key', id: key1, key: key2 + '@0' }
            ])
          })
          collect(cabal1.moderation.listBans('@'), function (err, bans) {
            t.error(err)
            t.deepEqual(bans, [], 'cannot ban self')
          })
          collect(cabal2.moderation.listBans('@'), function (err, bans) {
            t.error(err)
            t.deepEqual(bans, [
              { type: 'key', id: key1, key: key2 + '@0' }
            ])
          })
          cabal0.moderation.isBanned({ key: key1 }, function (err, banned) {
            t.error(err)
            t.ok(banned)
          })
          cabal1.moderation.isBanned({ key: key1 }, function (err, banned) {
            t.error(err)
            t.notOk(banned, 'cannot ban self')
          })
          cabal2.moderation.isBanned({ key: key1 }, function (err, banned) {
            t.error(err)
            t.ok(banned)
          })
        })
      })
    })
  }
})

test('different mod keys have different views', function (t) {
  t.plan(11)

  var addr = randomBytes(32).toString('hex')

  var cabal0 = Cabal(ram, addr)
  cabal0.ready(function () {
    cabal0.getLocalKey(function (err, key) {
      t.error(err)
      var cabal1 = Cabal(ram, addr, { modKey: key })
      var cabal2 = Cabal(ram, addr)
      var cabal3 = Cabal(ram, addr, { modKey: key })
      var pending = 4
      cabal1.ready(function () {
        if (--pending === 0) ready(cabal0, cabal1, cabal2, cabal3)
      })
      cabal2.ready(function () {
        if (--pending === 0) ready(cabal0, cabal1, cabal2, cabal3)
      })
      cabal3.ready(function () {
        if (--pending === 0) ready(cabal0, cabal1, cabal2, cabal3)
      })
      if (--pending === 0) ready(cabal0, cabal1, cabal2, cabal3)
    })
  })
  function ready (cabal0, cabal1, cabal2, cabal3) {
    cabal1.getLocalKey(function (err, key1) {
      t.error(err)
      cabal0.publish({
        type: 'ban/add',
        content: { key: key1 }
      })
      sync([cabal0,cabal1,cabal2,cabal3], function (err) {
        t.error(err)
        cabal0.moderation.isBanned({ key: key1 }, function (err, banned) {
          t.error(err)
          t.ok(banned)
        })
        cabal1.moderation.isBanned({ key: key1 }, function (err, banned) {
          t.error(err)
          t.notOk(banned)
        })
        cabal2.moderation.isBanned({ key: key1 }, function (err, banned) {
          t.error(err)
          t.notOk(banned)
        })
        cabal3.moderation.isBanned({ key: key1 }, function (err, banned) {
          t.error(err)
          t.ok(banned)
        })
      })
    })
  }
})

test('ban a user by key with a reason', function (t) {
  t.plan(10)

  var addr = randomBytes(32).toString('hex')
  var cabal0 = Cabal(ram, 'cabal://' + addr)
  var key0 = null
  cabal0.ready(function () {
    cabal0.getLocalKey(function (err, key) {
      key0 = key
      t.error(err)
      var cabal1 = Cabal(ram, 'cabal://' + addr, { modKey: key })
      var cabal2 = Cabal(ram, 'cabal://' + addr, { modKey: key })
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
        content: { key: key1, reason: 'spammer' }
      })
      sync([cabal0,cabal1,cabal2], function (err) {
        t.error(err)
        collect(cabal2.moderation.listBans('@'), function (err, bans) {
          t.error(err)
          t.deepEqual(bans, [{ type: 'key', id: key1, key: key0+'@0' }])
          cabal2.moderation.banInfo(bans[0].key, function (err, info) {
            t.error(err)
            t.deepEqual(info.content, {
              key: key1,
              reason: 'spammer'
            })
            t.ok(info.timestamp)
          })
        })
        cabal2.moderation.isBanned({ key: key1, seq: 0 }, function (err, banned) {
          t.error(err)
          t.ok(banned)
        })
      })
    })
  }
})


function sync (cabals, cb) {
  cb = cb || function(){}
  var pending = 0
  for (var i = 0; i < cabals.length; i++) {
    var a = cabals[i]
    var b = cabals[(i+1)%cabals.length]
    ++pending
    var ra = a.replicate(true, { live: false })
    var rb = b.replicate(false, { live: false })
    pump(ra, rb, ra, function (err) {
      if (err) {
        pending = Infinity
        cb(err)
      } else if (!--pending) {
        cb()
      }
    })
  }
  if (!pending) process.nextTick(cb)

  // XXX: hack, because one of the syncs is hanging (bug!)
  pending = Infinity
  setTimeout(cb, 1000)
}
