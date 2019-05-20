var collect = require('collect-stream')
var Cabal = require('..')
var test = require('tape')
var ram = require('random-access-memory')
var pump = require('pump')

test('create a cabal + channel', function (t) {
  var cabal = Cabal(ram)
  cabal.db.ready(function () {
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

  cabal.db.ready(function () {
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

  cabal.db.ready(function () {
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

test('local replication', function (t) {
  t.plan(15)

  function create (id, cb) {
    var cabal = Cabal(ram)
    cabal.db.ready(function () {
      var msg = {
        type: 'chat/text',
        content: {
          text: 'hello from ' + id,
          channel: 'general',
          timestamp: Number(id) * 1000
        }
      }
      cabal.getLocalKey(function (err, key) {
        if (err) return cb(err)
        cabal.key = key
        cabal.publish(msg, function (err) {
          if (err) cb(err)
          else cb(null, cabal)
        })
      })
    })
  }

  create(1, function (err, c1) {
    t.error(err)
    create(2, function (err, c2) {
      t.error(err)
      sync(c1, c2, function (err) {
        t.error(err, 'sync ok')

        function check (cabal) {
          var r = cabal.messages.read('general')
          collect(r, function (err, data) {
            t.error(err)
            t.same(data.length, 2, '2 messages')
            t.same(data[0].key, c2.key)
            t.same(data[0].seq, 0)
            t.same(data[1].key, c1.key)
            t.same(data[1].seq, 0)
          })
        }

        check(c1)
        check(c2)
      })
    })
  })
})

test.only('local replication', function (t) {
  t.plan(15)

  function create (id, cb) {
    var cabal = Cabal(ram)
    cabal.db.ready(function () {
      var msg = {
        type: 'chat/text',
        content: {
          text: 'hello from ' + id,
          channel: 'general',
          timestamp: Number(id) * 1000
        }
      }
      cabal.getLocalKey(function (err, key) {
        if (err) return cb(err)
        cabal.key = key
        cabal.publish(msg, function (err) {
          if (err) cb(err)
          else cb(null, cabal)
        })
      })
    })
  }

  create(1, function (err, c1) {
    t.error(err)
    create(2, function (err, c2) {
      t.error(err)
      syncNetwork(c1, c2, function (err) {
        t.error(err, 'sync ok')

        function check (cabal) {
          var r = cabal.messages.read('general')
          collect(r, function (err, data) {
            t.error(err)
            t.same(data.length, 2, '2 messages')
            t.same(data[0].key, c2.key)
            t.same(data[0].seq, 0)
            t.same(data[1].key, c1.key)
            t.same(data[1].seq, 0)
          })
        }

        check(c1)
        check(c2)
      })
    })
  })
})

function sync (a, b, cb) {
  var r = a.replicate({live:false})
  pump(r, b.replicate({live:false}), r, cb)
}

function syncNetwork (a, b, cb) {
  var pending = 2

  a.swarm(function (err, swarm1) {
    if (err) return cb(err)
    b.swarm(function (err, swarm2) {
      if (err) return cb(err)
      a.on('peer-added', function (key) {
        console.log('a-add', key)
        setTimeout(function () {
          if (!--pending) cb()
        }, 1000)
      })
      b.on('peer-added', function (key) {
        console.log('b-add', key)
        setTimeout(function () {
          if (!--pending) cb()
        }, 1000)
      })
    })
  })
}
