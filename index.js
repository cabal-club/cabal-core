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
    this.addr = encoding.encode(key)
  } catch (e) {
    this.addr = null
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
  // self.channels = {}
  // self.users = {}
  // self.users[opts.username] = new Date()
}

inherits(Cabal, events.EventEmitter)

/**
 * When a connection is made. Auto-authorizes new peers to
 * write to the local database. Maintains the local view
 * of visible users.
 * @param {Object} peer - The discovery-swarm peer emitted from the 'connection' or 'disconnection' event
 */
Cabal.prototype.onconnection = function (peer) {
  var self = this
  if (!peer.remoteUserData) return
  try { var data = JSON.parse(peer.remoteUserData) } catch (err) { return }
  var key = Buffer.from(data.key)
  // var username = data.username

  self.db.authorized(key, function (err, auth) {
    if (err) return console.log(err)
    if (!auth) {
      self.db.authorize(key, function (err) {
        if (err) return console.log(err)
      })
    }
  })

  // if (!self.users[username]) {
  //   self.users[username] = new Date()
  //   self.emit('join', username)
  //   peer.on('close', function () {
  //     if (!self.users[username]) return
  //     delete self.users[username]
  //     self.emit('leave', username)
  //   })
  // }
}

Cabal.prototype.getMessages = function (channel, max, cb) {
  var self = this
  self.metadata(channel, (err, metadata) => {
    if (err) return cb(err)
    var latest = metadata.latest
    var messagePromises = []
    for (var i = 0; i < max; i++) {
      if (latest - i < 1) break
      var promise = getMessage(latest - i, channel)
      messagePromises.push(promise)
    }

    function getMessage (time, channel) {
      return new Promise((resolve, reject) => {
        self.db.get(`messages/${channel}/${time}`, (err, node) => {
          if (err) reject(err)
          resolve(node)
        })
      })
    }

    messagePromises.reverse()
    Promise.all(messagePromises).then((messages) => {
      cb(null, messages)
    })
  })
}

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
 * Create a readable stream for the mesh.
 * @param {String} channel - The channel you want to read from.
 */
Cabal.prototype.readMessages = function (channel, opts) {
  if (!opts) opts = {}
  return this.db.api.messages.read(channel)
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
    feed.append(message, cb)
  })
}

/**
 * Replication stream for the mesh.
 */
Cabal.prototype.replicate = function () {
  var self = this
  return this.db.replicate({
    live: true,
    userData: JSON.stringify({
      key: self.db.local.key
    })
  })
}

function noop () {}
