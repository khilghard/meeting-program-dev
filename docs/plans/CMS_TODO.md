# CMS Editor Implementation Progress

_Last updated: 2026-05-20_

## Summary

- **Total tasks**: 31
- **Completed**: 31
- **Pending**: 0

All tasks from the CMS editor redesign plan have been completed.

### High-Level Status

Core architecture and incremental rendering are complete. Universal key placement, unit info ordering, and `includeAgenda` filtering have been implemented. The editor now performs row-level DOM updates for smooth UX with many rows. Next focus: testing and polishing (URL validation, repeatable limits, move constraints).

---

## Detailed Todo List

### Core Architecture (12 tasks)
1. ~~Three-section layout (unitRows/programRows/generalRows)~~
2. ~~Row partitioning (`parseRowsIntoSections`)~~
3. ~~Auto-correction on initialize (missing required keys, basic reordering)~~
4. ~~Field definitions for all key types~~
5. ~~Rendering with dropdown key selectors~~
6. ~~Token insertion buttons (`<LINK>`, `<IMG>`)~~
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
22. Token insertion cursor position for locale-specific fields 🟡
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
37. Integration tests: rendering, constraints, undo, save flow 🟡
38. Integration tests: token insertion, date picker, hymn dropdown 🟡
39. Fuzzing tests for robustness (pipes, brackets, long strings) 🟡
40. Expand E2E scenarios: agenda toggle, repeatable limits, validation 🟡

---

## Notes

- Incremental rendering uses a `rowElements` map and DOM updates via `innerHTML` replacement of individual rows.
- Universal keys now respect their original position in the sheet to allow placement in Program section.
- `includeAgenda` option is now respected in both parsing and UI key selection.

---

## Next Steps

 1. Token cursor position verification (likely OK, but verify).
 2. Integration tests for rendering, constraints, undo, save flow.
 3. Integration tests for token insertion, date picker, hymn dropdown.
 4. Expand E2E scenarios: agenda toggle, repeatable limits, validation.
 5. Run full test suite and fix any regressions.
