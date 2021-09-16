# cabal-core

Core database, replication, swarming, and chat APIs for cabal.

## Usage

```
npm install cabal-core
```

## API

> var Cabal = require('cabal-core')

### var cabal = Cabal([storage][, key][, opts])

Create a cabal p2p database using storage `storage`, which must be either a
string (filepath to directory on disk) or an instance of
[random-access-storage](https://github.com/random-access-storage/).

`key` is a cabal key, as a string or Buffer.

If this is a new cabal, `key` can be omitted and will be generated.

You can pass `opts.db` as a levelup or leveldown instance to use persistent
storage for indexing instead of using memory. For example:

```js
var level = require('level')
var cabal = Cabal(storage, key, { db: level('/tmp/bot.db') })
```

Other `opts` include:

- `opts.preferredPort`: controls the port cabal listens on. defaults to port `13331`.
- `opts.modKeys`: an array of keys to be considered moderators from this user's perspective.
- `opts.adminKeys`: an array of keys to be considered administrators from this user's perspective.

### cabal.getLocalKey(cb)

Returns the local user's key (as a hex string).

### var ds = cabal.replicate(isInitiator[, opts])

Creates a new, live replication stream. This duplex stream can be piped into any
transport expressed as a node stream (tcp, websockets, udp, utp, etc).

Ensure that `isInitiator` to `true` to one side, and `false` on the other. This is necessary for setting up the encryption mechanism.

`opts` are passed down into the underlying `hypercore` replication.

### cabal.ready(cb)

Calls `cb()` when the underlying indexes are caught up.

### cabal.close(cb)

Calls `cb()` when the cabal and its resources have been closed. This also leaves the swarm, if joined.

### cabal.getMessage(key, cb)

Read a message from `key`, a string of `feedKey@seq` or an object of
`{ key, seq }` as `cb(err, node)` from the underlying hypercore.

### Channels

#### cabal.channels.get(function (error, channels) {})

Retrieve a list of all channel names that exist in this cabal.

#### cabal.channels.events.on('add', function (channel) {})

Emitted when a new channel is added to the cabal.

### Messages

#### var rs = cabal.messages.read(channel, opts)

Returns a readable stream of messages (most recent first) from a channel.

Pass `opts.limit` to set a maximum number of messages to read.

#### cabal.messages.events.on('message', fn)

Calls `fn` with every new message that arrives, regardless of channel.

#### cabal.messages.events.on(channel, fn)

Calls `fn` with every new message that arrives in `channel`.

### Network

> var swarm = require('cabal-core/swarm')

#### cabal.swarm(cb)

Joins the P2P swarm for a cabal. This seeks out peers who are also part of this cabal by various means (internet, local network), connects to them, and replicates cabal messages between them.

The returned object is an instance of [discovery-swarm](https://github.com/mafintosh/discovery-swarm).

#### cabal.on('peer-added', function (key) {})

Emitted when you connect to a peer. `key` is a hex string of their public key.

#### cabal.on('peer-dropped', function (key) {})

Emitted when you lose a connection to a peer. `key` is a hex string of their
public key.

## Moderation

Cabal has a _subjective moderation system_.

The three roles are "admin", "moderator", and "ban/key".

Any admin/mod/ban operation can be per-channel, or cabal-wide (the `@` group).

Every user sees themselves as an administrator across the entire cabal. This
means they can grant admin or moderator powers to anyone, and ban anyone, but
only they will see its affects on their own computer. That is, until someone
_adds_ them as an administrator or moderation from _their_ perspective.

A cabal can be instantiated with a _moderation key_. This is an additional key
to have your local node consider a user (the user whose key matches the
moderation key) as a cabal-wide administrator (in addition to yourself).

This means that if a group of people all specify the same _moderation key_,
they will collectively see the same set of administrators, moderators, and
banned users.

#### cabal.moderation.listByFlag({ channel, flag })

Return a readable object stream of records for `channel` that for each user with
`flag` set. Flags used by cabal-core include: "hide", "mute", "block", "admin",
and "mod".

Each `row` object in the output stream has:

- `row.id` - string user key
- `row.flags` - array of string flags
- `row.key` - string of `key@seq` referring to log records

Optionally collect results into `cb(err, rows)`.

#### cabal.moderation.list(cb)

Return a readable object stream of records for all moderation actions across all
channels.

Each `row` object in the output stream has:

- `row.id` - string key which is the target of this moderation operation
- `row.flags` - array of string flags set for this user
- `row.channel` - string channel name this operation applies to
- `row.key` - key of log record (not defined for self-admin and admins added by modkey)

Optionally collect results into `cb(err, rows)`.

#### cabal.moderation.listBlocks(channel, cb)

Return a readable object stream of records for the blocks in `channel`.

The objects in the output have the same form as `listByFlag()`.

Optionally collect results into `cb(err, rows)`.

#### cabal.moderation.listHides(channel, cb)

Return a readable object stream of records for the hides in `channel`.

The objects in the output have the same form as `listByFlag()`.

Optionally collect results into `cb(err, rows)`.

#### cabal.moderation.listMutes(channel, cb)

Return a readable object stream of records for the mutes in `channel`.

The objects in the output have the same form as `listByFlag()`.

Optionally collect results into `cb(err, rows)`.

#### cabal.moderation.listModerationBy(key, cb)

Return a readable object stream of moderation documents authored by `key`.

Each `row` object in the output is a document used for adding, removing, and
setting flags.

- `row.type` - `"flags/add"`, `"flags/set"`, or `"flags/remove"`
- `row.content.id` - string key target of this moderation operation
- `row.content.flags` - array of string flags for this operation
- `row.content.reason` - array of string flags for this operation
- `row.content.channel` - string channel name this operation applies to
- `row.timestamp` - number, when this action was made in milliseconds since 1970

Optionally collect results into `cb(err, rows)`.

#### cabal.moderation.getFlags({ id, channel }, cb)

Get a list of flags set for the user identified by `id` in `channel` as
`cb(err, flags)`.

#### cabal.moderation.setFlags({ id, channel, flags }, cb)

Set an array of `flags` for `id` in `channel`.

#### cabal.moderation.addFlags({ id, channel, flags }, cb)

Add an array of `flags` to the existing set of flags for `id` in `channel`.

#### cabal.moderation.removeFlags({ id, channel, flags }, cb)

Remove an array of `flags` from the existing set of flags for `id` in `channel`.

#### cabal.moderation.events.on('update', function (update) {})

This event happens when a user's flags change with `update`, the log record
responsible for the state change.

#### cabal.moderation.events.on('skip', function (skip) {})

This event happens when a moderation update was skipped with `skip`, the log
record responsible for the state change.

### Private Messages

#### cabal.publishPrivateMessage(text, recipientKey, cb)

Write the private message string `text` to be encrypted so that only
`recipientKey` (the public key of its recipient) can read it.

A `timestamp` field is set automatically with the current local system time.

#### cabal.privateMessages.list(cb)

Returns a list of strings of all users' public keys that have sent a PM to you,
or who you have sent a PM to.

#### var rs = cabal.privateMessages.read(channel, opts)

Returns a readable stream of messages (most recent first) from a channel.

Pass `opts.limit` to set a maximum number of messages to read.

#### cabal.privateMessages.events.on('message', fn)

Calls `fn` with every new private message that arrives.

#### cabal.privateMessages.events.on(publicKey, fn)

Calls `fn` with every new message that arrives to or from `publicKey`.

### Publishing

#### cabal.publish(message, opts, cb)

Publish `message` to your feed. `message` must have a `type` field set. If not,
it defaults to `chat/text`. In general, a message is formatted as

```js
{
  type: 'chat/text',
  content: {
    text: 'hello world',
    channel: 'cabal-dev'
  }
}
```

A `timestamp` field is set automatically with the current system time.

`type` is an unrestricted field: you can make up new message types and clients
will happily ignore them until someone implements support for them. Well
documented types include

#### chat/text

```js
{
  type: 'chat/text',
  content: {
    text: 'whatever the user wants to say',
    channel: 'some channel name. if it didnt exist before, it does now!'
  }
}
```

## License

AGPLv3
