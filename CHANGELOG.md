# Changelog

## [11.0.1] - 2020-05-20

### Fixed

- Remove flag for moderation ([**@substack**](https://github.com/substack))

## [11.0.0] - 2020-05-20

### Added

- **Breaking:** add moderation based on flags ([#83](https://github.com/cabal-club/cabal-core/issues/83)) ([**@substack**](https://github.com/substack))
- Add support for `mod` and `admin` keys in cabal key uri ([**@cblgh**](https://github.com/cblgh))
- Add `cabal.close()` ([**@hackergrrl**](https://github.com/hackergrrl))

### Removed

- Remove `package-lock.json` ([#84](https://github.com/cabal-club/cabal-core/issues/84)) ([**@substack**](https://github.com/substack))

## [10.0.1] - 2020-05-01

### Changed

- Update `hyperswarm` to `2.13.x` ([#74](https://github.com/cabal-club/cabal-core/issues/74)) ([**@nikolaiwarner**](https://github.com/nikolaiwarner))
- Update `package-lock.json` (here we go again) ([#74](https://github.com/cabal-club/cabal-core/issues/74)) ([**@nikolaiwarner**](https://github.com/nikolaiwarner))

## [10.0.0] - 2020-03-23

### Changed

- **Breaking:** use hyperswarm. This removes `discovery-swarm` for finding peers. Peers before this commit
  will not be able to discover peers from this commit onwards ([#71](https://github.com/cabal-club/cabal-core/issues/71)) ([**@hackergrrl**](https://github.com/hackergrrl))

### Added

- Add `FUNDING.yml` ([**@cblgh**](https://github.com/cblgh))

## [9.0.3] - 2020-04-09

### Removed

- Remove block logic ([**@hackergrrl**](https://github.com/hackergrrl))

## [9.0.2] - 2019-12-11

### Fixed

- Add missing parameter in `isFutureMonotonicTimestamp()` ([#68](https://github.com/cabal-club/cabal-core/issues/68)) ([**@okdistribute**](https://github.com/okdistribute))

## [9.0.1] - 2019-12-04

### Added

- Add `cblgh.org` ([#67](https://github.com/cabal-club/cabal-core/issues/67)) ([**@cblgh**](https://github.com/cblgh))
- Add nick disco server ([#67](https://github.com/cabal-club/cabal-core/issues/67)) ([**@hackergrrl**](https://github.com/hackergrrl))
- Add dns-discovery server: eight45.net ([#67](https://github.com/cabal-club/cabal-core/issues/67)) ([**@hackergrrl**](https://github.com/hackergrrl))

## [9.0.0] - 2019-11-21

### Changed

- **Breaking:** upgrade hypercore (via multifeed) ([#61](https://github.com/cabal-club/cabal-core/issues/61)) ([**@hackergrrl**](https://github.com/hackergrrl))
- Update `kappa-core` to `6.x` ([**@hackergrrl**](https://github.com/hackergrrl))
- Use `hypercore-crypto` to generate test key ([**@hackergrrl**](https://github.com/hackergrrl))

### Added

- Add node 10 ([#61](https://github.com/cabal-club/cabal-core/issues/61)) ([**@hackergrrl**](https://github.com/hackergrrl))

### Fixed

- Wait for view to be ready on mod api ([#61](https://github.com/cabal-club/cabal-core/issues/61)) ([**@hackergrrl**](https://github.com/hackergrrl))
- Encode now-timestamps to avoid overwrites ([#62](https://github.com/cabal-club/cabal-core/issues/62)) ([**@hackergrrl**](https://github.com/hackergrrl))

## [8.0.1] - 2019-10-09

### Fixed

- Fix swarm hashing ([**@hackergrrl**](https://github.com/hackergrrl))

## [8.0.0] - 2019-10-09

### Changed

- **Breaking:** hash cabal key with blake2b ([**@hackergrrl**](https://github.com/hackergrrl))
- Replace `memdb` with `level-mem` ([#57](https://github.com/cabal-club/cabal-core/issues/57)) ([**@vweevers**](https://github.com/vweevers))

## [7.2.1] - 2019-08-27

### Added

- Add moderation view ([#45](https://github.com/cabal-club/cabal-core/issues/45)) ([**@substack**](https://github.com/substack), [**@hackergrrl**](https://github.com/hackergrrl))

### Fixed

- Set max listeners for `Cabal` event emitter ([#50](https://github.com/cabal-club/cabal-core/issues/50)) ([**@cblgh**](https://github.com/cblgh))
- Fix a case where channel membership indexing hangs ([**@hackergrrl**](https://github.com/hackergrrl))
- Let the network test ignore swarm blocking logic (blocking on remote key instead of host and port) ([**@hackergrrl**](https://github.com/hackergrrl))

## [7.2.0] - 2019-08-20

### Added

- Add channel membership view ([#52](https://github.com/cabal-club/cabal-core/issues/52)) ([**@cblgh**](https://github.com/cblgh))

## [7.1.0] - 2019-08-19

### Changed

- Throttle or block misbehaving peers by host and port ([**@hackergrrl**](https://github.com/hackergrrl))

## [7.0.1] - 2019-08-04

### Changed

- Use the same cabal key consistently ([**@hackergrrl**](https://github.com/hackergrrl))

## [7.0.0] - 2019-08-04

### Changed

- **Breaking:** enable multifeed protocol encryption ([**@hackergrrl**](https://github.com/hackergrrl))

### Fixed

- Fix net swarm test by using a real hypercore key ([**@hackergrrl**](https://github.com/hackergrrl))

## [6.0.2] - 2019-08-03

- Remove `package-lock.json` (again) ([**@hackergrrl**](https://github.com/hackergrrl))

## [6.0.1] - 2019-07-31

### Added

- Add `debug` logging under `cabal` for network errors ([**@hackergrrl**](https://github.com/hackergrrl))

## [6.0.0] - 2019-07-03

### Changed

- **Breaking:** update `kappa-core` to `4.x` ([**@hackergrrl**](https://github.com/hackergrrl))
- Update `discovery-swarm` to `6.x` ([**@hackergrrl**](https://github.com/hackergrrl))

### Removed

- Remove `package-lock.json` (again) ([**@hackergrrl**](https://github.com/hackergrrl))

## [5.1.2] - 2019-06-03

### Removed

- Remove `package-lock.json` ([**@hackergrrl**](https://github.com/hackergrrl))

### Fixed

- Set `.maxFeeds` default to `1024` in `cabal.replicate()` ([**@hackergrrl**](https://github.com/hackergrrl))

## [5.1.1] - 2019-05-26

### Changed

- Update `kappa-view-level` to `^2.0.0` ([**@hackergrrl**](https://github.com/hackergrrl))

### Fixed

- Use `base64` for channel view state ([**@hackergrrl**](https://github.com/hackergrrl))

## [5.1.0] - 2019-05-26

### Added

- Add `.db` option to `Cabal` constructor for durable storage ([#41](https://github.com/cabal-club/cabal-core/issues/41)) ([**@substack**](https://github.com/substack))
- Add `cabal.ready(cb)` ([#41](https://github.com/cabal-club/cabal-core/issues/41)) ([**@substack**](https://github.com/substack))

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

- Fix bug where `cabal.leaveChannel()` didn't actually leave the channel ([**@okdistribute**](https://github.com/okdistribute))

## [2.1.0] - 2018-05-29

_This should have been a patch instead of a minor version. Not published to npm._

### Changed

- Change how channels are stored internally ([**@okdistribute**](https://github.com/okdistribute))

## [2.0.1] - 2018-05-27

_This version was published as `cabal-node`. Should have been a minor instead of a patch version._

### Added

- Add message type. Defaults to `'chat/text'` ([**@cblgh**](https://github.com/cblgh))

## [2.0.0] - 2018-05-24

_This version was published as `cabal-node`._

### Changed

- **Breaking:** change on-disk format to improve performance getting channel list ([#2](https://github.com/cabal-club/cabal-core/issues/2)) ([**@okdistribute**](https://github.com/okdistribute))
- Batch multiple transactions ([**@cblgh**](https://github.com/cblgh))

### Added

- Add methods for getting messages and channels ([#1](https://github.com/cabal-club/cabal-core/issues/1)) ([**@cblgh**](https://github.com/cblgh))
- Add watch function for db messages ([**@okdistribute**](https://github.com/okdistribute))

### Fixed

- Don't store timezone offset in database messages ([**@cblgh**](https://github.com/cblgh))
- Return the largest value on conflict ([**@cblgh**](https://github.com/cblgh))
- Fix database keys and channel regex ([**@cblgh**](https://github.com/cblgh))

## [1.0.0] - 2018-05-16

_This version was published as `cabal-node`._

:seedling: Initial release.

[11.0.1]: https://github.com/cabal-club/cabal-core/compare/v11.0.0...v11.0.1

[11.0.0]: https://github.com/cabal-club/cabal-core/compare/v10.0.1...v11.0.0

[10.0.1]: https://github.com/cabal-club/cabal-core/compare/v10.0.0...v10.0.1

[10.0.0]: https://github.com/cabal-club/cabal-core/compare/v9.0.2...v10.0.0

[9.0.3]: https://github.com/cabal-club/cabal-core/compare/v9.0.2...v9.0.3

[9.0.2]: https://github.com/cabal-club/cabal-core/compare/v9.0.1...v9.0.2

[9.0.1]: https://github.com/cabal-club/cabal-core/compare/v9.0.0...v9.0.1

[9.0.0]: https://github.com/cabal-club/cabal-core/compare/v8.0.1...v9.0.0

[8.0.1]: https://github.com/cabal-club/cabal-core/compare/v8.0.0...v8.0.1

[8.0.0]: https://github.com/cabal-club/cabal-core/compare/v7.2.1...v8.0.0

[7.2.1]: https://github.com/cabal-club/cabal-core/compare/v7.2.0...v7.2.1

[7.2.0]: https://github.com/cabal-club/cabal-core/compare/v7.1.0...v7.2.0

[7.1.0]: https://github.com/cabal-club/cabal-core/compare/v7.0.1...v7.1.0

[7.0.1]: https://github.com/cabal-club/cabal-core/compare/v7.0.0...v7.0.1

[7.0.0]: https://github.com/cabal-club/cabal-core/compare/v6.0.2...v7.0.0

[6.0.2]: https://github.com/cabal-club/cabal-core/compare/v6.0.1...v6.0.2

[6.0.1]: https://github.com/cabal-club/cabal-core/compare/v6.0.0...v6.0.1

[6.0.0]: https://github.com/cabal-club/cabal-core/compare/v5.1.2...v6.0.0

[5.1.2]: https://github.com/cabal-club/cabal-core/compare/v5.1.1...v5.1.2

[5.1.1]: https://github.com/cabal-club/cabal-core/compare/v5.1.0...v5.1.1

[5.1.0]: https://github.com/cabal-club/cabal-core/compare/v5.0.1...v5.1.0

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
