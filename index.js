var kappa = require('kappa-core')
var events = require('events')
var inherits = require('inherits')
var memdb = require('memdb')
var thunky = require('thunky')
var timestamp = require('monotonic-timestamp')
var createChannelView = require('./views/channels')
var createMessagesView = require('./views/messages')
var createTopicsView = require('./views/topics')
var createUsersView = require('./views/users')

var DATABASE_VERSION = 1

module.exports = Cabal
module.exports.databaseVersion = DATABASE_VERSION

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

  this.key = key || null
  this.db = kappa(storage, {
    maxFeeds: opts.maxFeeds,
    valueEncoding: json
  })

  // Create (if needed) and open local write feed
  var self = this
  this.feed = thunky(function (cb) {
    self.db.ready(function () {
      self.db.feed('local', function (err, feed) {
        if (!self.key) self.key = feed.key.toString('hex')
        cb(feed)
      })
    })
  })

  // views

  this.db.use('channels', createChannelView(memdb({ valueEncoding: json })))
  this.db.use('messages', createMessagesView(memdb({ valueEncoding: json })))
  this.db.use('topics', createTopicsView(memdb({ valueEncoding: json })))
  this.db.use('users', createUsersView(memdb({ valueEncoding: json })))

  this.messages = this.db.api.messages
  this.channels = this.db.api.channels
  this.topics = this.db.api.topics
  this.users = this.db.api.users
}

inherits(Cabal, events.EventEmitter)
Cabal.prototype.getDatabaseVersion = function (cb) {
  if (!cb) cb = noop
  process.nextTick(cb, DATABASE_VERSION)
}

/**
 * Get information about a user that they've volunteered about themselves.
 * @param {String} key - The hex key of the user.
 */
Cabal.prototype.getUser = function (key, cb) {
  if (typeof key === 'function') {
    cb = key
    key = null
  }

  var self = this

  this.feed(function (feed) {
    if (!key) key = feed.key.toString('hex')
    self.db.api.users.get(key, cb)
  })
}

/**
 * Publish a message to your feed.
 * @param {String} message - The message to publish.
 * @param {Object} opts - Options: date
 * @param {function} cb - When message has been successfully added.
 */
Cabal.prototype.publish = function (message, opts, cb) {
  if (!cb) cb = noop
  if (!message) return cb()
  if (typeof opts === 'function') return this.publish(message, null, opts)
  if (!opts) opts = {}

  this.feed(function (feed) {
    message.timestamp = timestamp()
    feed.append(message, function (err) {
      cb(err, err ? null : message)
    })
  })
}

Cabal.prototype.publishNick = function (nick, cb) {
  // TODO: sanity checks on reasonable names
  if (!cb) cb = noop
  if (!nick) return cb()

  this.feed(function (feed) {
    var msg = {
      type: 'about',
      content: {
        name: nick
      },
      timestamp: timestamp()
    }
    feed.append(msg, cb)
  })
}

Cabal.prototype.publishChannelTopic = function (channel, topic, cb) {
  if (!cb) cb = noop
  if (!channel || typeof channel !== 'string') return cb()
  if (!topic || typeof topic !== 'string') return cb()
  this.feed(function (feed) {
    var msg = {
      type: 'chat/topic',
      content: {
        channel: channel,
        text: topic
      },
      timestamp: timestamp()
    }
    feed.append(msg, cb)
  })
}

Cabal.prototype.getLocalKey = function (cb) {
  if (!cb) return

  this.feed(function (feed) {
    cb(null, feed.key.toString('hex'))
  })
}

/**
 * Replication stream for the mesh.
 */
Cabal.prototype.replicate = function () {
  return this.db.replicate({ live: true })
}

Cabal.prototype._addConnection = function (key) {
  this.emit('peer-added', key)
}

Cabal.prototype._removeConnection = function (key) {
  this.emit('peer-dropped', key)
}

function noop () {}
