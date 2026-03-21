---
status: awaiting_human_verify
trigger: "On mobile, typing in the search bar does not show autocomplete dropdown results. Only pressing Enter triggers search results via the overlay. The autocomplete should show live results as the user types."
created: 2026-03-22T00:00:00Z
updated: 2026-03-22T00:05:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED - Three compounding bugs prevent autocomplete on mobile
test: Code review complete, root cause identified
expecting: Fix applied below
next_action: Apply fix to index.html

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: As user types 2+ chars in search bar, autocomplete dropdown should appear below with movie/show results (posters, titles, ratings) updating live
actual: No dropdown appears while typing. Results only show when pressing Enter (which opens the full search overlay).
errors: Unknown - tested on mobile
reproduction: On mobile browser, tap search bar, type a movie name (e.g. "Inception"). No dropdown appears. Press Enter - results show in overlay.
started: May have never worked on mobile, or broke during Phase changes

## Eliminated
<!-- APPEND only - prevents re-investigating -->

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-03-22T00:01:00Z
  checked: focus event handler (index.html line 1347-1352)
  found: focus handler unconditionally calls `autocompleteDropdown?.classList.remove("active")` on EVERY focus event, regardless of whether there is already typed text
  implication: On mobile, keyboard popup triggers blur then re-focus. The re-focus kills the dropdown even if showAutocomplete already showed results.

- timestamp: 2026-03-22T00:01:30Z
  checked: blur event handler (index.html line 1391-1398)
  found: blur delay is 200ms. Mobile touch-to-tap pipeline is slower. But the bigger issue is the re-focus on keyboard popup kills the dropdown via the focus handler.
  implication: 200ms is tight for mobile; raising to 300ms provides safer margin.

- timestamp: 2026-03-22T00:02:00Z
  checked: showAutocomplete click handlers (index.html line 1929-1937)
  found: autocomplete items only attach `click` event listeners. On mobile, a touch on an item fires: touchstart -> touchend -> blur (on input) -> 200ms timer -> `.active` removed -> click event fires on item (but dropdown is already gone)
  implication: Items can never be tapped on mobile because the blur timeout removes `.active` before the click event fires. Fix: use `touchstart` (with `preventDefault`) in addition to `click`, or use `mousedown` + `click` pattern, or increase delay past the click registration time.

- timestamp: 2026-03-22T00:02:30Z
  checked: HTML structure (index.html line 287-318)
  found: autocomplete-dropdown is a sibling of the input, both inside .search-pill which has `position: relative`. z-index 1000 is set in index_lumi.css.
  implication: Positioning and z-index are fine. The bugs are purely in JavaScript event handling.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: Three compounding bugs in index.html event handlers: (1) The `focus` event handler unconditionally removes `.active` from the autocomplete dropdown even when text is already typed - this kills the dropdown when mobile keyboard popup causes a blur/re-focus cycle. (2) The 200ms blur delay is not long enough for mobile's touch-to-click pipeline, so blur hides the dropdown before touch events can register as clicks on autocomplete items. (3) Autocomplete items only listen for `click` events, not `touchstart`/`touchend`, so they cannot be tapped before blur fires.
fix: (1) Guard the focus handler to only remove autocomplete if input is empty. (2) Increase blur delay from 200ms to 300ms. (3) Add `touchstart` handler to autocomplete items with `preventDefault()` to fire before blur removes the dropdown.
verification: Self-verified by code review. Fix applied to index.html. Three bugs identified and patched: focus handler conditionalized, blur delay increased to 300ms, touchstart handler added to autocomplete items. Awaiting human verification on real mobile device.
files_changed: [index.html]
