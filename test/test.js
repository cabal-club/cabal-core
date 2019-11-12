var collect = require('collect-stream')
var Cabal = require('..')
var test = require('tape')
var ram = require('random-access-memory')
var pump = require('pump')
var crypto = require('hypercore-crypto')

test('create a cabal + channel', function (t) {
  var cabal = Cabal(ram)
  cabal.ready(function () {
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

  cabal.ready(function () {
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

  cabal.ready(function () {
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
  t.plan(17)

  var sharedKey

  function create (id, key, cb) {
    console.log('create', key)
    var cabal = Cabal(ram, key)
    cabal.ready(function () {
      var msg = {
        type: 'chat/text',
        content: {
          text: 'hello from ' + id,
          channel: 'general',
          timestamp: Number(id) * 1000
        }
      }
      cabal.getLocalKey(function (err, localKey) {
        t.error(err)
        cabal._key = localKey
        if (!sharedKey) sharedKey = cabal.key.toString('hex')
        cabal.publish(msg, function (err) {
          if (err) cb(err)
          else cb(null, cabal)
        })
      })
    })
  }

  create(1, null, function (err, c1) {
    t.error(err)
    create(2, sharedKey, function (err, c2) {
      t.error(err)
      sync(c1, c2, function (err) {
        t.error(err, 'sync ok')

        function check (cabal) {
          var r = cabal.messages.read('general')
          collect(r, function (err, data) {
            t.error(err)
            t.same(data.length, 2, '2 messages')
            t.same(data[0].key, c2._key)
            t.same(data[0].seq, 0)
            t.same(data[1].key, c1._key)
            t.same(data[1].seq, 0)
          })
        }

        check(c1)
        check(c2)
      })
    })
  })
})

test('swarm network replication', function (t) {
  t.plan(15)

  var key

  function create (id, cb) {
    var cabal = Cabal(ram, key)
    cabal.ready(function () {
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
        cabal._localkey = key
        cabal.publish(msg, function (err) {
          if (err) cb(err)
          else cb(null, cabal)
        })
      })
    })
  }

  var key = crypto.keyPair().publicKey

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
            t.same(data[0].key, c2._localkey)
            t.same(data[0].seq, 0)
            t.same(data[1].key, c1._localkey)
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
  var r = a.replicate(true, {live:false})
  pump(r, b.replicate(false, {live:false}), r, cb)
}

function syncNetwork (a, b, cb) {
  var pending = 2

  a.swarm({block:false}, function (err, swarm1) {
    if (err) return cb(err)
    b.swarm({block:false}, function (err, swarm2) {
      if (err) return cb(err)

      function end () {
        if (!--pending) {
          swarm1.destroy(function () {
            swarm2.destroy(cb)
          })
        }
      }

      a.once('peer-added', function (key) {
        console.log('a-add', key)
        setTimeout(end, 2000)
      })

      b.once('peer-added', function (key) {
        console.log('b-add', key)
        setTimeout(end, 2000)
      })
    })
  })
}

test('channel membership', function (t) {
  var cabal = Cabal(ram)

  cabal.ready(function () {
    cabal.getLocalKey((err, lkey) => {
      cabal.memberships.getMemberships(lkey, (err, channels) => {
        t.error(err)
        t.same(channels.length, 0, "haven't joined any channels yet")
        cabal.publish({
          type: 'channel/join',
          content: {
            channel: 'new-channel'
          }
        }, function published () {
          var count = 0
          function checkIfDone () {
            count++
            if (count === 3) {
              t.end()
            } 
          }
          cabal.memberships.getMemberships(lkey, (err, channels) => {
            t.error(err)
            t.same(channels.length, 1, "we've only joined 1 channel'")
            t.same(channels[0], "new-channel", "we've joined 'new-channel'")
            checkIfDone()
          })
          cabal.memberships.isMember(lkey, "new-channel", (err, bool) => {
            t.error(err)
            t.same(bool, true, "we're a member of 'new-channel'")
            checkIfDone()
          })
          cabal.memberships.getUsers("new-channel", (err, members) => {
            t.error(err)
            t.same(members.length, 1, "we're the only member in 'new-channel'")
            t.same(members[0], lkey)
            checkIfDone()
          })
        })
      })
    })
  })
})

test('join two channels then leave one', function (t) {
  var cabal = Cabal(ram)

  var p1 = new Promise((res, rej) => {
    cabal.publish({
      type: 'channel/join',
      content: {
        channel: 'channel-1'
      }
    }, function (err) {
      if (!err) return res()
      rej()
    })
  })

  var p2 = new Promise((res, rej) => {
    cabal.publish({
      type: 'channel/join',
      content: {
        channel: 'channel-2'
      }
    }, function (err) {
      if (!err) return res()
      rej()
    })
  })

  cabal.ready(function () {
    Promise.all([p1, p2]).then(() => {
      cabal.getLocalKey((err, lkey) => {
        cabal.memberships.getMemberships(lkey, (err, channels) => {
          t.error(err)
          t.same(channels.length, 2, "we've joined two channels")
          // leave the second channel
          cabal.publish({
            type: 'channel/leave',
            content: {
              channel: 'channel-1'
            }
          }, function (err) {
            cabal.memberships.getMemberships(lkey, (err, channels) => {
              t.error(err)
              t.same(channels.length, 1, "we successfully left one channel")
              t.same(channels[0], "channel-2", "we're only in 'channel-2'")
              t.end()
            })
          })
        })
      })
    })
  })
})


test('multiple channel participants', function (t) {
  var sharedKey

  function create (id, cb) {
    var cabal = Cabal(ram, sharedKey ? sharedKey : null)
    cabal.ready(function () {
      if (!sharedKey) sharedKey = cabal.key
      var msg = {
        type: 'channel/join',
        content: {
          channel: 'new-channel'
        }
      }
      cabal.getLocalKey(function (err, key) {
        if (err) return cb(err)
        cabal.publish(msg, function (err) {
          if (err) cb(err)
          else cb(null, cabal)
        })
      })
    })
  }

  var count = 0
  function checkIfDone () {
    count++
    if (count === 2) {
      t.end()
    } 
  }
  create(1, function (err, c1) {
    t.error(err)
    create(2, function (err, c2) {
      t.error(err)
      sync(c1, c2, function (err) {
        t.error(err, 'sync ok')

        c1.memberships.getUsers("new-channel", (err, members) => {
          t.error(err)
          t.same(members.length, 2, "new-channel has two members")
          checkIfDone()
        })

        c2.memberships.getUsers("new-channel", (err, members) => {
          t.error(err)
          t.same(members.length, 2, "new-channel has two members")
          checkIfDone()
        })
      })
    })
  })
})
