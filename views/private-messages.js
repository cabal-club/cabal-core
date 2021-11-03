const { unbox } = require('../lib/crypto')
const EventEmitter = require('events').EventEmitter
const timestamp = require('monotonic-timestamp')
const charwise = require('charwise')
const through = require('through2')
const readonly = require('read-only-stream')
const xtend = require('xtend')
const collect = require('collect-stream')

/**
 * Create a new materialized view for private messages.
 *
 * @param {{public,private}} keypair - The keypair of the local user.
 * @param {LevelUP} lvl - a LevelUP instance.
**/
module.exports = function (keypair, lvl) {
  const events = new EventEmitter()

  function getPublicKeyOfOtherParty (msg) {
    const senderHexKey = msg.key
    const recipientHexKey = msg.value.content.recipients[0]
    if (senderHexKey === keypair.public.toString('hex')) {
      return recipientHexKey
    } else {
      return senderHexKey
    }
  }

  return {
    maxBatch: 100,

    map: function (msgs, next) {
      const toEmit = []
      const ops = []
      msgs.forEach(function (msg) {
        // Only process encrypted messages
        if (msg.value.type !== 'encrypted') return

        // Attempt to decrypt
        const res = decrypt(msg, keypair.private)
        if (!res) return

        if (!res.value.type.startsWith('chat/')) return
        if (typeof res.value.timestamp !== 'number') return null
        if (!Array.isArray(res.value.content.recipients)) return null
        if (res.value.content.recipients.length <= 0) return null
        if (typeof res.value.content.text !== 'string') return null

        // If the message is from <<THE FUTURE>>, index it at _now_.
        let ts = res.value.timestamp
        if (isFutureMonotonicTimestamp(ts)) ts = timestamp()

        // Determine if we're the sender or receiver. We want to always index
        // it on the OTHER person's key.
        const indexKey = getPublicKeyOfOtherParty(res)

        // Index the message, as msg!otherPartysPublicKey!timestamp mapping to msgId
        const key = `msg!${indexKey}!${charwise.encode(ts)}`
        ops.push({
          type: 'put',
          key,
          value: res
        })
        ops.push({
          type: 'put',
          key: 'exists!' + indexKey,
          value: 1
        })
        toEmit.push(res)
      })

      if (ops.length) lvl.batch(ops, onIndexed)
      else next()

      function onIndexed () {
        toEmit.forEach(msg => {
          const channel = getPublicKeyOfOtherParty(msg)
          events.emit('message', channel, msg)
          events.emit(`${channel}`, msg)
        })
        next()
      }
    },

    api: {
      /**
       * List the public keys of all of the users who we have had exchanged private messages with.
       */
      list: function (core, cb) {
        const opts = {
          gt: 'exists!!',
          lt: 'exists!~'
        }

        this.ready(function () {
          collect(lvl.createKeyStream(opts), { encoding: 'object' }, (err, keys) => {
            if (err) return cb(err)
            const res = keys.map(k => k.split('!')[1])
            cb(null, res)
          })
        })
      },

      /**
       * Creates a read stream of decrypted private messages
       * @param {Object} core - HyperCore to stream messages from.
       * @param {String} key - Public key (hex) of the other party.
       * @param {Object} opts :
       *      `gt` {Number} - Filter by timestamp where message.timestamp is greater than `gt`
       *      `lt` {Number} - Filter by timestamp where message.timestamp is lesser than `lt`
       *       Supports all levelup.createValueStream() options as well:
       *      `reverse` {Boolean} - Streams messages in Ascending time order, default: `true` (Descending)
       */
      read: function (core, key, opts) {
        opts = opts || {}
        if (Buffer.isBuffer(key)) key = key.toString('hex')

        const t = through.obj()

        if (opts.gt) opts.gt = 'msg!' + key + '!' + charwise.encode(opts.gt) + '!'
        else opts.gt = 'msg!' + key + '!'
        if (opts.lt) opts.lt = 'msg!' + key + '!' + charwise.encode(opts.lt) + '~'
        else opts.lt = 'msg!' + key + '~'

        this.ready(function () {
          const v = lvl.createValueStream(xtend({ reverse: true }, opts))
          v.pipe(t)
        })

        return readonly(t)
      },

      events: events
    },

    storeState: function (state, cb) {
      state = state.toString('base64')
      lvl.put('state', state, cb)
    },

    fetchState: function (cb) {
      lvl.get('state', function (err, state) {
        if (err && err.notFound) cb()
        else if (err) cb(err)
        else cb(null, Buffer.from(state, 'base64'))
      })
    }
  }
}
// Trims the monotonic timestamp's suffix, returning a timestamp that is valid to use as `new Date(timestamp)`
function monotonicTimestampToTimestamp (timestamp) {
  if (/^[0-9]+\.[0-9]+$/.test(String(timestamp))) {
    return Number(String(timestamp).split('.')[0])
  } else {
    return timestamp
  }
}

function isFutureMonotonicTimestamp (ts) {
  const timestamp = monotonicTimestampToTimestamp(ts)
  const now = new Date().getTime()
  return timestamp > now
}

// Attempt to decrypt a message of type 'encrypted'.
function decrypt (msg, key) {
  if (msg.value.type !== 'encrypted') return
  try {
    const jsonBuffer = unbox(Buffer.from(msg.value.content, 'base64'), key)
    if (!jsonBuffer) return // undecryptable
    return {
      key: msg.key,
      seq: msg.seq,
      value: JSON.parse(jsonBuffer.toString())
    }
  } catch (e) {
    // skip unparseable messages
    return
  }
}
