var mauth = require('materialized-group-auth')
var sub = require('subleveldown')
var EventEmitter = require('events').EventEmitter
var { Readable, Transform } = require('readable-stream')
var once = require('once')
var pump = require('pump')
var readonly = require('read-only-stream')
var { nextTick } = process

module.exports = function (cabal, modKey, db) {
  var events = new EventEmitter()
  var auth = mauth(db)
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

    // check previous modKeys and remove any if the addr changed
    var hasModKey = false
    pump(auth.getMembers('@'), new Transform({
      objectMode: true,
      transform: function (row, enc, next) {
        var flags = row && row.flags || []
        if (flags.includes('admin') && row.key === -1 && row.id !== modKey
        && row.id !== key) {
          batch.push({
            type: 'remove',
            id: row.id,
            by: key,
            group: '@'
          })
        }
        if (modKey && flags.includes('admin') && row.id === modKey) {
          hasModKey = true
        }
        next()
      },
      flush: function (next) {
        // write the new mod key
        if (modKey && !hasModKey) {
          batch.push({
            type: 'add',
            key: -1, // special key to track local addr adds
            id: modKey,
            by: key,
            group: '@',
            flags: [ 'admin' ]
          })
        }
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
      queue = []
    }
  })

  return {
    map: function (rows, next) {
      if (localKey === null) {
        return queue.push(function () { map(rows, next) })
      } else map(rows, next)
    },
    events: events,
    api: {
      listBlocks: function (core, channel) {
        return listByFlag(core, { flag: 'block', channel })
      },
      listHides: function (core, channel) {
        return listByFlag(core, { flag: 'hide', channel })
      },
      listMutes: function (core, channel) {
        return listByFlag(core, { flag: 'mute', channel })
      },
      listByFlag: listByFlag,
      getFlags: function (core, opts, cb) {
        core.ready(function () {
          var id = opts.id
          var group = opts.channel || '@'
          auth.getFlags({ group, id }, cb)
        })
      },
      // ^--- queries above | updates below ---v
      setFlags: function (core, opts, cb) {
        publishFlagUpdate(core, {
          type: 'set',
          id: opts.id,
          channel: opts.channel,
          flags: opts.flags
        }, cb)
      },
      addFlags: function (core, opts, cb) {
        publishFlagUpdate(core, {
          type: 'add',
          id: opts.id,
          channel: opts.channel,
          flags: opts.flags
        }, cb)
      },
      removeFlags: function (core, opts, cb) {
        publishFlagUpdate(core, {
          type: 'remove',
          id: opts.id,
          channel: opts.channel,
          flags: opts.flags
        }, cb)
      },
    }
  }

  function listByFlag (core, opts) {
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
    return readonly(out)
  }

  function publishFlagUpdate (core, opts, cb) {
    cabal.publish({
      type: 'flags/' + opts.type,
      content: {
        id: opts.id,
        channel: opts.channel || '@',
        flags: opts.flags || []
      }
    }, cb)
  }

  function map (rows, next) {
    next = once(next)
    var batch = []
    var pending = 1
    rows.forEach(function (row) {
      if (!row.value || !row.value.content) return
      if (row.value.type === 'flags/set') {
        var id = row.value.content.id
        if (!id) return
        var group = row.value.content.channel || '@'
        var flags = checkLocal(id, row.key, row.value.content.flags || [])
        batch.push({
          type: 'add',
          by: row.key,
          key: row.key + '@' + row.seq,
          id,
          group,
          flags
        })
      } else if (row.value.type === 'flags/add') {
        var id = row.value.content.id
        if (!id) return
        var group = row.value.content.channel || '@'
        pending++
        auth.getFlags({ group, id }, function (err, flags) {
          if (err) return next(err)
          flags = checkLocal(id, row.key, flags.concat(row.value.content.flags || []))
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
      } else if (row.value.type === 'flags/remove') {
        var id = row.value.content.id
        if (!id) return
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
          flags = checkLocal(id, row.key, flags)
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
      if (batch.length > 0) {
        auth.batch(batch, { skip: true }, next)
      } else next()
    }
  }

  function checkLocal (id, key, flags) {
    // do not allow anyone to de-admin, block, hide, or mute local key
    if (id === localKey) {
      if (!flags.includes('admin')) flags.push('admin')
      flags = flags.filter(checkLocalFlag)
    }
    return flags
  }
}

function checkLocalFlag (x) {
  return !/^(block|hide|mute)$/.test(x)
}
function noop () {}
function has (obj, x) { return Object.prototype.hasOwnProperty(obj, x) }
