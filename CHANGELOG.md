# Changelog

## [5.0.1] - 2019-05-21

### Changed

- Update `kappa-core` to `^3.0.1` ([**@hackergrrl**](https://github.com/hackergrrl))
- Update `concat-stream` to `^2.0.0` ([**@hackergrrl**](https://github.com/hackergrrl))
- Update `through2` to `^3.0.1` ([**@hackergrrl**](https://github.com/hackergrrl))

## [5.0.0] - 2019-05-21

### Changed

- **Breaking:** use `discovery-swarm` to shuttle around peer id (`swarm` function now calls back with swarm) ([#39](https://github.com/cabal-club/cabal-core/issues/39)) ([**@hackergrrl**](https://github.com/hackergrrl))
- **Breaking:** add options parameter to `cabal.replicate(opts)` (`.maxFeeds` no longer passed indirectly via the `Cabal` constructor) ([#39](https://github.com/cabal-club/cabal-core/issues/39)) ([**@hackergrrl**](https://github.com/hackergrrl))

### Added

- Expose swarm functionality via `cabal.swarm(cb)` ([#39](https://github.com/cabal-club/cabal-core/issues/39)) ([**@hackergrrl**](https://github.com/hackergrrl))

### Removed

- Remove node 6 from travis ([**@hackergrrl**](https://github.com/hackergrrl))
- Remove `multifeed` dependency ([**@hackergrrl**](https://github.com/hackergrrl))

## [4.0.1] - 2019-05-08

### Added

- Add an option to set the `.maxFeeds` option of `hypercore-protocol` when replicating ([#33](https://github.com/cabal-club/cabal-core/issues/33)) ([**@nikolaiwarner**](https://github.com/nikolaiwarner))

### Fixed

- Allow options for `messages.read()` to take priority over defaults ([#29](https://github.com/cabal-club/cabal-core/issues/29)) ([**@telamon**](https://github.com/telamon))
- Fix error propagation bug in topics view ([#30](https://github.com/cabal-club/cabal-core/issues/30)) ([**@telamon**](https://github.com/telamon))

## [4.0.0] - 2018-11-16

_This release was based partly from `3.0.4` but also merged in changes from `3.1.0`. Check git history for more fine grained details._

### Changed

- **Breaking:** renamed `cabal.protocolVersion` to `cabal.databaseVersion` ([#28](https://github.com/cabal-club/cabal-core/issues/28)) ([**@cblgh**](https://github.com/cblgh))
- **Breaking:** renamed `cabal.getProtocolVersion()` to `cabal.getDatabaseVersion()` ([#28](https://github.com/cabal-club/cabal-core/issues/28)) ([**@cblgh**](https://github.com/cblgh))

## [3.0.4] - 2018-11-11

_This version was published to npm after `3.1.0` and is almost identical. We therefore only list the changes for `3.0.4` and omit the `3.1.0` version._

### Added

- Add view for `topics` ([#24](https://github.com/cabal-club/cabal-core/issues/24)) ([**@nikolaiwarner**](https://github.com/nikolaiwarner))
- Add `cabal.publishChannelTopic()` ([#24](https://github.com/cabal-club/cabal-core/issues/24)) ([**@nikolaiwarner**](https://github.com/nikolaiwarner))

### Removed

- Remove unused requires ([#25](https://github.com/cabal-club/cabal-core/issues/25)) ([**@cblgh**](https://github.com/cblgh))

### Fixed

- Fix reliable key exchange ([#27](https://github.com/cabal-club/cabal-core/issues/27)) ([**@hackergrrl**](https://github.com/hackergrrl))

## [3.0.3] - 2018-11-06

### Added

- Add `cabal.protocolVersion` as `1.0.0` ([#25](https://github.com/cabal-club/cabal-core/issues/25)) ([**@cblgh**](https://github.com/cblgh))
- Add `cabal.getProtocolVersion()` ([#25](https://github.com/cabal-club/cabal-core/issues/25)) ([**@cblgh**](https://github.com/cblgh))

### Removed

- Remove unused `crypto` dependency ([#21](https://github.com/cabal-club/cabal-core/issues/21)) ([**@lachenmayer**](https://github.com/lachenmayer))

### Fixed

- Reorder function calls in `cabal.publishNick()` ([#25](https://github.com/cabal-club/cabal-core/issues/25)) ([**@cblgh**](https://github.com/cblgh))

## [3.0.2] - 2018-09-05

_There were several tags in between version `3.0.0` and `2.3.0` where [**@hackergrrl**](https://github.com/hackergrrl) were developing on a separate branch while things were happening on master. Versions `2.3.1`, `3.0.0` and `3.0.1` never got published to npm. Major API rewrite._

### Changed

- Rename module from `cabal-node` to `cabal-core` ([**@hackergrrl**](https://github.com/hackergrrl))
- Base storage on `kappa` instead of `hyperdb` ([**@hackergrrl**](https://github.com/hackergrrl))

### Added

- Add `cabal.getUser()` ([**@hackergrrl**](https://github.com/hackergrrl))
- Add `cabal.publish()` ([**@hackergrrl**](https://github.com/hackergrrl))
- Add `cabal.publishNick()` ([**@hackergrrl**](https://github.com/hackergrrl))
- Add `cabal.getLocalKey()` ([**@hackergrrl**](https://github.com/hackergrrl))
- Add views for `channels`, `messages` and `users` ([**@hackergrrl**](https://github.com/hackergrrl))

### Removed

- **Breaking:** remove `cabal.onconnection()` ([**@hackergrrl**](https://github.com/hackergrrl))
- **Breaking:** remove `cabal.watch()` ([**@hackergrrl**](https://github.com/hackergrrl))
- **Breaking:** remove `cabal.getMessages()` ([**@hackergrrl**](https://github.com/hackergrrl))
- **Breaking:** remove `cabal.getChannels()` ([**@hackergrrl**](https://github.com/hackergrrl))
- **Breaking:** remove `cabal.joinChannel()` ([**@hackergrrl**](https://github.com/hackergrrl))
- **Breaking:** remove `cabal.leaveChannel()` ([**@hackergrrl**](https://github.com/hackergrrl))
- **Breaking:** remove `cabal.createReadStream()` ([**@hackergrrl**](https://github.com/hackergrrl))
- **Breaking:** remove `cabal.metadata()` ([**@hackergrrl**](https://github.com/hackergrrl))
- **Breaking:** remove `cabal.message()` ([**@hackergrrl**](https://github.com/hackergrrl))

## [2.3.0] - 2018-08-13

_This version was published both as `cabal-node` and `cabal-core`._

### Changed

- Sort the channel list alphabetically ([#8](https://github.com/cabal-club/cabal-core/issues/8)) ([**@cinnamon-bun**](https://github.com/cinnamon-bun))

## [2.2.0] - 2018-06-23

_This version was published as `cabal-node`. Should have been a patch instead of a minor version._

### Fixed

- Update `hyperdb` to `3.1.2` to fix a connection issue ([**@cblgh**](https://github.com/cblgh))

## [2.1.1] - 2018-05-29

_This version was published as `cabal-node`._

### Fixed

- Fix bug where `cabal.leaveChannel()` didn't actually leave the channel ([**@karissa**](https://github.com/karissa))

## [2.1.0] - 2018-05-29

_This should have been a patch instead of a minor version. Not published to npm._

### Changed

- Change how channels are stored internally ([**@karissa**](https://github.com/karissa))

## [2.0.1] - 2018-05-27

_This version was published as `cabal-node`. Should have been a minor instead of a patch version._

### Added

- Add message type. Defaults to `'chat/text'` ([**@cblgh**](https://github.com/cblgh))

## [2.0.0] - 2018-05-24

_This version was published as `cabal-node`._

### Changed

- **Breaking:** change on-disk format to improve performance getting channel list ([#2](https://github.com/cabal-club/cabal-core/issues/2)) ([**@karissa**](https://github.com/karissa))
- Batch multiple transactions ([**@cblgh**](https://github.com/cblgh))

### Added

- Add methods for getting messages and channels ([#1](https://github.com/cabal-club/cabal-core/issues/1)) ([**@cblgh**](https://github.com/cblgh))
- Add watch function for db messages ([**@karissa**](https://github.com/karissa))

### Fixed

- Don't store timezone offset in database messages ([**@cblgh**](https://github.com/cblgh))
- Return the largest value on conflict ([**@cblgh**](https://github.com/cblgh))
- Fix database keys and channel regex ([**@cblgh**](https://github.com/cblgh))

## [1.0.0] - 2018-05-16

_This version was published as `cabal-node`._

:seedling: Initial release.

[5.0.1]: https://github.com/cabal-club/cabal-core/compare/v5.0.0...v5.0.1

[5.0.0]: https://github.com/cabal-club/cabal-core/compare/v4.0.1...v5.0.0

[4.0.1]: https://github.com/cabal-club/cabal-core/compare/v4.0.0...v4.0.1

[4.0.0]: https://github.com/cabal-club/cabal-core/compare/v3.0.4...v4.0.0

[3.0.4]: https://github.com/cabal-club/cabal-core/compare/v3.0.3...v3.0.4

[3.0.3]: https://github.com/cabal-club/cabal-core/compare/v3.0.2...v3.0.3

[3.0.2]: https://github.com/cabal-club/cabal-core/compare/v2.3.0...v3.0.2

[2.3.0]: https://github.com/cabal-club/cabal-core/compare/v2.2.0...v2.3.0

[2.2.0]: https://github.com/cabal-club/cabal-core/compare/v2.1.1...v2.2.0

[2.1.1]: https://github.com/cabal-club/cabal-core/compare/v2.1.0...v2.1.1

[2.1.0]: https://github.com/cabal-club/cabal-core/compare/v2.0.1...v2.1.0

[2.0.1]: https://github.com/cabal-club/cabal-core/compare/v2.0.0...v2.0.1

[2.0.0]: https://github.com/cabal-club/cabal-core/compare/v1.0.0...v2.0.0

[1.0.0]: https://github.com/cabal-club/cabal-core/releases/tag/v1.0.0
