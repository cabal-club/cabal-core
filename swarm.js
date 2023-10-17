const pump = require('pump')
const Swarm = require('hyperswarm')
const DHT = require('hyperdht')
const debug = require('debug')('cabal')
const crypto = require('hypercore-crypto')
const bootstrapNodes = require('./bootstrap_nodes')

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

    const dht = new DHT({bootstrap: bootstrapNodes})
    opts.dht = dht
    const swarm = new Swarm(opts)
    const disco = swarm.join(discoveryKey, {
      server: true,
      client: true
    })

    swarm.__shutdown = async function () {
      await disco.destroy()
      await swarm.destroy()
    }

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

