var collect = require('collect-stream')
var Cabal = require('..')
var test = require('tape')
var ram = require('random-access-memory')
var resolve = require('../resolve')

test('create a cabal + channel', function (t) {
  var cabal = Cabal(ram)
  cabal.on('ready', function() {
    var msg = {
      type: 'chat/text',
      content: {
        text: 'hello',
        channel: 'general'
      }
    }
    cabal.publish(msg, function (err) {
      cabal.channels.get(function (err, channels) {
        t.same(channels.length, 1)
        t.same(channels[0], 'general', 'channel is general')
      })

      var reader = cabal.messages.read('general')
      collect(reader, function (err, data) {
        t.error(err)
        t.same(data.length, 1)
        t.same(data[0].value, msg, 'same message')
        t.end()
      })
    })
  })
})

test('reading back multiple messages', function (t) {
  t.plan(9)

  var cabal = Cabal(ram)

  var pending = 3

  cabal.on('ready', function() {
    cabal.publish({
      type: 'chat/text',
      content: {
        text: 'one',
        channel: 'general'
      }
    }, done)
    cabal.publish({
      type: 'chat/text',
      content: {
        text: 'two',
        channel: 'general'
      }
    }, done)
    cabal.publish({
      type: 'chat/text',
      content: {
        text: 'three',
        channel: 'misc'
      }
    }, done)

    var msgs = []

    function done (_, msg) {
      msgs.push(msg)
      if (--pending) return

      cabal.channels.get(function (err, channels) {
        t.same(channels.length, 2)
        t.same(channels.sort(), ['general', 'misc'])
      })

      var r1 = cabal.messages.read('general', { limit: 1 })
      collect(r1, function (err, data) {
        t.error(err)
        t.same(data.length, 1, 'only 1 message')
        t.same(data[0].value, msgs[1], 'msg is "two"')
      })

      var r2 = cabal.messages.read('general')
      collect(r2, function (err, data) {
        t.error(err)
        t.same(data.length, 2, 'two messages in general')
        t.same(data[0].value, msgs[1])
        t.same(data[1].value, msgs[0])
      })
    }
  })
})

test('listening for live messages', function (t) {
  var cabal = Cabal(ram)

  var count = 0
  cabal.messages.events.on('general', function (msg) {
    if (count === 0) t.equals(msg.value.content.text, 'one')
    if (count === 1) t.equals(msg.value.content.text, 'two')
    if (count === 2) t.equals(msg.value.content.text, 'three')
    if (++count === 3) t.end()
  })
  cabal.messages.events.on('misc', function (msg) {
    if (count === 0) t.equals(msg.value.content.text, 'one')
    if (count === 1) t.equals(msg.value.content.text, 'two')
    if (count === 2) t.equals(msg.value.content.text, 'three')
    if (++count === 3) t.end()
  })

  cabal.on('ready', function() {
    cabal.publish({
      type: 'chat/text',
      content: {
        text: 'one',
        channel: 'general'
      }
    })
    cabal.publish({
      type: 'chat/text',
      content: {
        text: 'two',
        channel: 'general'
      }
    })
    cabal.publish({
      type: 'chat/text',
      content: {
        text: 'three',
        channel: 'misc'
      }
    })
  })
})

test('setting an href option', function(t) {
  var href = 'test.com'
  var cabal = Cabal(ram, href, { resolve: function() { 'fakekey' } })

  t.equals(cabal.href, href)
  t.end()
})

test('resolve a key from cabal url', function(t) {
  resolve('cabal://4ae5ec168a9f6b45b9d35e3cc1d0f4e3a436000d37fae8f53b3f8dadfe8f192f', (err, key) => {
    t.equal(key, '4ae5ec168a9f6b45b9d35e3cc1d0f4e3a436000d37fae8f53b3f8dadfe8f192f')

    t.end()
  })
})

test('resolve raises an error on an empty url', function(t) {
  resolve('', (err, key) => {
    t.equal(err, 'Invalid href')

    t.end()
  })
})

const PUBLIC_CABAL_KEY = '4ae5ec168a9f6b45b9d35e3cc1d0f4e3a436000d37fae8f53b3f8dadfe8f192f'

test('resolve a key from a hostname', function(t) {
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

test('when resolving a real key from actual DNS', function(t) {
  resolve('markbennett.ca', (_, key) => {
    t.equal(key, PUBLIC_CABAL_KEY)

    t.end()
  })
})

test('when resolving a missing key from actual DNS', function(t) {
  resolve('google.com', (err, _) => {
    t.isEqual(err.indexOf('Unable to parse key from DNS answers'), 0)

    t.end()
  })
})
