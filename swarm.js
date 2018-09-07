var discovery = require('discovery-swarm')
var swarmDefaults = require('dat-swarm-defaults')

module.exports = function (cabal) {
  var swarm = discovery(swarmDefaults())
  swarm.join(cabal.key.toString('hex'))
  swarm.on('connection', function (conn, info) {
    var remoteKey

    cabal.getLocalKey(function (err, key) {
      if (key) {
        conn.write(new Buffer(key, 'hex'))
        conn.once('data', function (rkey) {
          remoteKey = rkey.toString('hex')
          conn.pause()
          cabal._addConnection(remoteKey)
          replicate()
        })
      } else {
        replicate()
      }
    })

    function replicate () {
      var r = cabal.replicate()
      conn.pipe(r).pipe(conn)
      r.on('error', noop)
    }

    conn.once('error', function () { if (remoteKey) cabal._removeConnection(remoteKey) })
    conn.once('end',   function () { if (remoteKey) cabal._removeConnection(remoteKey) })
  })
  return swarm
}

function noop () {}
