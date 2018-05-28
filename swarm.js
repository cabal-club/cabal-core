var discovery = require('discovery-swarm')
var swarmDefaults = require('dat-swarm-defaults')

module.exports = function (cabal) {
  var swarm = discovery(swarmDefaults({
    stream: function (peer) {
      return cabal.replicate()
    }
  }))
  swarm.join(cabal.key.toString('hex'))
  return swarm
}
