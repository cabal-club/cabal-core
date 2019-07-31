var pump = require('pump')
var discovery = require('discovery-swarm')
var swarmDefaults = require('dat-swarm-defaults')
var debug = require('debug')('cabal')

module.exports = function (cabal, cb) {
  cb = cb || function () {}

  cabal.getLocalKey(function (err, key) {
    if (err) return cb(err)

    var swarm = discovery(Object.assign({}, swarmDefaults(), { id: Buffer.from(key, 'hex') }))
    swarm.join(cabal.key.toString('hex'))
    swarm.on('connection', function (conn, info) {
      var remoteKey = info.id.toString('hex')
      conn.once('error', function () { if (remoteKey) cabal._removeConnection(remoteKey) })
      conn.once('end',   function () { if (remoteKey) cabal._removeConnection(remoteKey) })

      var r = cabal.replicate()
      pump(conn, r, conn, function (err) {
        if (err) debug('ERROR', err)
      })

      cabal._addConnection(remoteKey)
    })

    cb(null, swarm)
  })
}

