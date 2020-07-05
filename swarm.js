const pump = require('pump')
const hyperswarm = require('hyperswarm')
const debug = require('debug')('cabal')
const crypto = require('hypercore-crypto')
const Proto = require('hypercore-protocol')
const authSessionExt = require('hypercore-authenticate-session-extension')

module.exports = function (cabal, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  cb = cb || function () {}
  opts = opts || {}

  cabal.feed(function (feed) {
    const discoveryKey = crypto.discoveryKey(Buffer.from(cabal.key, 'hex'))

    const swarm = hyperswarm()
    swarm.join(discoveryKey, {
      lookup: true,
      announce: true
    })

    swarm.on('connection', function (socket, info) {
      let remoteKey

      var r = new Proto(info.client)
      pump(socket, r, socket, function (err) {
        if (err) debug('ERROR', err)
        if (remoteKey) cabal._removeConnection(remoteKey, info)
      })
      function accept (remotePubKey) {
        remoteKey = remotePubKey
        cabal._addConnection(remotePubKey, info)
        cabal.replicate(r)
      }

      const ext = r.registerExtension('auth-session', authSessionExt({
        localFeedPublicKey: feed.key,
        localFeedSecretKey: feed.secretKey,
        onVerify: function (ok, remotePubKey) {
          var pk = remotePubKey.toString('hex')
          if (!ok) {
            info.destroy()
            r.destroy()
          } else if (typeof opts.verify === 'function') {
            opts.verify(pk, function (err, allowed) {
              if (err) {
                debug('ERROR', err)
                info.destroy()
                r.destroy()
              } else if (allowed) {
                accept(pk)
              } else {
                info.ban()
                r.destroy()
              }
            })
          }
          else accept(pk)
        }
      }))
    })

    cb(null, swarm)
  })
}

