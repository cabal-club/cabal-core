var pump = require('pump')
var discovery = require('discovery-swarm')
var swarmDefaults = require('dat-swarm-defaults')
var debug = require('debug')('cabal')

// If a peer triggers one of these, don't just throttle them: block them for
// the rest of the session.
var knownIncompatibilityErrors = {
  'First shared hypercore must be the same': true
}

module.exports = function (cabal, cb) {
  cb = cb || function () {}

  var blocked = {}
  var connected = {}

  cabal.getLocalKey(function (err, key) {
    if (err) return cb(err)

    var swarm = discovery(Object.assign({}, swarmDefaults(), { id: Buffer.from(key, 'hex') }))
    swarm.join(cabal.key.toString('hex'))
    swarm.on('connection', function (conn, info) {
      var remoteKey = info.id.toString('hex')
      if (blocked[remoteKey]) return
      blocked[remoteKey] = true
      connected[remoteKey] = connected[remoteKey] ? connected[remoteKey]+1 : 1

      var r = cabal.replicate()
      pump(conn, r, conn, function (err) {
        if (err) debug('ERROR', err)

        cabal._removeConnection(remoteKey)

        // If the error is one that indicates incompatibility, just leave them
        // blocked for the rest of this session.
        if (err && knownIncompatibilityErrors[err.message]) {
          return
        }

        // Each disconnects adds 2 powers of two, so: 16 seconds, 64 seconds,
        // 256 seconds, etc.
        var blockedDuration = Math.pow(2, (connected[remoteKey] + 1) * 2) * 1000
        setTimeout(function () {
          delete blocked[remoteKey]
        }, blockedDuration)
      })

      cabal._addConnection(remoteKey)
    })

    cb(null, swarm)
  })
}

