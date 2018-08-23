var collect = require('collect-stream')
var Cabal = require('.')
var test = require('tape')
var ram = require('random-access-memory')
var resolve = require('./resolve')

test('create a cabal and read a channel', function (t) {
  var cabal = Cabal(ram, null, {username: 'bob'})
  cabal.db.ready(function () {
    t.same(cabal.username, 'bob', 'got username')
    var date = new Date()
    var message = 'hi'
    var channel = '#general'
    cabal.metadata(channel, function (err, metadata) {
      t.error(err)
      t.same(metadata.latest, 0)
      cabal.message(channel, message, {date}, function (err) {
        t.error(err)
        var reader = cabal.createReadStream(channel)
        collect(reader, function (err, data) {
          t.error(err)
          t.same(data.length, 1)
          var msg = data[0].value
          t.same(message, msg.content, 'same message')
          t.end()
        })
      })
    })
  })
})

test('resolve a key from cabal url', function(t) {
  resolve('cabal://4ae5ec168a9f6b45b9d35e3cc1d0f4e3a436000d37fae8f53b3f8dadfe8f192f', (err, key) => {
    t.equal(key, '4ae5ec168a9f6b45b9d35e3cc1d0f4e3a436000d37fae8f53b3f8dadfe8f192f')

    t.end()
  })
})

// test('resolve raises an error on an empty url', function(t) {
//   resolve('', (err, key) => {
//     t.equal(err, 'Invalid key')

//     t.end()
//   })
// })

test('resolve a key from a hostname', function(t) {
  const PUBLIC_CABAL_KEY = '4ae5ec168a9f6b45b9d35e3cc1d0f4e3a436000d37fae8f53b3f8dadfe8f192f'
  const opts = {
    dnsResolver: (hostname, cb) => cb(null, PUBLIC_CABAL_KEY)
  }
  resolve('test.com', opts, (_, key) => {
    t.equal(key, PUBLIC_CABAL_KEY)

    t.end()
  })
})

test('resolving a key from a hostname without a key returns an error', function(t) {
  const opts = {
    dnsResolver: (hostname, cb) => cb('No Key Found')
  }
  resolve('test.com', opts, (err, _) => {
    t.equal(err, 'No Key Found')

    t.end()
  })
})

test('when resolving a key from DNS raises an error', function(t) {
  const opts = {
    dnsResolver: (hostname, cb) => { throw 'No Network' }
  }
  resolve('test.com', opts, (err, _) => {
    t.isNotEqual(err, null)

    t.end()
  })

})
