var Cabal = require('..')
var test = require('tape')
var ram = require('random-access-memory')
var randomBytes = require('crypto').randomBytes
var collect = require('collect-stream')
var pump = require('pump')

test('block a user by key', function (t) {
  t.plan(7)

  var addr = randomBytes(32).toString('hex')
  var cabal0 = Cabal(ram, addr)
  cabal0.ready(function () {
    cabal0.getLocalKey(function (err, key) {
      t.error(err)
      var cabal1 = Cabal(ram, addr + "?mod=" + key)
      var cabal2 = Cabal(ram, addr + "?mod=" + key)
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
      cabal0.moderation.addFlags({ id: key1, flags: ['block'] })
      sync([cabal0,cabal1,cabal2], function (err) {
        t.error(err)
        collect(cabal2.moderation.listBlocks('@'), function (err, blocks) {
          t.error(err)
          t.deepEqual(blocks.map(onlyKeys(['id'])), [ { id: key1 } ])
        })
        cabal2.moderation.getFlags({ id: key1 }, function (err, flags) {
          t.error(err)
          t.deepEqual(flags, ['block'])
        })
      })
    })
  }
})

test('blocking a user /wo a modkey is local-only', function (t) {
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
      cabal0.moderation.addFlags({ id: key1, flags: ['block'] })
      sync([cabal0,cabal1,cabal2], function (err) {
        t.error(err)
        cabal0.moderation.getFlags({ id: key1 }, function (err, flags) {
          t.error(err)
          t.deepEqual(flags, ['block'])
        })
        cabal1.moderation.getFlags({ id: key1 }, function (err, flags) {
          t.error(err)
          t.deepEqual(flags, ['admin'])
        })
        cabal2.moderation.getFlags({ id: key1 }, function (err, flags) {
          t.error(err)
          t.deepEqual(flags, [])
        })
      })
    })
  }
})

