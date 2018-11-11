var discovery = require('discovery-swarm')
var swarmDefaults = require('dat-swarm-defaults')

module.exports = function (cabal) {
  var swarm = discovery(swarmDefaults())
  swarm.join(cabal.key.toString('hex'))
  swarm.on('connection', function (conn, info) {
    var remoteKey
    var ended = false

    cabal.getLocalKey(function (err, key) {
      if (key) {
        // send local key to remote
        conn.write(new Buffer(key, 'hex'))

        // read remote key from remote
        conn.once('readable', onReadable)

        conn.once('end', function () {
          ended = true
        })

        function onReadable () {
          if (ended) return
          var rkey = conn.read(32)
          if (!rkey) {
            conn.once('readable', onReadable)
            return
          }

          remoteKey = rkey.toString('hex')
          cabal._addConnection(remoteKey)
          replicate()
        }
      } else {
        throw new Error('UNEXPECTED STATE: no local key!')
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
