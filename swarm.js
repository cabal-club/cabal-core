var discovery = require('discovery-swarm')
var swarmDefaults = require('dat-swarm-defaults')

module.exports = function (cabal) {
  var swarm = discovery(swarmDefaults({
    id: cabal.db.local.key,
    stream: function (peer) {
      return cabal.replicate()
    }
  }))
  var key = cabal.addr || cabal.db.key
  swarm.join(key.toString('hex'))
  swarm.on('connection', cabal.onconnection.bind(cabal))
  return swarm
}
