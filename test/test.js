var collect = require('collect-stream')
var Cabal = require('..')
var test = require('tape')
var ram = require('random-access-memory')

test('create a cabal + channel', function (t) {
  var cabal = Cabal(ram)
  cabal.db.ready(function () {
    var msg = {
      type: 'text/chat',
      content: {
        text: 'hello',
        channel: 'general'
      }
    }
    cabal.publish(msg, function (err) {
      cabal.getChannels(function (err, channels) {
        t.same(channels.length, 1)
        t.same(channels[0], 'general', 'channel is general')
      })

      var reader = cabal.readMessages('general')
      collect(reader, function (err, data) {
        t.error(err)
        t.same(data.length, 1)
        t.same(data[0], msg, 'same message')
        t.end()
      })
    })
  })
})

test('reading back multiple messages', function (t) {
  t.plan(9)

  var cabal = Cabal(ram)

  var pending = 3

  cabal.db.ready(function () {
    cabal.publish({
      type: 'text/chat',
      content: {
        text: 'one',
        channel: 'general'
      }
    }, done)
    cabal.publish({
      type: 'text/chat',
      content: {
        text: 'two',
        channel: 'general'
      }
    }, done)
    cabal.publish({
      type: 'text/chat',
      content: {
        text: 'three',
        channel: 'misc'
      }
    }, done)

    var msgs = []

    function done (_, msg) {
      msgs.push(msg)
      if (--pending) return

      cabal.getChannels(function (err, channels) {
        t.same(channels.length, 2)
        t.same(channels.sort(), ['general', 'misc'])
      })

      var r1 = cabal.readMessages('general', { limit: 1 })
      collect(r1, function (err, data) {
        t.error(err)
        t.same(data.length, 1, 'only 1 message')
        t.same(data[0], msgs[1], 'msg is "two"')
      })

      var r2 = cabal.readMessages('general')
      collect(r2, function (err, data) {
        t.error(err)
        t.same(data.length, 2, 'two messages in general')
        t.same(data[0], msgs[1])
        t.same(data[1], msgs[0])
      })
    }
  })
})
