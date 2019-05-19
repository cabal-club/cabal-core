var pump = require('pump')
var discovery = require('discovery-swarm')
var swarmDefaults = require('dat-swarm-defaults')

module.exports = function (cabal, cb) {
  cb = cb || function () {}

  cabal.getLocalKey(function (err, key) {
    if (err) return cb(err)

    var swarm = discovery(Object.assign({}, swarmDefaults(), { id: key }))
    swarm.join(cabal.key.toString('hex'))
    swarm.on('connection', function (conn, info) {
      conn.once('error', function () { if (info.id) cabal._removeConnection(info.id) })
      conn.once('end',   function () { if (info.id) cabal._removeConnection(info.id) })

      var r = cabal.replicate()
      pump(conn, r, conn, function (err) {
        // TODO: report somehow
      })

      cabal._addConnection(info.id)
    })

    cb(null, swarm)
  })
}