test('delegated moderator ban a user by key', function (t) {
  t.plan(15)

  var addr = randomBytes(32).toString('hex')
  var cabal0 = Cabal(ram, addr)
  cabal0.ready(function () {
    cabal0.getLocalKey(function (err, key) {
      t.error(err)
      var cabal1 = Cabal(ram, addr + "?mod=" + key)
      var cabal2 = Cabal(ram, addr + "?mod=" + key)
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
    getKeys([cabal0,cabal1,cabal2], function (err, keys) {
      t.error(err)
      cabal0.moderation.setFlags({ id: keys[2], flags: ['mod'] })
      cabal2.moderation.setFlags({ id: keys[1], flags: ['block'] })
      sync([cabal0,cabal1,cabal2], function (err) {
        t.error(err)
        collect(cabal0.moderation.listBlocks('@'), function (err, bans) {
          t.error(err)
          t.deepEqual(bans, [
            { id: keys[1], flags: ['block'], key: keys[2] + '@0' }
          ])
        })
        collect(cabal1.moderation.listBlocks('@'), function (err, bans) {
          t.error(err)
          t.deepEqual(bans, [], 'cannot block self')
        })
        collect(cabal2.moderation.listBlocks('@'), function (err, bans) {
          t.error(err)
          t.deepEqual(bans, [
            { id: keys[1], flags: ['block'], key: keys[2]+'@0' }
          ])
        })
        cabal0.moderation.getFlags({ id: keys[1] }, function (err, flags) {
          t.error(err)
          t.deepEqual(flags, ['block'])
        })
        cabal1.moderation.getFlags({ id: keys[1] }, function (err, flags) {
          t.error(err)
          t.deepEqual(flags, ['admin'], 'cannot ban self')
        })
        cabal2.moderation.getFlags({ id: keys[1] }, function (err, flags) {
          t.error(err)
          t.deepEqual(flags, ['block'])
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
      var cabal1 = Cabal(ram, addr + "?mod=" + key)
      var cabal2 = Cabal(ram, addr)
      var cabal3 = Cabal(ram, addr + "?mod=" + key)
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
      cabal0.moderation.addFlags({ id: key1, flags: ['block'] })
      sync([cabal0,cabal1,cabal2,cabal3], function (err) {
        t.error(err)
        cabal0.moderation.getFlags({ id: key1 }, function (err, flags) {
          t.error(err)
          t.deepEqual(flags, ['block'])
        })
        cabal1.moderation.getFlags({ id: key1 }, function (err, flags) {
          t.error(err)
          t.deepEqual(flags, ['admin'])
        })
        cabal2.moderation.getFlags({ id: key1 }, function (err, flags) {
          t.error(err)
          t.deepEqual(flags, [])
        })
        cabal3.moderation.getFlags({ id: key1 }, function (err, flags) {
          t.error(err)
          t.deepEqual(flags, ['block'])
        })
      })
    })
  }
})

test('can publish ban message', function (t) {
  t.plan(1)
  var cabalKey = randomBytes(32).toString('hex')
  var fakeKey = randomBytes(32).toString('hex')
  var cabal = Cabal(ram, 'cabal://' + cabalKey)
  cabal.ready(() => {
    cabal.moderation.addFlags({ id: fakeKey, flags: ['block'] }, err => {
      t.error(err)
    })
  })
})

test("possible to ban self. affects subscribers not self", function (t) {
  // This way you can prevent others from subscribing to your mod key.
  // Or you can remove yourself from moderation duties without needing to change
  // a key that many people are using.
  // You can also migrate keys using this self-blocking mechanism.
  t.plan(6)

  var cabalKey = randomBytes(32).toString('hex')
  var cabal0 = Cabal(ram, 'cabal://' + cabalKey)
  var cabal1 = Cabal(ram, 'cabal://' + cabalKey)
  getKeys([cabal0,cabal1], function (err, keys) {
    t.error(err)
    cabal1.moderation.setFlags({ id: keys[0], flags: ['admin'] })
    cabal0.moderation.setFlags({ id: keys[0], flags: ['block'] })
    sync([cabal0,cabal1], function (err) {
      t.error(err)
      cabal0.moderation.getFlags({ id: keys[0] }, function (err, flags) {
        t.error(err)
        t.deepEqual(flags, ['admin']) // blocking self has no local effect
      })
      cabal1.ready(function () {
        cabal1.moderation.getFlags({ id: keys[0] }, function (err, flags) {
          t.error(err)
          t.deepEqual(flags, ['block'])
        })
      })
    })
  })
})

test('blocks across channels', function (t) {
  t.plan(57)
  var addr = randomBytes(32).toString('hex')
  var cabal0 = Cabal(ram, addr)
  cabal0.ready(function () {
    cabal0.getLocalKey(function (err, key) {
      t.error(err)
      var cabal1 = Cabal(ram, addr+'?mod='+key)
      var cabal2 = Cabal(ram, addr+'?mod='+key)
      var cabal3 = Cabal(ram, addr+'?mod='+key)
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
    getKeys([cabal0,cabal1,cabal2,cabal3], function (err, keys) {
      t.error(err)
      cabal0.moderation.addFlags({ id: keys[1], flags: ['block'], channel: 'A' })
      cabal0.moderation.addFlags({ id: keys[2], flags: ['block'], channel: 'B' })
      cabal0.moderation.addFlags({ id: keys[3], flags: ['block'], channel: 'C' })
      sync([cabal0,cabal1,cabal2,cabal3], function (err) {
        t.error(err)
        var blocked = [{},{},{},{}]
        var list = []
        var pending = 1
        ;[cabal0,cabal1,cabal2,cabal3].forEach(function (cabal, i) {
          ;['A','B','C'].forEach(function (channel) {
            if (!blocked[i][channel]) blocked[i][channel] = []
            keys.forEach(function (id, ik) {
              pending++
              cabal.moderation.getFlags({ id, channel }, function (err, flags) {
                t.error(err)
                blocked[i][channel][ik] = Number(flags.includes('block'))
                if (--pending === 0) check()
              })
            })
          })
          pending++
          cabal.moderation.list(function (err, x) {
            t.error(err)
            list[i] = x
            if (--pending === 0) check()
          })
        })
        if (--pending === 0) check()

        function check () {
          t.deepEqual(blocked, [
            { A: [0,1,0,0], B: [0,0,1,0], C: [0,0,0,1] },
            { A: [0,0,0,0], B: [0,0,1,0], C: [0,0,0,1] },
            { A: [0,1,0,0], B: [0,0,0,0], C: [0,0,0,1] },
            { A: [0,1,0,0], B: [0,0,1,0], C: [0,0,0,0] },
          ], 'expected block grid')
          t.deepEqual(list.map(x => x.sort(byKey)), [
            [
              { id: keys[0], flags: ['admin'], channel: '@' },
              { key: keys[0]+'@0', id: keys[1], flags: ['block'], channel: 'A' },
              { key: keys[0]+'@1', id: keys[2], flags: ['block'], channel: 'B' },
              { key: keys[0]+'@2', id: keys[3], flags: ['block'], channel: 'C' },
            ].sort(byKey),
            [
              { id: keys[1], flags: ['admin'], channel: '@' },
              { id: keys[0], flags: ['admin'], channel: '@' },
              { key: keys[0]+'@1', id: keys[2], flags: ['block'], channel: 'B' },
              { key: keys[0]+'@2', id: keys[3], flags: ['block'], channel: 'C' },
            ].sort(byKey),
            [
              { id: keys[2], flags: ['admin'], channel: '@' },
              { id: keys[0], flags: ['admin'], channel: '@' },
              { key: keys[0]+'@0', id: keys[1], flags: ['block'], channel: 'A' },
              { key: keys[0]+'@2', id: keys[3], flags: ['block'], channel: 'C' },
            ].sort(byKey),
            [
              { id: keys[3], flags: ['admin'], channel: '@' },
              { id: keys[0], flags: ['admin'], channel: '@' },
              { key: keys[0]+'@0', id: keys[1], flags: ['block'], channel: 'A' },
              { key: keys[0]+'@1', id: keys[2], flags: ['block'], channel: 'B' },
            ].sort(byKey),
          ], 'expected block list grid')
        }
      })
    })
  }
})

test('block and then unblock', function (t) {
  t.plan(28)
  var addr = randomBytes(32).toString('hex')
  var cabals = [Cabal(ram, addr)]
  cabals[0].ready(function () {
    cabals[0].getLocalKey(function (err, key) {
      t.error(err)
      cabals.push(Cabal(ram, addr + "?mod=" + key))
      cabals.push(Cabal(ram, addr + "?mod=" + key))
      getKeys(cabals, function (err, keys) {
        ready(cabals, keys)
      })
    })
  })
  function ready (cabals, keys) {
    getKeys(cabals, function (err, keys) {
      t.error(err)
      cabals[0].moderation.addFlags({ id: keys[1], flags: ['block'] })
      sync(cabals, function (err) {
        t.error(err)
        var pending = 7
        collect(cabals[0].moderation.listBlocks('@'), function (err, blocks) {
          t.error(err)
          t.deepEqual(blocks.map(onlyKeys(['id'])), [ { id: keys[1] } ])
          if (--pending === 0) unblock(cabals, keys)
        })
        cabals[0].moderation.getFlags({ id: keys[1] }, function (err, flags) {
          t.error(err)
          t.deepEqual(flags, ['block'])
          if (--pending === 0) unblock(cabals, keys)
        })
        collect(cabals[1].moderation.listBlocks('@'), function (err, blocks) {
          // not blocked from own perspective
          t.error(err)
          t.deepEqual(blocks.map(onlyKeys(['id'])), [])
          if (--pending === 0) unblock(cabals, keys)
        })
        cabals[1].moderation.getFlags({ id: keys[1] }, function (err, flags) {
          // admin from own perspective
          t.error(err)
          t.deepEqual(flags, ['admin'])
          if (--pending === 0) unblock(cabals, keys)
        })
        collect(cabals[2].moderation.listBlocks('@'), function (err, blocks) {
          t.error(err)
          t.deepEqual(blocks.map(onlyKeys(['id'])), [ { id: keys[1] } ])
          if (--pending === 0) unblock(cabals, keys)
        })
        cabals[2].moderation.getFlags({ id: keys[1] }, function (err, flags) {
          t.error(err)
          t.deepEqual(flags, ['block'])
          if (--pending === 0) unblock(cabals, keys)
        })
        if (--pending === 0) unblock(cabals, keys)
      })
    })
    function unblock (cabals, keys) {
      cabals[0].moderation.removeFlags({ id: keys[1], flags: ['block'] })
      nSync(cabals, 2, function (err) {
        t.error(err)
        collect(cabals[0].moderation.listBlocks('@'), function (err, blocks) {
          t.error(err)
          t.deepEqual(blocks.map(onlyKeys(['id'])), [])
        })
        cabals[0].moderation.getFlags({ id: keys[1] }, function (err, flags) {
          t.error(err)
          t.deepEqual(flags, [])
        })
        collect(cabals[1].moderation.listBlocks('@'), function (err, blocks) {
          t.error(err)
          t.deepEqual(blocks.map(onlyKeys(['id'])), [])
        })
        cabals[1].moderation.getFlags({ id: keys[1] }, function (err, flags) {
          t.error(err)
          t.deepEqual(flags, ['admin'])
        })
        collect(cabals[2].moderation.listBlocks('@'), function (err, blocks) {
          t.error(err)
          t.deepEqual(blocks.map(onlyKeys(['id'])), [])
        })
        cabals[2].moderation.getFlags({ id: keys[1] }, function (err, flags) {
          t.error(err)
          t.deepEqual(flags, [])
        })
      })
    }
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

function nSync (cabals, n, cb) {
  sync(cabals, function (err) {
    if (err) cb(err)
    else if (n === 1) cb()
    else nSync(cabals, n-1, cb)
  })
}

function onlyKeys (keys) {
  return function (obj) {
    var res = {}
    keys.forEach(function (key) {
      res[key] = obj[key]
    })
    return res
  }
}

function getKeys (cabals, cb) {
  var keys = [], pending = 1
  cabals.forEach(function (cabal, i) {
    pending++
    cabal.getLocalKey(function (err, key) {
      if (err) return cb(err)
      keys[i] = key
      if (--pending === 0) cb(null, keys)
    })
  })
  if (--pending === 0) cb(null, keys)
}

function byKey (a, b) {
  if (!a.key && !b.key) return a.id < b.id ? -1 : +1
  if (!a.key && b.key) return -1
  if (a.key && !b.key) return +1
  return a.key < b.key ? -1 : +1
}
