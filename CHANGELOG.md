# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.1] - 2026-10-15

### Fixed
- Doom Guy no longer moves/shoots on his own — the engine was sitting in
  Doom's attract-mode demo loop; now autostarts straight into a live game
  (`-warp 1 1`) and correctly re-applies `-respawn`/`-fast`/`-nomonsters`
  before the level loads.
- Monsters now respawn (`-respawn`) instead of thinning out on long-running
  tabs.
- Input no longer sticks on tab blur/visibility change.

### Changed
- Smoother rendering: box-filter downsampling + ordered (Bayer) dithering
  instead of point-sampling.
- Taller display grid (53×60) for more vertical detail.
- Faster builds and loads: dropped `ASYNCIFY` and debug symbols, added
  per-version worker cache-busting.
- New pixel-art icon derived from the classic Doom logo, rendered in
  GitHub's contribution-graph green palette.
- Rewrote README as a proper product page.

### Removed
- All debug/diagnostic scaffolding used during development (on-screen debug
  box, diagnostic C export, verbose relay logging).

## [1.0] - Initial prototype

- First working version: DoomGeneric compiled to WebAssembly, rendered onto
  the GitHub contribution graph via a Chrome extension.
