// Tests for private messages.

const Cabal = require('..')
const test = require('tape')
const ram = require('random-access-memory')
const crypto = require('hypercore-crypto')
const pump = require('pump')
const {unbox} = require('../lib/crypto')

test('write a private message & check it\'s not plaintext', function (t) {
  t.plan(5)

  const keypair = crypto.keyPair()

  const msg = {
    type: 'chat/text',
    content: {
      text: 'hello',
      channel: 'general'
    }
  }

  const cabal = Cabal(ram)
  cabal.ready(function () {
    cabal.publishPrivate(msg, keypair.publicKey, function (err, cipherMsg) {
      t.error(err)
      t.same(cipherMsg.type, 'encrypted', 'type is "encrypted"')
      t.ok(typeof cipherMsg.content, 'content is a string')
      t.notSame(cipherMsg.content.toString(), 'greetings')

      const anotherKeypair = crypto.keyPair()
      const failtext = unbox(Buffer.from(cipherMsg.content, 'base64'), anotherKeypair.secretKey)
      t.same(typeof failtext, 'undefined', 'could not decrypt')
    })
  })
})

test('write a private message & manually decrypt', function (t) {
  t.plan(11)

  const keypair = crypto.keyPair()

  const msg = {
    type: 'chat/text',
    content: {
      text: 'hello',
      channel: 'general',
      recipients: [keypair.publicKey.toString('hex')]
    },
  }

  const cabal = Cabal(ram)
  cabal.ready(function () {
    cabal.publishPrivate(msg, keypair.publicKey, function (err, cipherMsg) {
      t.error(err)
      t.same(cipherMsg.type, 'encrypted', 'type is "encrypted"')

      // decrypt with recipient key
      const plaintext = unbox(Buffer.from(cipherMsg.content, 'base64'), keypair.secretKey).toString()
      try {
        const message = JSON.parse(plaintext)
        t.same(message.type, 'chat/text', 'type is ok')
        t.same(typeof message.content, 'object', 'content is set')
        t.same(message.content.text, 'hello', 'text is ok')
        t.same(message.content.recipients, [keypair.publicKey.toString('hex')], 'recipients field ok')
      } catch (err) {
        t.error(err)
      }

      // decrypt with sender key
      cabal.feed(function (feed) {
        const res = unbox(Buffer.from(cipherMsg.content, 'base64'), feed.secretKey)
        t.ok(res, 'decrypted ok')
        const plaintext = res.toString()
        try {
          const message = JSON.parse(plaintext)
          t.same(message.type, 'chat/text', 'type is ok')
          t.same(typeof message.content, 'object', 'content is set')
          t.same(message.content.text, 'hello', 'text is ok')
          t.same(message.content.recipients, [keypair.publicKey.toString('hex')], 'recipients field ok')
        } catch (err) {
          t.error(err)
        }
      })
    })
  })
})

test('write a private message and read it on the other device', function (t) {
  t.plan(13)

  var sharedKey

  function create (id, cb) {
    var cabal = Cabal(ram, sharedKey ? sharedKey : null)
    cabal.ready(function () {
      if (!sharedKey) sharedKey = cabal.key
      cabal.getLocalKey(function (err, key) {
        if (err) return cb(err)
        cabal._key = key
        cb(null, cabal)
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
      create(3, function (err, c3) {
        t.error(err)

        const msg = {
          type: 'chat/text',
          content: {
            text: 'beeps & boops',
            channel: 'general',
            recipients: [c2._key.toString('hex')]
          },
        }

        c1.publishPrivate(msg, c2._key, (err) => {
          t.error(err)

          c1.ready(() => {
            c1.privateMessages.read(c2._key).once('data', msg => {
              t.equals(msg.key, c1._key)
              t.equals(msg.value.content.text, 'beeps & boops')

              sync(c1, c2, function (err) {
                t.error(err, 'sync ok')

                c2.privateMessages.read(c1._key).once('data', msg => {
                  t.equals(msg.key, c1._key)
                  t.equals(msg.value.content.text, 'beeps & boops')

                  c2.privateMessages.list((err, keys) => {
                    t.error(err)
                    t.deepEquals(keys, [c1._key])

                    sync(c1, c3, function (err) {
                      t.error(err, 'sync ok')

                      c3.privateMessages.read(c1._key)
                        .once('data', msg => {
                          t.fail('should not be able to decrypt this')
                        })
                        .once('end', () => {
                          t.pass('no decryptable messages ok')
                          checkIfDone()
                        })
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })
})

function sync (a, b, cb) {
  var r = a.replicate(true, {live:false})
  pump(r, b.replicate(false, {live:false}), r, cb)
}
