# Changelog

## [Unreleased]

### Added

- Live statistics that update automatically as ping results stream in.
- Median and p95 of the average latency alongside the existing means.
- Manual refresh button and CSV/JSON export of the per-location data.
- Friendly status messages when the page has no results yet or isn't a ping.sx page.

### Changed

- Table columns are now matched by header text instead of fixed positions.
- The content script is injected on demand only, removing the duplicate manifest injection.

### Fixed

- The Top 5 list now sorts and labels by average latency consistently.
- Empty result sets no longer render `NaN` in every field.
