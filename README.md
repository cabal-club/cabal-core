# cabal-core

Core database, replication, swarming, and chat APIs for cabal.

## Usage

    npm install cabal-core

## API

> var Cabal = require('cabal-node')

### var cabal = Cabal([storage][, uriString][, opts])

Create a cabal p2p database using storage `storage`, which must be either a
string (filepath to directory on disk) or an instance of
[random-access-storage](https://github.com/random-access-storage/).

`uriString` is a cabal URI string, of the form `cabal://<hexkey>[?param1=value1&param2=value2`. A hexidecimal key on its own will also be understood.

If this is a new cabal, `key` can be omitted and will be generated.

You can pass `opts.db` as a levelup or leveldown instance to use persistent
storage for indexing instead of using memory. For example:

``` js
var level = require('level')
var cabal = Cabal(storage, key, { db: level('/tmp/bot.db') })
```

### cabal.getLocalKey(cb)

Returns the local user's key (as a hex string).

### var ds = cabal.replicate(isInitiator[, opts])

Creates a new, live replication stream. This duplex stream can be piped into any
transport expressed as a node stream (tcp, websockets, udp, utp, etc).

Ensure that `isInitiator` to `true` to one side, and `false` on the other. This is necessary for setting up the encryption mechanism.

`opts` are passed down into the underlying `hypercore` replication.

### cabal.ready(cb)

Call `cb()` when the underlying indexes are caught up.

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

Cabal has a *subjective moderation system*.

The three roles are "admin", "moderator", and "ban/key".

Any admin/mod/ban operation can be per-channel, or cabal-wide (the `@` group).

Every user sees themselves as an administrator across the entire cabal. This
means they can grant admin or moderator powers to anyone, and ban anyone, but
only they will see its affects on their own computer.

A cabal can be instantiated with a *moderation key*. This is an additional key
to locally consider as a cabal-wide administrator (in addition to yourself).

This means that if a group of people all specify the same *moderation key*,
they will collectively see the same set of administrators, moderators, and
banned users.

#### var rs = cabal.moderation.listBans(channel)

Return a readable objectMode stream of bans for `channel`.

Each ban is an object with:

* `ban.type` - `'key'` or `'ip'`
* `ban.id` - the target of the ban: a key or ip address string
* `ban.key` - the `'feed@seq'` string you can pass to `banInfo()`

To list cabal-wide bans use the special channel `@`.

#### cabal.moderation.isBanned({ ip, key, channel }, cb)

Determine whether a user identified by `ip` and/or `key` is banned on `channel`
or cabal-wide as `cb(err, banned)` for a boolean `banned`. If `channel` is
omitted, only check cabal-wide.

### cabal.ban(key, [opts], [cb])

Bans a specific user, by their public key.

Valid `opts` include:

- `channel` (string, default="@") - the channel to ban the user from. `"@"` is cabal-wide.
- `reason` (string, default="") - reason for the banishment.

#### cabal.moderation.banInfo('feed@seq', cb)

Load the original ban message as `cb(err, msg)`.

You can check `msg.content` for things like a `reason` field or you can check
`msg.timestamp`.

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

#### mod/{add,remove}

```js
{
  type: '"mod/add" or "mod/remove"',
  content: {
    key: 'hex string key of the user to add/remove as mod',
    channel: 'channel name as a string or "@" for cabal-wide'
    role: '"admin", "mod", or a custom role string'
  }
}
```

## License

AGPLv3
