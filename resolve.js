const encoding = require('dat-encoding')

function resolve(href, cb) {
  // Resolve key in href
  const key = encoding.encode(encoding.decode(href))

  return cb(null, key)
}

module.exports = resolve
