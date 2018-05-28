var collect = require('collect-stream')
var Cabal = require('..')
var test = require('tape')
var ram = require('random-access-memory')

test('create a cabal + channel', function (t) {
  var cabal = Cabal(ram, null, {username: 'bob'})
  console.log('0')
  cabal.db.ready(function () {
  console.log('1 ready')
    var msg = {
      type: 'text/chat',
      content: {
        text: 'hello',
        channel: 'general'
      }
    }
    cabal.publish(msg, function (err) {
    console.log('2')
      cabal.getChannels(function (err, channels) {
    console.log('3')
        t.same(channels.length, 1)
        t.same(channels[0], 'general', 'channel is general')
        t.end()
      })
      //var reader = cabal.createReadStream('general')
      //collect(reader, function (err, data) {
      //  t.error(err)
      //  t.same(data.length, 1)
      //  t.same(data[0].value, msg, 'same message')
      //  t.end()
      //})
    })
  })
})
