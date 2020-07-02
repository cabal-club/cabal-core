var collect = require('collect-stream')
var Cabal = require('..')
var test = require('tape')
var ram = require('random-access-memory')
var pump = require('pump')
var crypto = require('hypercore-crypto')

test('verified swarm connections', function (t) {
  t.plan(11)

  var key = crypto.keyPair().publicKey
  var allowed = {
    A: ['B'], // A has blocked C
    B: ['A'], // B has blocked C
    C: ['A','B'] // C will momentarily add A and B but the connections will drop
  }
  var connected = {}
  var expected = {
    'A:B': true,
    'A:C': false,
    'B:A': true,
    'B:C': false,
    'C:A': true, // momentarily added
    'C:B': true // momentarily added
  }
  var expectedCount = 4
  var connectionCount = 0

  var names = ['A','B','C']
  var swarms = {}
  create(['A','B','C'], function (err, cabals) {
    t.error(err)
    var pkCabals = {}
    var pending = 1
    Object.entries(cabals).forEach(function ([id,cabal]) {
      pending++
      cabal.getLocalKey(function (err, key) {
        t.error(err)
        pkCabals[key] = id
        if (--pending === 0) swarm()
      })
    })
    if (--pending === 0) swarm()

    function swarm () {
      Object.entries(cabals).forEach(function ([id,cabal]) {
        cabal.swarm({
          verify: function (pk, cb) {
            pk = pk.toString('hex')
            var allow = allowed[id] && allowed[id].includes(pkCabals[pk])
            var key = `${id}:${pkCabals[pk]}`
            if (!allow) connected[key] = false
            //console.log(`VERIFY ${id}:${pkCabals[pk]} ${allow} ${pk}`)
            cb(null, allow)
          }
        }, function (err, swarm) {
          t.error(err)
          swarms[id] = swarm
        })
        cabal.on('peer-added', function (pk) {
          pk = pk.toString('hex')
          var key = `${id}:${pkCabals[pk]}`
          //console.log('ADDED',key,pk)
          if (connected[key]) return
          connected[key] = true
          if (++connectionCount === expectedCount) check()
          else if (connectionCount > expectedCount) {
            t.fail('unexpectedly many connections')
          }
        })
      })
    }
    function check () {
      setTimeout(function () {
        collect(cabals.A.messages.read('general'), function (err, data) {
          t.deepEqual(format(data), [
            '<B> hello from B', '<A> hello from A'
          ], 'messages on A')
        })
        collect(cabals.B.messages.read('general'), function (err, data) {
          t.deepEqual(format(data), [
            '<B> hello from B', '<A> hello from A'
          ], 'messages on B')
        })
        collect(cabals.C.messages.read('general'), function (err, data) {
          t.deepEqual(format(data), [
            '<C> hello from C'
          ], 'messages on C')
        })
        t.deepEqual(connected, expected, 'expected connections')
        Object.values(swarms).forEach(function (swarm) {
          swarm.destroy()
        })
      }, 1000)
    }
    function format (rows) {
      return rows.map(function (row) {
        return `<${pkCabals[row.key]}> ${row.value.content.text}`
      })
    }
  })

  function create (ids, cb) {
    var cabals = {}
    ;(function next (i) {
      var id = ids[i]
      if (!id) return cb(null, cabals)
      var cabal = Cabal(ram, key)
      cabals[id] = cabal
      cabal.ready(function () {
        var msg = {
          type: 'chat/text',
          content: {
            text: 'hello from ' + id,
            channel: 'general'
          }
        }
        cabal.getLocalKey(function (err, key) {
          if (err) return cb(err)
          cabal._localkey = key
          cabal.publish(msg, function (err) {
            if (err) cb(err)
            else next(i+1)
          })
        })
      })
    })(0)
  }
})
