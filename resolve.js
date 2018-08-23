const assert = require('assert')
const encoding = require('dat-encoding')
const url = require('url')

function resolve(href, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = null
  }

  // Resolve key in href
  try {
    const key = encoding.encode(encoding.decode(href))

    cb(null, key)
  }
  catch (err) {
    const hostname = url.parse(href).hostname

    resolveWithDns(hostname, opts, (err, key) => {
      cb(null, key)
    })
  }
}

function dnsResolver(hostname, cb) {
  // HTTPS GET FROM GOOGLE
}

function resolveWithDns(hostname, opts, cb) {
  const resolver = opts.dnsResolver || dnsResolver

  resolver(hostname, cb)
}

module.exports = resolve
