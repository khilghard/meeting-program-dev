# context-mode — MANDATORY routing rules

You have context-mode MCP tools available. These rules are NOT optional — they protect your context window from flooding. A single unrouted command can dump 56 KB into context and waste the entire session.

## BLOCKED commands — do NOT attempt these

### curl / wget — BLOCKED
Any shell command containing `curl` or `wget` will be intercepted and blocked by the context-mode plugin. Do NOT retry.
Instead use:
- `context-mode_ctx_fetch_and_index(url, source)` to fetch and index web pages
- `context-mode_ctx_execute(language: "javascript", code: "const r = await fetch(...)")` to run HTTP calls in sandbox

### Inline HTTP — BLOCKED
Any shell command containing `fetch('http`, `requests.get(`, `requests.post(`, `http.get(`, or `http.request(` will be intercepted and blocked. Do NOT retry with shell.
Instead use:
- `context-mode_ctx_execute(language, code)` to run HTTP calls in sandbox — only stdout enters context

### Direct web fetching — BLOCKED
Do NOT use any direct URL fetching tool. Use the sandbox equivalent.
Instead use:
- `context-mode_ctx_fetch_and_index(url, source)` then `context-mode_ctx_search(queries)` to query the indexed content

## REDIRECTED tools — use sandbox equivalents

### Shell (>20 lines output)
Shell is ONLY for: `git`, `mkdir`, `rm`, `mv`, `cd`, `ls`, `npm install`, `pip install`, and other short-output commands.
For everything else, use:
- `context-mode_ctx_batch_execute(commands, queries)` — run multiple commands + search in ONE call
- `context-mode_ctx_execute(language: "shell", code: "...")` — run in sandbox, only stdout enters context

### File reading (for analysis)
If you are reading a file to **edit** it → reading is correct (edit needs content in context).
If you are reading to **analyze, explore, or summarize** → use `context-mode_ctx_execute_file(path, language, code)` instead. Only your printed summary enters context.

### grep / search (large results)
Search results can flood context. Use `context-mode_ctx_execute(language: "shell", code: "grep ...")` to run searches in sandbox. Only your printed summary enters context.

## Tool selection hierarchy

1. **GATHER**: `context-mode_ctx_batch_execute(commands, queries)` — Primary tool. Runs all commands, auto-indexes output, returns search results. ONE call replaces 30+ individual calls.
2. **FOLLOW-UP**: `context-mode_ctx_search(queries: ["q1", "q2", ...])` — Query indexed content. Pass ALL questions as array in ONE call.
3. **PROCESSING**: `context-mode_ctx_execute(language, code)` | `context-mode_ctx_execute_file(path, language, code)` — Sandbox execution. Only stdout enters context.
4. **WEB**: `context-mode_ctx_fetch_and_index(url, source)` then `context-mode_ctx_search(queries)` — Fetch, chunk, index, query. Raw HTML never enters context.
5. **INDEX**: `context-mode_ctx_index(content, source)` — Store content in FTS5 knowledge base for later search.

## Output constraints

- Keep responses under 500 words.
- Write artifacts (code, configs, PRDs) to FILES — never return them as inline text. Return only: file path + 1-line description.
- When indexing content, use descriptive source labels so others can `search(source: "label")` later.

## ctx commands

| Command | Action |
|---------|--------|
| `ctx stats` | Call the `stats` MCP tool and display the full output verbatim |
| `ctx doctor` | Call the `doctor` MCP tool, run the returned shell command, display as checklist |
| `ctx upgrade` | Call the `upgrade` MCP tool, run the returned shell command, display as checklist |

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Meeting Program CMS - Key & Language Findings

This section captures critical decisions about the CMS editor to avoid repeating discovery work.

### Data Model
- Rows: `{ key: string, value: string }`
- `value` is a pipe‑delimited string encoding one or more fields.
- The sheet stores values per locale (EN, ES, FR, SWA). The CMS editor shows all four language fields simultaneously using pill indicators; no language dropdown is used. The user edits the content for all languages at once.

### Languages (Locales)
Supported locales: `en`, `es`, `fr`, `swa`.
All keys can have values in any language. The editor displays all language fields together.

### Key Field Definitions

