var mauth = require('materialized-group-auth')
var sub = require('subleveldown')
var EventEmitter = require('events').EventEmitter
var { Readable, Transform } = require('readable-stream')
var once = require('once')
var pump = require('pump')
var readonly = require('read-only-stream')

module.exports = function (cabal, db) {
  var events = new EventEmitter()
  var modKey = cabal.modKeys[0]
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
      listBans: function (core, channel) {
        var out = new Transform({
          objectMode: true,
          transform: function (row, enc, next) {
            if (row && row.role === 'ban/key') {
              next(null, { key: row.id })
            } else if (row && row.role === 'ban/ip') {
              next(null, { ip: row.id })
            } else next()
          }
        })

        this.ready(function () {
          pump(auth.getMembers(channel), out)
        })

        return readonly(out)
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
      }
    }
  }
  function map (rows, next) {
    var batch = []
    rows.forEach(function (row) {
      if (!row.value || !row.value.content) return
      // todo: add skips for local ip
      if (row.value.type === 'mod/remove'
      && row.value.content.key === localKey) {
        // skip removal of localKey as admin
      } else if (row.value.type === 'ban/add'
      && row.value.content.key === localKey) {
        // skip banning of localKey
      } else if (/^mod\/(add|remove)$/.test(row.value.type)) {
        batch.push({
          type: row.value.type.replace(/^mod\//,''),
          by: row.key,
          id: row.value.content.key,
          group: row.value.content.channel || '@',
          role: row.value.content.role
        })
      } else if (/^ban\/(add|remove)$/.test(row.value.type)) {
        ;['key','ip'].forEach(function (key) {
          if (!row.value.content[key]) return
          batch.push({
            type: row.value.type.replace(/^ban\//,''),
            by: row.key,
            id: row.value.content[key],
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
