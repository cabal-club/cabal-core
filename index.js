var kappa = require('kappa-core')
var events = require('events')
var encoding = require('dat-encoding')
var inherits = require('inherits')
var concat = require('concat-stream')
var through = require('through2')
var memdb = require('memdb')
var thunky = require('thunky')
var randomBytes = require('randombytes')
var timestamp = require('monotonic-timestamp')
var createChannelView = require('./views/channels')
var createMessagesView = require('./views/messages')
var createUsersView = require('./views/users')

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
    this.key = randomBytes(24).toString('hex')
  }
  this.db = kappa(storage, { valueEncoding: json })

  // Create (if needed) and open local write feed
  var self = this
  this.feed = thunky(function (cb) {
    self.db.ready(function () {
      self.db.feed('local', function (err, feed) {
        cb(feed)
      })
    })
  })

  // views
  this.db.use('channels',  createChannelView(memdb({valueEncoding: json})))
  this.db.use('messages', createMessagesView(memdb({valueEncoding: json})))
  this.db.use('users',       createUsersView(memdb({valueEncoding: json})))

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

  message.timestamp = timestamp()

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
