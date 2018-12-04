var network = require('@hyperswarm/network')
var crypto = require('crypto')

module.exports = function (cabal) {
  var net = network()

  const topic = crypto.createHash('sha256')
    .update(cabal.key.toString('hex'))
    .digest()

  net.join(topic, {
    lookup: true,
    announce: true
  })
  net.on('connection', function (socket, details) {
    var remoteKey
    var ended = false

    cabal.getLocalKey(function (err, key) {
      if (key) {
        // send local key to remote
        socket.write(new Buffer(key, 'hex'))

        // read remote key from remote
        socket.once('readable', onReadable)

        socket.once('end', function () {
          ended = true
        })

        function onReadable () {
          if (ended) return
          var rkey = socket.read(32)
          if (!rkey) {
            socket.once('readable', onReadable)
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
      socket.pipe(r).pipe(socket)
      r.on('error', noop)
    }

    socket.once('error', function () { if (remoteKey) cabal._removeConnection(remoteKey) })
    socket.once('end', function () { if (remoteKey) cabal._removeConnection(remoteKey) })
  })
  return net
}

function noop () {}
