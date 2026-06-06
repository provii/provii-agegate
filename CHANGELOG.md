# Changelog

## [v0.1.3]

### Changed
- Version-alignment release: package metadata set to 0.1.3 to match the published CDN tag. No SDK bundle changes from v0.1.2 (byte-identical bundle, same SRI).

## [v0.1.2]

### Fixed
- Auto-retry transient challenge-create failures (HTTP 5xx and network errors) with a short backoff before failing the gate, so a verifier cold-start blip no longer surfaces as a hard failure to the end user (#4).
- Harden redeem retries and fix failure-mode cache keying so a cached "verifier unavailable" policy decision is scoped per origin rather than reused across origins (#5).

## [v0.1.1]

### Added
- Wire the server-side failure-mode policy (block / allow / defer) into the SDK so an origin's managed unavailable-behaviour is honoured client-side.

### Fixed
- Styler preview wiring for cosmetic and structural controls.

## [v0.1.0] (unreleased)

Initial release of provii-agegate, the embeddable age gate web component and JS SDK.
