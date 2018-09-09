var kappa = require('kappa-core')
var events = require('events')
var inherits = require('inherits')
var memdb = require('memdb')
var thunky = require('thunky')
var timestamp = require('monotonic-timestamp')
var createChannelView = require('./views/channels')
var createMessagesView = require('./views/messages')
var createUsersView = require('./views/users')

var JSON_VALUE_ENCODING = {
  encode: function (obj) {
    return Buffer.from(JSON.stringify(obj))
  },
  decode: function (buf) {
    var str = buf.toString('utf8')
    try { var obj = JSON.parse(str) } catch (err) { return {} }
    return obj
  }
}

module.exports = Cabal

/**
 * Create a new cabal. This is the object handling all
 * local nickname -> mesh interactions for a single user.
 * @constructor
 * @param {string|function} storage - A hyperdb compatible storage function, or a string representing the local data path.
 * @param {string} href - The dat link, or a hostname with a DNS TXT entry of the form "CABALKEY=<DAT_KEY_VALUE>". For example, "cabal://4ae5ec168a9f6b45b9d35e3cc1d0f4e3a436000d37fae8f53b3f8dadfe8f192f" is equivalent to "cabal.chat"
 * @param {Object} opts - Options include: username
 */
function Cabal (storage, key, opts) {
  if (!(this instanceof Cabal)) return new Cabal(storage, key, opts)
  if (!opts) opts = {}
  events.EventEmitter.call(this)

  this.key = key || null
  this.db = kappa(storage, { valueEncoding: JSON_VALUE_ENCODING })

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
  this.db.use('channels',  createChannelView(memdb({valueEncoding: JSON_VALUE_ENCODING})))
  this.db.use('messages', createMessagesView(memdb({valueEncoding: JSON_VALUE_ENCODING})))
  this.db.use('users',       createUsersView(memdb({valueEncoding: JSON_VALUE_ENCODING})))

  this.messages = this.db.api.messages
  this.channels = this.db.api.channels
  this.users = this.db.api.users
}

inherits(Cabal, events.EventEmitter)

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
  if (!message) return cb()
  if (typeof opts === 'function') return this.publish(message, null, opts)
  if (!opts) opts = {}
  if (!cb) cb = noop

  this.feed(function (feed) {
    message.timestamp = timestamp()
    feed.append(message, function (err) {
      cb(err, err ? null : message)
    })
  })
}

Cabal.prototype.publishNick = function (nick, cb) {
  // TODO: sanity checks on reasonable names
  if (!nick) return cb()
  if (!cb) cb = noop

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
