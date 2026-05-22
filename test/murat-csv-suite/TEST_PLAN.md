# Murat CSV Roundtrip Test Plan

## Scope
Validate end-to-end CMS data handling for a Google-style CSV export fixture (`test/safe.csv`) with emphasis on:
- Parse fidelity
- Editor mount/load behavior
- Row movement behavior
- Field editing behavior
- Save/export reconstruction into CSV-compatible locale columns

## Isolation Strategy
- All tests live under `test/murat-csv-suite/`.
- Helpers are colocated and not reused by unrelated suites.
- Fixture input is read from `test/safe.csv` only.

## Coverage Matrix
1. Parse CSV Fixture
- Reads quoted CSV with commas and pipes.
- Confirms header and row count.

2. No-op Parse/Save Roundtrip
- Parse fixture -> mount editor with EN rows -> export rows -> rebuild CSV records.
- Asserts key order stability.
- Asserts non-EN columns remain unchanged when untouched.

3. Row Reordering
- Simulates move button click (`up`/`down`) on rendered rows.
- Asserts exported row order changed as expected.

4. Complex Key Editing
- Edits locale-group fields for `linkWithSpace` and `generalStatementWithLink`.
- Verifies editor export captures expected per-locale structure.
- Rebuilds CSV records and validates locale column mapping.

5. Save Mapping Rules
- EN required fields persist.
- Optional locale fields remain blank if untouched.
- Existing non-target locale values remain preserved for non-translated keys.

6. Split Boundary Constraints
- Exercises split boundary moves for program/general boundaries.
- Verifies guardrails prevent illegal boundary placement.
- Confirms `closingPrayer` remains anchored at the end of Program.

7. Mocked Save/Reload Idempotency
- Saves editor-exported rows into a mocked sheet client.
- Reloads from mocked persisted CSV into a fresh editor instance.
- Confirms immediate no-op re-save produces byte-identical CSV.

8. Negative Validation Paths
- EN-required `linkWithSpace` should block save when EN name/url/imageUrl are missing.
- EN-required `generalStatementWithLink` should block save when EN text/url are missing.
- Asserts save callback is not invoked on validation failure.

9. Parser Torture Inputs
- Parses CSV rows containing embedded commas and escaped quotes.
- Confirms fields survive parsing without column drift.

10. Split Marker Robustness
- Ensures split-marker rows are ignored by CSV reconstruction logic.
- Confirms record cardinality remains stable when split markers appear in editor rows.

11. Inline Insert Row UX
- Verifies inline insert buttons are rendered between editable rows.
- Verifies clicking a specific inline insert gap places the new row at the requested index.
- Confirms insert flow uses the same add-row modal validation path.

12. Modal Key Restriction Rules
- Verifies Program add modal key inventory under `includeAgenda: true`.
- Verifies Program add modal excludes agenda keys under `includeAgenda: false`.
- Verifies General add modal key inventory for allowed keys.
- Verifies repeatable-key caps suppress keys at max limits (`speaker`, `leader`).

## Adversarial Risk Review
Covered risks:
- Silent locale data loss on partial locale edits.
- Save callback firing despite validation failures.
- CSV parser breakage on quoted delimiters.
- Split marker pollution in persisted data.

Residual risks (not yet automated):
- Recovery behavior when fixture has malformed rows with inconsistent quoting across lines.

## Additional Adversarial Coverage (May 21, 2026)
- Seeded random mutation test for move/split/edit operations with invariant checks each step.
- Boundary truncation test verifies text fields are capped at 1000 and textarea fields at 5000 during save.
- Malformed/missing header behavior test documents current positional CSV mapping semantics.
- Rapid duplicate-key swap attempts are rejected for non-repeatable keys.
- Invalid `url` and `imageUrl` edits trigger warning toasts on change.
- UI-level add/delete cycles exercise the modal add flow and delete action flow for repeatable program rows.
- Inline insert-row controls are covered for rendering and exact-position insertion behavior.
- Malformed quoted CSV rows are recovered best-effort without crashing, preserving rows before the bad line.
- Add-modal restriction logic is covered for key inventory, agenda filtering, and repeatable cap suppression.

## Pass Criteria
- Suite passes under Vitest in jsdom environment.
- Reconstructed CSV records preserve row cardinality and key order.
- No regressions in core roundtrip/edit/move behaviors.

## Execution
- Run only this suite:
  - `npx vitest run test/murat-csv-suite/csv-roundtrip.test.mjs`
