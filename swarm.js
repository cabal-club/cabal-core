var pump = require('pump')
var discovery = require('discovery-swarm')
var swarmDefaults = require('dat-swarm-defaults')()
var debug = require('debug')('cabal')
var crypto = require('hypercore-crypto')

var cabalDiscoveryServers = [
  'eight45.net:9090',
  'dnsdiscovery.four.parts:9090',
  'cblgh.org:9090'
]
Array.prototype.push.apply(swarmDefaults.dns.server, cabalDiscoveryServers)

module.exports = function (cabal, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  cb = cb || function () {}
  opts = opts || {}

  var connected = {}

  cabal.getLocalKey(function (err, key) {
    if (err) return cb(err)

    var swarm = discovery(Object.assign({}, swarmDefaults, { id: Buffer.from(key, 'hex') }))
    var cabalKey = Buffer.isBuffer(cabal.key) ? cabal.key : Buffer.from(cabal.key, 'hex')
    var swarmKey = crypto.discoveryKey(cabalKey)
    swarm.join(swarmKey.toString('hex'))
    swarm.on('connection', function (conn, info) {
      var remoteKey = info.id.toString('hex')
      connected[remoteKey] = connected[remoteKey] ? connected[remoteKey] + 1 : 1

      var r = cabal.replicate(info.initiator)
      pump(conn, r, conn, function (err) {
        if (err) debug('ERROR', err)

        if (!--connected[remoteKey]) {
          cabal._removeConnection(remoteKey)
        }
      })

      cabal._addConnection(remoteKey)
    })

    cb(null, swarm)
  })
}