| Key | Fields (name: type) | Notes |
|-----|---------------------|-------|
| unitName | `text: text` | Ward/Branch name |
| stakeName | `text: text` | Stake/District name |
| unitAddress | `text: text` | Meeting address |
| date | `text: date` | Use native date picker; store as "MMMM D, YYYY" (e.g., "March 29, 2026") |
| presiding | `text: text` | Full name; auto‑translate honorifics |
| conducting | `text: text` | Full name; auto‑translate honorifics |
| musicDirector | `text: text` | Full name |
| musicOrganist | `text: text` | Full name |
| openingPrayer | `text: text` | Full name; auto‑translate honorifics |
| closingPrayer | `text: text` | Full name; auto‑translate honorifics |
| openingHymn | `hymnNumber: number`, `titleOverride: text` | Hymn number: dropdown of all known hymns (including children's songs, numbers >1000); title optional |
| sacramentHymn | `hymnNumber: number`, `titleOverride: text` | Same as above |
| intermediateHymn | `hymnNumber: number`, `titleOverride: text` | Repeatable |
| closingHymn | `hymnNumber: number`, `titleOverride: text` | |
| hymn | `hymnNumber: number`, `titleOverride: text` | |
| speaker | `name: text`, `caption: text` | Repeatable (max 2) |
| leader | `name: text`, `phone: text`, `calling: text` | Repeatable (max 5) |
| photo | `url: text`, `caption: text` | Image URL + optional caption |
| link | `text: text`, `url: text` | |
| linkWithSpace | `text: text`, `url: text`, `imageUrl: text` | Button to insert `<IMG>` into text; no separate `includeImageIcon` field |
| generalStatement | `text: textarea` | |
| generalStatementWithLink | `text: textarea`, `url: text` | Button to insert `<LINK>` into text |
| horizontalLine | `text: text` | Section label |
| sacramentLine | `text: text` | Custom sacrament heading |
| agendaGeneral | `text: textarea` | General notes |
| agendaAnnouncements | `text: text` | Repeatable |
| agendaAckVisitingLeaders | `text: text` | |
| agendaBusinessReleases | `text: text` | Repeatable |
| agendaBusinessCallings | `text: text` | Repeatable |
| agendaBusinessPriesthood | `text: textarea` | |
| agendaBusinessNewMoveIns | `text: text` | Repeatable |
| agendaBusinessNewConverts | `text: text` | Repeatable |
| agendaBusinessGeneral | `text: textarea` | |
| agendaBusinessStake | `text: textarea` | |
| lessonEQRS | `text: text` | |
| lessonSundaySchool | `text: text` | |
| lessonYouth | `text: text` | |
| lessonPrimary | `text: text` | |
| oilLamp | `enabled: checkbox` | Display oil lamp |
| migrationUrl | `text: text` | |
| obsolete | `text: text` | |

### Section Partitioning
Three sections based on key type:
- **Unit Information** (locked): `unitName`, `unitAddress`, `stakeName`, `date` (must stay in that order).
- **Sacrament Meeting Program**: All keys in canonical order (see plan). Must include `presiding` (first) and `closingPrayer` (last). `speaker`, `intermediateHymn` are repeatable.
- **General Information**: Remaining keys. Order per template but flexible.

Universal keys (e.g., `horizontalLine`, `photo`, `oilLamp`) can appear in any section.

### Constraints
- Unit Info: cannot delete, change key, or reorder rows.
- Program: `presiding` and `closingPrayer` cannot be deleted; `presiding` must stay at index 0; `closingPrayer` must stay at last index.
- Non‑repeatable keys must appear only once.

### Serialization
- `sanitisePart(value)`: remove `|`, trim.
- `joinParts(parts)`: join with `|`.
- Multi‑field keys produce pipe‑delimited values.
- Simple single‑field keys store raw text.

### Rendering
- Row editor: dropdown (readonly for locked) to select key, then appropriate inputs for fields.
- Hymns: number input (1‑999) with optional dropdown later.
- Date: native date picker; display "MMMM D, YYYY".
- Token insertion buttons for `generalStatementWithLink` and `linkWithSpace`.
- Move up/down buttons; delete where allowed.
- Repeatable fields have an "Add" button.

### Performance
Target incremental rendering: update only changed row DOM elements.

### Security
- Escape all user content on render.
- Validate URLs (warn on invalid).
- Limit field lengths (text ≤1000, textarea ≤5000).
- Treat `<LINK>` and `<IMG>` as plain text.

## Browser & Device Support Policy

### Minimum Browser Baseline
- Absolute minimum supported Safari version is **15.6**.
- For iPhone/iPad, support policy is **supported with limitations** on older devices and OS versions.

### Current Compatibility Notes
- Current runtime does **not** rely on import maps for Dexie resolution.
- This enables Safari 15.6+ compatibility for the core app/module boot path.
- Some features can still vary by device capability or platform policy:
	- Camera/QR scan depends on hardware, permissions, and browser camera behavior.
	- Native share behavior differs by platform and may require fallback UX.

### Legacy Device Guidance
- Older devices such as iPhone 6s/SE (1st gen), iPad Air 2, iPad 5th/6th gen, and iPad mini 4/5 are in-scope under "supported with limitations" when on Safari 15.6+.
- Very old tablets/phones that cannot run modern ES module-capable Safari are out of scope.

### Maintenance Rule
- When browser baseline policy changes, update all three files together:
	- `AGENTS.md`
	- `docs/SPEC.md`
	- `docs/research/browser-compatibility.md`

