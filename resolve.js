const encoding = require('dat-encoding')
const https = require('https')
const NodeCache = require( "node-cache" )
const querystring = require('querystring')
const url = require('url')

function Resolver() {
  this._myCache = new NodeCache()
}

Resolver.prototype.close = function() {
  this._myCache.close()
}

Resolver.prototype.resolve = function(href, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  if (!href || typeof href !== 'string' || href.length === 0) {
    cb('Invalid href')
    return
  }

  // Resolve key in href
  try {
    const key = encoding.encode(encoding.decode(href))
    cb(null, key)
  }
  catch (err) {
    const parsed_url = url.parse(href)
    const hostname = parsed_url.hostname || parsed_url.pathname

    this._resolveFromCache(hostname, opts, (err, key) => {
      if (err) {
        cb(err)
      } else {
        if (key) {
          cb(null, key)
        } else {
          resolveWithDns(hostname, opts, (err, key) => {
            if (err) {
              cb(err)
            } else {
              cb(null, key)
            }
          })
        }
      }
    })
  }
}

Resolver.prototype._resolveFromCache = function(hostname, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  const cache = opts.cache || this._myCache

  cb(null, cache.get(hostname))
}

const CABAL_KEY_REGEX = /^"?cabalkey=([0-9a-f]{64})"?$/i

function parseKeyFromDns(data) {
  const answers = data.Answer || []
  const cabal_answers = answers.filter((answer) => {
    const matches = CABAL_KEY_REGEX.exec(answer.data)

    if (matches && matches.length > 0) {
      return true
    } else {
      return false
    }
  })

  const answer = cabal_answers[0]
  const key = CABAL_KEY_REGEX.exec(answer.data)[1]
  return key
}

function dnsResolver(hostname, cb) {
  const host = 'dns.google.com'
  const path = '/resolve'

  const query = {
    name: hostname,
    type: 'TXT'
  }

  let raw_data = []

  https.get({
    host,
    path: `${path}?${querystring.stringify(query)}`
  }, (res) => {
    res.on('data', (chunk) => {
      raw_data = raw_data + chunk
    })
    res.on('end', () => {
      const data = JSON.parse(raw_data)
      const key = parseKeyFromDns(data)
      cb(null, key)
    })
  })
}

function resolveWithDns(hostname, opts, cb) {
  const resolver = opts.dnsResolver || dnsResolver

  try {
    resolver(hostname, cb)
  }
  catch (err) {
    cb(err)
  }
}

module.exports = Resolver
