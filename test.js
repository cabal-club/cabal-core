var collect = require('collect-stream')
var Cabal = require('.')
var test = require('tape')
var ram = require('random-access-memory')
var Resolver = require('./resolve')

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
          cabal.close()
        })
      })
    })
  })
})

function resolverTest(message, cb) {
  const test_func = function(t) {
    const resolver = new Resolver()

    try {
      cb(t, resolver)
    } finally {
      resolver.close()
    }

  }

  test(message, test_func)
}

resolverTest('resolve a key from cabal url', function(t, resolver) {
  resolver.resolve('cabal://4ae5ec168a9f6b45b9d35e3cc1d0f4e3a436000d37fae8f53b3f8dadfe8f192f', (err, key) => {
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

const PUBLIC_CABAL_KEY = '4ae5ec168a9f6b45b9d35e3cc1d0f4e3a436000d37fae8f53b3f8dadfe8f192f'

resolverTest('resolve a key from a hostname', function(t, resolver) {
  const opts = {
    dnsResolver: (hostname, cb) => cb(null, PUBLIC_CABAL_KEY)
  }
  resolver.resolve('test.com', opts, (_, key) => {
    t.equal(key, PUBLIC_CABAL_KEY)

    t.end()
  })
})

resolverTest('resolving a key from a hostname without a key returns an error', function(t, resolver) {
  const opts = {
    dnsResolver: (hostname, cb) => cb('No Key Found')
  }
  resolver.resolve('test.com', opts, (err, _) => {
    t.equal(err, 'No Key Found')

    t.end()
  })
})

resolverTest('when resolving a key from DNS raises an error', function(t, resolver) {
  const opts = {
    dnsResolver: (hostname, cb) => { throw 'No Network' }
  }
  resolver.resolve('test.com', opts, (err, _) => {
    t.isNotEqual(err, null)

    t.end()
  })
})

resolverTest('when resolving a key from DNS that has been cached', function(t, resolver) {
  const opts = {
    cache: {
      get: () => 'CACHED_KEY'
    }
  }

  resolver.resolve('markbennett.ca', opts, (_, key) => {
    t.equal(key, 'CACHED_KEY')

    t.end()
  })
})

resolverTest('when resolving a real key from actual DNS', function(t, resolver) {
  resolver.resolve('markbennett.ca', (_, key) => {
    t.equal(key, PUBLIC_CABAL_KEY)

    t.end()
  })
})
