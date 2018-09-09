var kappa = require('kappa-core')
var events = require('events')
var inherits = require('inherits')
var memdb = require('memdb')
var thunky = require('thunky')
var timestamp = require('monotonic-timestamp')
var createChannelView = require('./views/channels')
var createMessagesView = require('./views/messages')
var createUsersView = require('./views/users')
var resolve = require('./resolve')

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
 *
 * This fires a {@link #cabalready} event after the cabal has initialized,
 * a {@link #cabalerror} event indicates that something has gone wrong.
 *
 * @constructor
 * @param {string|function} storage - A hyperdb compatible storage function, or a string representing the local data path.
 * @param {string} href - The dat link, or a hostname with a DNS TXT entry of the form "CABALKEY=<DAT_KEY_VALUE>". For example, "cabal://4ae5ec168a9f6b45b9d35e3cc1d0f4e3a436000d37fae8f53b3f8dadfe8f192f" is equivalent to "cabal.chat"
 * @param {Object} opts - Options include: username
 *
 * @fires Cabal#ready
 * @fires Cabal#error
 */
function Cabal (storage, href, opts) {
  if (!(this instanceof Cabal)) return new Cabal(storage, href, opts)
  if (!opts) opts = {}
  events.EventEmitter.call(this)

  this._storage = storage
  this.href = href
}

inherits(Cabal, events.EventEmitter)

Cabal.prototype.init = function(storage) {
  var self = this

  var onKeyResolved = function(err, key) {
    if (err) {
      handleError(err)
      return
    }

    self.key = key

    configureDb()
  }

  var onDbReady = function(err, feed) {
    if (err) emit('error', 'DB not ready')
    self.db.feed('local', function (err, feed) {
      if (err) emit('error', 'Feed not accessible')

      if (!self.key) self.key = feed.key.toString('hex')

      /**
       * Ready event. Indicates the cabal db, key and view are initialized and ready to use.
       *
       * @event Cabal#ready
       * @type {object}
       */
      self.emit('ready')
    })
  }

  var configureDb = function() {
    self.db = kappa(self._storage, { valueEncoding: JSON_VALUE_ENCODING })

    // views
    self.db.use('channels',  createChannelView(memdb({valueEncoding: JSON_VALUE_ENCODING})))
    self.db.use('messages', createMessagesView(memdb({valueEncoding: JSON_VALUE_ENCODING})))
    self.db.use('users',       createUsersView(memdb({valueEncoding: JSON_VALUE_ENCODING})))

    // expose apis from database views
    self.messages = self.db.api.messages
    self.channels = self.db.api.channels
    self.users = self.db.api.users

    // Create (if needed) and open local write feed
    self.feed = thunky(function (cb) {
      self.db.ready(function () {
        self.db.feed('local', function (err, feed) {
          cb(feed)
        })
      })
    })

    // Configure DB read handler
    self.db.ready(onDbReady)
  }

  var handleError = function(err) {
    var message = err || err.message || 'unknown'
    /**
     * Error. Indicates something went wrong initializing this cabal.
     * @event Cabal#error
     * @type {Error}
     */
    self.emit('error', 'An error occured initializing the Cabal: ' + message, err)
  }

  if (this.href) {
    resolve(this.href, onKeyResolved)
  } else {
    onKeyResolved(null, null)
  }
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
