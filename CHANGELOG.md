# Changelog

## [2.2.0] - 2018-06-23

_This should have been a patch instead of a minor version._

### Fixed

- Update `hyperdb` to `3.1.2` to fix a connection issue ([**@cblgh**](https://github.com/cblgh))

## [2.1.1] - 2018-05-29

### Fixed

- Fix bug where `cabal.leaveChannel()` didn't actually leave the channel ([**@karissa**](https://github.com/karissa))

## [2.1.0] - 2018-05-29

_This should have been a patch instead of a minor version._

### Changed

- Change how channels are stored internally ([**@karissa**](https://github.com/karissa))

## [2.0.1] - 2018-05-27

_This should have been a minor instead of a patch version._

### Added

- Add message type. Defaults to `'chat/text'` ([**@cblgh**](https://github.com/cblgh))

## [2.0.0] - 2018-05-24

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

:seedling: Initial release.

[2.2.0]: https://github.com/cabal-club/cabal-core/compare/v2.1.1...v2.2.0

[2.1.1]: https://github.com/cabal-club/cabal-core/compare/v2.1.0...v2.1.1

[2.1.0]: https://github.com/cabal-club/cabal-core/compare/v2.0.1...v2.1.0

[2.0.1]: https://github.com/cabal-club/cabal-core/compare/v2.0.0...v2.0.1

[2.0.0]: https://github.com/cabal-club/cabal-core/compare/v1.0.0...v2.0.0

[1.0.0]: https://github.com/cabal-club/cabal-core/releases/tag/v1.0.0
