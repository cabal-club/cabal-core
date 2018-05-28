var kappa = require('kappa-core')
var events = require('events')
var encoding = require('dat-encoding')
var inherits = require('inherits')
var concat = require('concat-stream')
var through = require('through2')
var memdb = require('memdb')
var thunky = require('thunky')
var createChannelView = require('./views/channels')
var createMessagesView = require('./views/messages')

module.exports = Cabal

/**
 * Create a new cabal. This is the object handling all
 * local nickname -> mesh interactions for a single user.
 * @constructor
 * @param {string|function} storage - A hyperdb compatible storage function, or a string representing the local data path.
 * @param {string} key - The dat link
 * @param {Object} opts - 
 */
function Cabal (storage, key, opts) {
  if (!(this instanceof Cabal)) return new Cabal(storage, key, opts)
  if (!opts) opts = {}
  events.EventEmitter.call(this)

  var json = {
    encode: function (obj) {
      return Buffer.from(JSON.stringify(obj))
    },
    decode: function (buf) {
      var str = buf.toString('utf8')
      try { var obj = JSON.parse(str) } catch (err) { return {} }
      return obj
    }
  }

  try {
    var key = encoding.decode(key)
    this.key = encoding.encode(key)
  } catch (e) {
    this.key = null
  }
  this.db = kappa(storage, { valueEncoding: json })

  var self = this
  this.feed = thunky(function (cb) {
    self.db.feed(function (err, feed) {
      cb(feed)
    })
  })

  // views
  this.db.use('channels', createChannelView(memdb({valueEncoding: json})))
  this.db.use('messages', createMessagesView(memdb({valueEncoding: json})))

  // self.username = opts.username || 'conspirator'
  // self.users = {}
  // self.users[opts.username] = new Date()
}

inherits(Cabal, events.EventEmitter)

/**
 * Get a list of all channels in the cabal.
 * @param {Function} cb - Callback that receives an array of channel names.
 */
Cabal.prototype.getChannels = function (cb) {
  this.db.api.channels.get(cb)
}

/**
 * Join a channel.
 * @param {String} channel - The channel to join.
 */
Cabal.prototype.joinChannel = function (channel) {
  if (this.channels.indexOf(channel) === -1) this.channels.push(channel)
}

/**
 * Leave a channel.
 * @param {String} channel - The channel to leave.
 */
Cabal.prototype.leaveChannel = function (channel) {
  this.channels = this.channels.filter(function (c) {
    return c !== channel
  })
}

/**
 * Create a readable stream of messages from a particular channel.
 * @param {String} channel - The channel you want to read from.
 */
Cabal.prototype.readMessages = function (channel, opts) {
  if (!opts) opts = {}
  return this.db.api.messages.read(channel, opts)
}

/**
 * Publish a message to your feed.
 * @param {String} message - The message to publish.
 * @param {Object} opts - Options: date
 * @param {function} cb - When message has been successfully added.
 */
Cabal.prototype.publish = function (message, opts, cb) {
  if (!message) return cb()
  if (typeof opts === 'function') return this.publish(message, null, opts)
  if (!opts) opts = {}
  if (!cb) cb = noop

  var self = this
  var d = opts.date || new Date().getTime()
  message.timestamp = d

  this.feed(function (feed) {
    feed.append(message, function (err) {
      cb(err, err ? null : message)
    })
  })
}

/**
 * Replication stream for the mesh.
 */
Cabal.prototype.replicate = function () {
  var self = this
  return this.db.replicate({ live: true })
}

function noop () {}
