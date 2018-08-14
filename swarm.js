var discovery = require('discovery-swarm')
var swarmDefaults = require('dat-swarm-defaults')

module.exports = function (cabal) {
  var swarm = discovery(swarmDefaults())
  swarm.join(cabal.key.toString('hex'))
  swarm.on('connection', function (conn, info) {
    var r = cabal.replicate()
    conn.pipe(r).pipe(conn)

    conn.on('error', noop)
    r.on('error', noop)
  })
  return swarm
}

function noop () {}
