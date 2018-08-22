const encoding = require('dat-encoding')

function resolve(href, cb) {
  // Resolve key in href
  try {
    const key = encoding.encode(encoding.decode(href))

    cb(null, key)
  }
  catch (err) {
    cb(err.message)
  }
}

module.exports = resolve
