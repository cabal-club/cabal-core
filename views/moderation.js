var mauth = require('materialized-group-auth')
var sub = require('subleveldown')
var EventEmitter = require('events').EventEmitter
var { Readable, Transform } = require('readable-stream')
var once = require('once')
var pump = require('pump')
var readonly = require('read-only-stream')

module.exports = function (cabal, modKey, db) {
  var events = new EventEmitter()
  var auth = mauth(db)
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
          role: 'admin'
        })
      }
      if (--pending === 0) done()
    })

    // check previous modKeys and remove any if the addr changed
    var hasModKey = false
    pump(auth.getMembers('@'), new Transform({
      objectMode: true,
      transform: function (row, enc, next) {
        if (row.role === 'admin' && row.key === -1 && row.id !== modKey
        && row.id !== key) {
          batch.push({
            type: 'remove',
            id: row.id,
            by: key,
            group: '@'
          })
        }
        if (modKey && row.role === 'admin' && row.id === modKey) {
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
            role: 'admin'
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
      queue.forEach(function (q) { q() })
      queue = []
      localKey = key
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
      listBans: function (core, channel, opts) {
        if (!opts) opts = {}
        var out = new Transform({
          objectMode: true,
          transform: function (row, enc, next) {
            if (row && row.role === 'ban/key') {
              next(null, { type: 'key', id: row.id, key: row.key })
            } else if (row && row.role === 'ban/ip') {
              next(null, { type: 'ip', id: row.id, key: row.key })
            } else next()
          }
        })
        this.ready(function () {
          pump(auth.getMembers(channel), out)
        })
        return readonly(out)
      },

      listMods: function (core, channel, opts) {
        // shows both mods + admins
        if (!opts) opts = {}
        var out = new Transform({
          objectMode: true,
          transform: function (row, enc, next) {
            if (row && (row.role === 'mod' || row.role === 'admin')) {
              next(null, row)
            } else next()
          }
        })
        this.ready(function () {
          pump(auth.getMembers(channel), out)
        })
        return readonly(out)
      },

      listAdmins: function (core, channel, opts) {
        if (!opts) opts = {}
        var out = new Transform({
          objectMode: true,
          transform: function (row, enc, next) {
            if (row && row.role === 'admin') {
              next(null, row)
            } else next()
          }
        })
        this.ready(function () {
          pump(auth.getMembers(channel), out)
        })
        return readonly(out)
      },

      listRoles: function (core, channel) {
        return auth.getMembers(channel)
      },

      banInfo: function (core, feedSeq, cb) {
        if (typeof feedSeq === 'string') {
          var p = feedSeq.split('@')
          feedSeq = { key: p[0], seq: Number(p[1]) }
        }
        core._logs.feed(feedSeq.key).get(feedSeq.seq, cb)
      },

      modInfo: function (core, feedSeq, cb) {
        if (typeof feedSeq === 'string') {
          var p = feedSeq.split('@')
          feedSeq = { key: p[0], seq: Number(p[1]) }
        }
        core._logs.feed(feedSeq.key).get(feedSeq.seq, cb)
      },

      isBanned: function (core, r, cb) {
        this.ready(function () {
          cb = once(cb || noop)
          var pending = 1
          var banned = false
          ;['key','ip'].forEach(function (key) {
            if (r.channel && r[key]) {
              pending++
              auth.getRole({ group: r.channel, id: r[key] }, function (err, role) {
                if (err) return cb(err)
                banned = banned || (role === 'ban/' + key)
                if (--pending === 0) cb(null, banned)
              })
            }
            if (r[key]) {
              pending++
              auth.getRole({ group: '@', id: r[key] }, function (err, role) {
                if (err) return cb(err)
                banned = banned || (role === 'ban/' + key)
                if (--pending === 0) cb(null, banned)
              })
            }
          })
          if (--pending === 0) cb(null, banned)
        })
      },

      getRole: function (core, opts, cb) {
        auth.getRole({ group: opts.channel, id: opts.key }, cb)
      }
    }
  }
  function map (rows, next) {
    var batch = []
    var m
    rows.forEach(function (row) {
      if (!row.value || !row.value.content) return
      // todo: add skips for local ip
      if (row.value.type === 'mod/remove'
      && row.value.content.key === localKey) {
        // skip removal of localKey as admin
      } else if (row.value.type === 'ban/add'
      && row.value.content.key === localKey) {
        // skip banning of localKey
      } else if (m = /^(mod|admin)\/(add|remove)$/.exec(row.value.type)) {
        batch.push({
          type: m[2],
          by: row.key,
          id: row.value.content.key,
          key: row.key + '@' + row.seq,
          group: row.value.content.channel || '@',
          role: m[1]
        })
      } else if (m = /^ban\/(add|remove)$/.exec(row.value.type)) {
        ;['key','ip'].forEach(function (key) {
          if (!row.value.content[key]) return
          batch.push({
            type: m[1],
            by: row.key,
            id: row.value.content[key],
            key: row.key + '@' + row.seq,
            group: row.value.content.channel || '@',
            role: 'ban/' + key
          })
        })
      }
    })
    if (batch.length > 0) {
      auth.batch(batch, { skip: true }, next)
    } else next()
  }
}

function noop () {}
