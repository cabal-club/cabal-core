const dns = require('dns')
const encoding = require('dat-encoding')
const url = require('url')

resolve = function(href, opts, cb) {
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

    resolveWithDns(hostname, opts, (err, key) => {
      if (err) {
        cb(err)
      } else {
        cb(null, key)
      }
    })
  }
}

const CABAL_KEY_REGEX = /^"?cabalkey=([0-9a-f]{64})"?$/i

function flattenArray(arr) {
  return arr.reduce(function(prev, current) {
    return prev.concat(current)
  }, [])
}

function matchingRegex(regex) {
  return function(candidate) {
    const matches = regex.exec(candidate)

    if (matches && matches.length > 0) {
      return true
    } else {
      return false
    }
  }
}

function parseKeyFromDns(answers, cb) {
  try {
    const cabal_answers =
      flattenArray(answers).
      filter(matchingRegex(CABAL_KEY_REGEX))

    const answer = cabal_answers[0]
    const key = CABAL_KEY_REGEX.exec(answer)[1]

    cb(null, key)
  } catch (err) {
    cb('Unable to parse key from DNS answers: ' + err)
  }
}

function dnsResolver(hostname, cb) {
  dns.resolveTxt(hostname, function(err, answers) {
    if (err) {
      cb(err)
    } else {
      parseKeyFromDns(answers, function(err, key) {
        if (err) {
          cb(err)
        } else {
          cb(null, key)
        }
      })
    }
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

module.exports = resolve
