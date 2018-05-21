var hyperdb = require('hyperdb')
var events = require('events')
var encoding = require('dat-encoding')
var inherits = require('inherits')
var concat = require('concat-stream')
var through = require('through2')

module.exports = Cabal

/**
 * Create a new cabal. This is the object handling all
 * local nickname -> mesh interactions for a single user.
 * @constructor
 * @param {string|function} storage - A hyperdb compatible storage function, or a string representing the local data path.
 * @param {string} href - The dat link
 * @param {Object} opts - Options include: username
 */
function Cabal (storage, href, opts) {
  if (!(this instanceof Cabal)) return new Cabal(storage, href, opts)
  if (!opts) opts = {}
  events.EventEmitter.call(this)
  var self = this
  this.channelPattern = /([^/]+)\/.+/

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

  self.username = opts.username || 'conspirator'

  try {
    var key = encoding.decode(href)
    self.addr = encoding.encode(key)
  } catch (e) {
    self.addr = null
  }
  self.db = self.addr
    ? hyperdb(storage, self.addr, {valueEncoding: json})
    : hyperdb(storage, {valueEncoding: json})

  self.channels = {}
  self.users = {}
  self.users[opts.username] = new Date()
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
  var username = data.username

  self.db.authorized(key, function (err, auth) {
    if (err) return console.log(err)
    if (!auth) {
      self.db.authorize(key, function (err) {
        if (err) return console.log(err)
      })
    }
  })

  if (!self.users[username]) {
    self.users[username] = new Date()
    self.emit('join', username)
    peer.on('close', function () {
      if (!self.users[username]) return
      delete self.users[username]
      self.emit('leave', username)
    })
  }
}

Cabal.prototype.watch = function (channel, cb) {
  this.db.watch(`${channel}/messages`, cb)
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
        self.db.get(`${channel}/messages/${time}`, (err, node) => {
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

Cabal.prototype.getChannels = function (cb) {
  var self = this
  var stream = self.db.createReadStream('/')
  var concatStream = concat((data) => {
    var channels = {}
    data.forEach((d) => {
      var match = self.channelPattern.exec(d)
      if (match && match[1]) {
        channels[match[1]] = true
      }
    })
    cb(null, Object.keys(channels))
  })

  stream
    .pipe(through.obj(function (chunk, enc, next) {
      chunk.forEach((c) => {
        this.push([c.key])
      })
      next()
    }))
    .pipe(concatStream)
}

/**
 * Join a channel.
 * @param {String} channel - The channel to join.
 */
Cabal.prototype.joinChannel = function (channel) {
  this.channels[channel] = true
}

/**
 * Leave a channel.
 * @param {String} channel - The channel to leave.
 */
Cabal.prototype.leaveChannel = function (channel) {
  delete this.channels[channel]
}

/**
 * Create a readable stream for the mesh.
 * @param {String} channel - The channel you want to read from.
 */
Cabal.prototype.createReadStream = function (channel, opts) {
  if (!opts) opts = {}
  return this.db.createReadStream(`${channel}/messages`, Object.assign({recursive: true}, opts))
}

/**
 * Get the metadata of channel.
 * @param  {String}   channel Channel name
 * @param  {Function} done    Callback
 */
Cabal.prototype.metadata = function (channel, done) {
  this.db.get(`${channel}/metadata`, function (err, data) {
    if (err) return done(err)
    if (!data.length) {
      return done(null, {latest: 0})
    }
    var largestNode = data[0].value
    // find the largest value in case of a collision
    data.forEach((d) => {
      if (d.value.latest > largestNode.latest) {
        largestNode = d.value
      }
    })

    done(null, largestNode)
  })
}

/**
 * Create a message.
 * @param {String} channel - The channel to create the message.
 * @param {String} message - The message to write.
 * @param {Object} opts - Options: date, username
 * @param {function} done - When message has been successfully added.
 */
Cabal.prototype.message = function (channel, message, opts, done) {
  if (typeof opts === 'function') return this.message(channel, message, null, opts)
  if (!opts) opts = {}
  if (!done) done = noop
  var self = this
  if (!message) return done()
  var username = opts.username || self.username
  self.metadata(channel, function (err, metadata) {
    if (err) return done(err)
    var latest = parseInt(metadata.latest)
    var newLatest = latest + 1
    var key = `${channel}/messages/${newLatest}`
    var d = opts.date || new Date()
    var date = new Date(d.getTime())
    var m = {author: username, time: date, content: message}
    metadata.latest = newLatest
    var batch = [
      {type: 'put', key: `${channel}/metadata`, value: metadata},
      {type: 'put', key: key, value: m}
    ]
    self.db.batch(batch, () => {
      self.emit('message', m)
      done(m)
    })
  })
}

/**
 * Replication stream for the mesh. Shares the username with the
 * other peers it is connecting with.
 */
Cabal.prototype.replicate = function () {
  var self = this
  return this.db.replicate({
    live: true,
    userData: JSON.stringify({
      key: self.db.local.key,
      username: self.username
    })
  })
}

function noop () {}
