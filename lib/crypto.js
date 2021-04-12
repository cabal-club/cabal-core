var pb = require('private-box')
var sodium = require('sodium-universal')

module.exports = {
  box: box,
  unbox: unbox
}

// Data buffer, array of hypercore public key buffers
// Returns ciphertext buffer
function box (data, recipients) {
  if (!Array.isArray(recipients)) recipients = [recipients]
  recipients = recipients.map(function (key) {
    let pkbuf = Buffer.alloc(sodium.crypto_box_PUBLICKEYBYTES)
    sodium.crypto_sign_ed25519_pk_to_curve25519(pkbuf, key)
    return pkbuf
  })
  return pb.encrypt(data, recipients)
}

// Encrypted data buffer, hypercore secret key
// Returns decrypted buffer, or undefined if not addressed to the key
function unbox (cdata, key) {
  var skbuf = Buffer.alloc(sodium.crypto_box_SECRETKEYBYTES)
  sodium.crypto_sign_ed25519_sk_to_curve25519(skbuf, key)
  return pb.decrypt(cdata, skbuf)
}
