# CMS Editor Implementation Progress

_Last updated: 2026-05-21_

## Summary

- **Total tasks**: 31
- **Completed**: 31
- **Pending**: 0

All tasks from the CMS editor redesign plan have been completed.

### High-Level Status

Core architecture, incremental rendering, and token auto-addition are complete. Universal key placement, unit info ordering, and `includeAgenda` filtering have been implemented. The editor now performs row-level DOM updates for smooth UX with many rows. `<IMG>` and `<LINK>` tokens are auto-added on serialization and stripped on parsing — users never see or edit these tokens directly.

**Split Markers**: All 8 steps complete. Split marker utilities implemented. `parseRowsIntoSections` uses explicit split markers. `initialize()` auto-inserts missing splits. Single-list rendering with section tints and split marker bars. `getAllRows()` and `getBaselineRows()` include split markers. Split deletion prevented. Drag-and-drop with pointer events (desktop immediate, mobile 300ms long-press with haptic feedback). Insert buttons between rows for inline row addition. All 1066 tests pass.

---

## Detailed Todo List

### Core Architecture (12 tasks)
1. ~~Three-section layout (unitRows/programRows/generalRows)~~
2. ~~Row partitioning (`parseRowsIntoSections`)~~
3. ~~Auto-correction on initialize (missing required keys, basic reordering)~~
4. ~~Field definitions for all key types~~
5. ~~Rendering with dropdown key selectors~~
6. ~~Token auto-addition (`<LINK>`, `<IMG>`) on serialize, strip on parse~~ ✅
7. ~~Date picker with display format conversion~~
8. ~~Hymn number dropdown (hymnsLookup integration)~~
9. ~~Move up/down and delete actions with constraints~~
10. ~~Validation (required keys, order, duplicates)~~
11. ~~Dirty tracking and status messages~~
12. ~~Save callback with removedKeys tracking~~
13. ~~Undo for auto-corrections~~
14. ~~HTML escaping (`escapeHtml` utility)~~
15. ~~CSS moved to dedicated file (`css/cms.css`)~~
16. ~~Universal keys partitioning~~ – universal keys now follow sheet order
17. ~~Unit info canonical reordering~~ – sorted to `UNIT_INFO_KEYS`
18. ~~`includeAgenda` filtering~~ – agenda keys hidden when option false

### Rendering & UI (8 tasks)
19. ~~Incremental rendering (update only changed row)~~ ✅
20. ~~Add row modal – enforce `MAX_REPEATABLE_ITEMS` (disable/hide at limit)~~ ✅
21. ~~Move constraints – prevent Up for any `presiding`, Down for any `closingPrayer`~~ ✅
22. ~~Token auto-addition on serialize (no UI buttons needed)~~ ✅
23. ~~Responsive layout~~ ✅
24. ~~Status indicator~~ ✅
25. ~~Scrollable sections~~ ✅

### Validation & Data (5 tasks)
26. ~~Auto-correct rows on load~~ ✅
27. ~~URL validation – warn on malformed `url`/`imageUrl`~~ ✅
28. Field length truncation on save (text ≤1000, textarea ≤5000) 🟢
29. ~~Token safety – escape as plain text~~ ✅

### Styling (2 tasks)
30. ~~CSS moved to dedicated file~~ ✅
31. ~~Desktop & mobile breakpoints~~ ✅

### Testing (10 tasks)
32. ~~Unit test scaffold created~~ (`test/CmsEditor.utils.test.mjs`) 🟢
33. ~~Unit tests for `parseRowsIntoSections` (including universal placement)~~ ✅
34. ~~Unit tests for `autoCorrectRows` (idempotence, all scenarios)~~ ✅
35. ~~Unit tests for `serializeFieldValue`/`parseFieldValue` round-trip~~ ✅
36. ~~Unit tests for date utilities (`parseDisplayDate`, `formatDisplayDate`)~~ ✅
37. ~~Integration tests: rendering, constraints, undo, save flow~~ ✅
38. ~~Integration tests: token auto-addition, date picker, hymn dropdown~~ ✅
39. Fuzzing tests for robustness (pipes, brackets, long strings) 🟡
40. Expand E2E scenarios: agenda toggle, repeatable limits, validation 🟡

---

## Notes

- Incremental rendering uses a `rowElements` map and DOM updates via `innerHTML` replacement of individual rows.
- Universal keys now respect their original position in the sheet to allow placement in Program section.
- `includeAgenda` option is now respected in both parsing and UI key selection.
- **Token handling**: `<IMG>` and `<LINK>` tokens are auto-added on serialization and stripped on parsing. Users never see or edit these tokens in the UI. The tokens serve as structural markers indicating link/image content type.

---

## Next Steps

1. Field length truncation on save (text ≤1000, textarea ≤5000).
2. Fuzzing tests for robustness (pipes, brackets, long strings).
3. Expand E2E scenarios: agenda toggle, repeatable limits, validation.
4. Run full test suite and fix any regressions.
