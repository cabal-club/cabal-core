var collect = require('collect-stream')
var Cabal = require('..')
var test = require('tape')
var ram = require('random-access-memory')

test('create a cabal + channel', function (t) {
  var cabal = Cabal(ram, null, {username: 'bob'})
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
