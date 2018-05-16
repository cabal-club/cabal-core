var collect = require('collect-stream')
var Cabal = require('.')
var test = require('tape')
var ram = require('random-access-memory')

test('create a cabal and read a channel', function (t) {
  var cabal = Cabal(ram, null, {username: 'bob'})
  cabal.db.ready(function () {
    t.same(cabal.username, 'bob', 'got username')
    var date = new Date
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
          t.same(message, msg.message, 'same message')
          t.end()
        })
      })
    })
  })
})
