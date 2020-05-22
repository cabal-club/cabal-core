var mauth = require('materialized-group-auth')
var sub = require('subleveldown')
var EventEmitter = require('events').EventEmitter
var { Readable, Transform } = require('readable-stream')
var once = require('once')
var pump = require('pump')
var readonly = require('read-only-stream')
var through = require('through2')
var collect = require('collect-stream')
var duplexify = require('duplexify')
var { nextTick } = process

const MOD = 'm!'

module.exports = function (cabal, authDb, infoDb) {
  var events = new EventEmitter()
  var auth = mauth(authDb)
  auth.on('update', function (update) {
    events.emit('update', update)
  })
  auth.on('skip', function (skip) {
    events.emit('skip', skip)
  })
  var queue = []
  var localKey = null
  cabal.getLocalKey(function (err, key) {
    if (err) return events.emit('error', err)
    var batch = []
    var pending = 2
    auth.isMember({ group: '@', id: key }, function (err, m) {
      if (err) return events.emit('error', err)
      if (!m) {
        batch.push({
          type: 'add',
          id: key,
          by: null,
          group: '@',
          flags: [ 'admin' ]
        })
      }
      if (--pending === 0) done()
    })

    // check previous adminKeys and remove any if the addr changed
    var hasAdminKeys = {}
    var hasModKeys = {}
    var userFlags = {}
    pump(auth.getMembers('@'), new Transform({
      objectMode: true,
      transform: function (row, enc, next) {
        var flags = row && row.flags || []
        if (flags.includes('admin') && row.key === undefined &&
        cabal.adminKeys.includes(row.id) && row.id !== key) {
          batch.push({
            type: 'remove',
            id: row.id,
            by: key,
            group: '@'
          })
        }
        if (cabal.adminKeys.length > 0 && flags.includes('admin') &&
        cabal.adminKeys.includes(row.id)) {
          hasAdminKeys[row.id] = true
          userFlags[row.id] = flags
        }
        if (flags.includes('mod') && row.key === undefined &&
        cabal.modKeys.includes(row.id) && row.id !== key) {
          batch.push({
            type: 'remove',
            id: row.id,
            by: key,
            group: '@'
          })
        }
        if (cabal.modKeys.length > 0 && flags.includes('mod') &&
        cabal.modKeys.includes(row.id)) {
          hasModKeys[row.id] = true
          userFlags[row.id] = flags
        }
        next()
      },
      flush: function (next) {
        // write the new admin key
        cabal.adminKeys.forEach(function (id) {
          if (hasAdminKeys[id]) return
          batch.push({
            type: 'add',
            id,
            by: key,
            group: '@',
            flags: (userFlags[id] || []).concat('admin')
          })
        })
        cabal.modKeys.forEach(function (id) {
          if (hasModKeys[id]) return
          batch.push({
            type: 'add',
            id,
            by: key,
            group: '@',
            flags: (userFlags[id] || []).concat('mod')
          })
        })
        if (--pending === 0) done()
      }
    }), err => { if (err) throw err })
    if (pending === 0) done()
    function done () {
      if (batch.length > 0) {
        // local key goes first so it can auth the other key
        batch.sort(function (a, b) {
          return a.by === null ? -1 : +1
        })
        auth.batch(batch, function (err) {
          if (err) events.emit('error', err)
          else finish()
        })
      } else finish()
    }
    function finish () {
      localKey = key
      queue.forEach(function (q) { q() })
      queue = null
    }
  })

  return {
    map: wrap(map),
    api: {
      events: events,
      listBlocks: wrapReadStream(function (core, channel, cb) {
        return listByFlag(core, { flag: 'block', channel }, cb)
      }),
      listHides: wrapReadStream(function (core, channel, cb) {
        return listByFlag(core, { flag: 'hide', channel }, cb)
      }),
      listMutes: wrapReadStream(function (core, channel, cb) {
        return listByFlag(core, { flag: 'mute', channel }, cb)
      }),
      listByFlag: wrapReadStream(listByFlag),
      getFlags: wrap(function (core, opts, cb) {
        core.ready(function () {
          var id = opts.id
          var group = opts.channel || '@'
          auth.getFlags({ group, id }, cb)
        })
      }),
      list: wrapReadStream(function (core, opts, cb) {
        if (typeof opts === 'function') {
          cb = opts
          opts = {}
        }
        var r = auth.list(opts)
        var out = through.obj(function (row, enc, next) {
          row.channel = row.group
          delete row.group
          next(null, row)
        })
        pump(r, out)
        var ro = readonly(out)
        if (cb) collect(ro, cb)
        return ro
      }),
      listModerationBy: function (core, key, cb) {
        var r = infoDb.createReadStream({
          gt: MOD + key + '@',
          lt: MOD + key + '@\uffff'
        })
        var out = through.obj(function (row, enc, next) {
          cabal.getMessage(row.key.slice(MOD.length), function (err, doc) {
            if (err) return next(err)
            next(null, doc)
          })
        })
        pump(r, out)
        var ro = readonly(out)
        if (cb) collect(ro, cb)
        return ro
      },
      // ^--- queries above | updates below ---v
      setFlags: function (core, opts, cb) {
        publishFlagUpdate(core, 'set', opts, cb)
      },
      addFlags: function (core, opts, cb) {
        publishFlagUpdate(core, 'add', opts, cb)
      },
      removeFlags: function (core, opts, cb) {
        publishFlagUpdate(core, 'remove', opts, cb)
      },
    }
  }

  function wrap (f) {
    return function () {
      var args = arguments
      var self = this
      if (queue !== null) {
        return queue.push(function () { f.apply(self, args) })
      }
      return f.apply(self, args)
    }
  }

  function wrapReadStream (f) {
    return function () {
      var args = arguments
      var self = this
      if (queue !== null) {
        var stream = duplexify()
        queue.push(function () {
          stream.setReadable(f.apply(self, args))
        })
        return stream
      }
      return f.apply(self, args)
    }
  }

  function listByFlag (core, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts
      opts = {}
    }
    if (typeof opts === 'string') {
      opts = { flag: opts }
    }
    var out = new Transform({
      objectMode: true,
      transform: function (row, enc, next) {
        var flags = row && row.flags || []
        if (row && (opts.flag === undefined || flags.includes(opts.flag))) {
          next(null, row)
        } else next()
      }
    })
    core.ready(function () {
      pump(auth.getMembers(opts.channel || '@'), out)
    })
    var ro = readonly(out)
    if (cb) collect(ro, cb)
    return ro
  }

  function publishFlagUpdate (core, type, opts, cb) {
    var content = Object.assign({}, opts, {
      channel: opts.channel || '@',
      flags: opts.flags || []
    })
    cabal.publish({
      type: 'flags/' + type,
      content
    }, cb)
  }

  function map (rows, next) {
    next = once(next)
    var batch = []
    var infoBatch = []
    var pending = 1
    rows.forEach(function (row) {
      if (!row.value || !row.value.content) return
      var id = row.value.content.id
      if (!id) return
      if (/^flags\/(set|add|remove)$/.test(row.value.type)) {
        infoBatch.push({
          type: 'put',
          key: MOD + row.key + '@' + row.seq,
          value: ''
        })
      }
      if (row.value.type === 'flags/set') {
        var group = row.value.content.channel || '@'
        var flags = checkLocal(
          id, group, row.key,
          row.value.content.flags || []
        )
        batch.push({
          type: 'add',
          by: row.key,
          key: row.key + '@' + row.seq,
          id,
          group,
          flags
        })
      } else if (row.value.type === 'flags/add') {
        var group = row.value.content.channel || '@'
        pending++
        auth.getFlags({ group, id }, function (err, prevFlags) {
          if (err) return next(err)
          var flags = checkLocal(
            id, group, row.key,
            prevFlags.concat(row.value.content.flags || [])
          )
          if (!arrayEq(prevFlags, flags)) {
            batch.push({
              type: 'add',
              by: row.key,
              key: row.key + '@' + row.seq,
              id,
              group,
              flags
            })
          }
          if (--pending === 0) done()
        })
      } else if (row.value.type === 'flags/remove') {
        var group = row.value.content.channel || '@'
        pending++
        auth.getFlags({ group, id }, function (err, flags) {
          if (err) return next(err)
          var rmFlags = {}
          ;(row.value.content.flags || []).forEach(function (x) {
            rmFlags[x] = true
          })
          flags = flags.filter(function (x) {
            return !has(rmFlags, x)
          })
          flags = checkLocal(id, group, row.key, flags)
          batch.push({
            type: 'add',
            by: row.key,
            key: row.key + '@' + row.seq,
            id,
            group,
            flags
          })
          if (--pending === 0) done()
        })
      }
    })
    if (--pending === 0) done()
    function done () {
      var pending = 1
      if (batch.length > 0) {
        pending++
        auth.batch(batch, { skip: true }, function (err) {
          if (err) next(err)
          else if (--pending === 0) next()
        })
      }
      if (infoBatch.length > 0) {
        pending++
        infoDb.batch(infoBatch, function (err) {
          if (err) next(err)
          else if (--pending === 0) next()
        })
      }
      if (--pending === 0) next()
    }
  }

  function checkLocal (id, channel, key, flags) {
    // do not allow anyone to de-admin, block, hide, or mute local key
    if (id === localKey) {
      if (channel === '@' && !flags.includes('admin')) flags.push('admin')
      flags = flags.filter(checkLocalFlag)
    }
    return flags
  }
}

function checkLocalFlag (x) {
  return !/^(block|hide|mute)$/.test(x)
}
function noop () {}
function has (obj, x) { return Object.prototype.hasOwnProperty.call(obj, x) }
function arrayEq (a, b) {
  if (!a || !b || a.length !== b.length) return false
  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}
