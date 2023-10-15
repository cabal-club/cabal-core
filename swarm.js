const pump = require('pump')
const Swarm = require('hyperswarm')
const DHT = require('hyperdht')
const debug = require('debug')('cabal')
const crypto = require('hypercore-crypto')

module.exports = function (cabal, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  cb = cb || function () {}
  opts = opts || {}

  cabal.getLocalKey(function (err, localKey) {
    if (err) return cb(err)

    const discoveryKey = crypto.discoveryKey(Buffer.from(cabal.key, 'hex'))

    const dht = new DHT({bootstrap: [
      'node1.hyperdht.org:49737',
      'node2.hyperdht.org:49737',
      'node3.hyperdht.org:49737',
      'eight45.net:49737',
    ]})
    opts.dht = dht
    const swarm = new Swarm(opts)
    swarm.join(discoveryKey, {
      server: true,
      client: true
    })

    swarm.on('connection', function (socket, info) {
      let remoteKey

      var r = cabal.replicate(info.client)
      pump(socket, r, socket, function (err) {
        if (err) debug('ERROR', err)
        if (remoteKey) cabal._removeConnection(remoteKey)
      })

      const ext = r.registerExtension('peer-id', {
        encoding: 'json',
        onmessage (message, peer) {
          if (remoteKey) return
          if (!message.id) return
          const buf = Buffer.from(message.id, 'hex')
          if (!buf || buf.length !== 32) return
          remoteKey = message.id
          cabal._addConnection(remoteKey)
        }
      })
      ext.send({id:localKey})
    })

    cb(null, swarm)
  })
}

