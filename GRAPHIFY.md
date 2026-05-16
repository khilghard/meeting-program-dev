# 🕸️ Codebase Knowledge Graph (BMAD Context Memory)

This directory uses `graphify` to maintain a navigable knowledge graph of the codebase. The graph provides system-wide context without exhausting token windows, and is automatically consumed by OpenCode agents.

## 🚀 Quick Start (Already Installed)

Graphify is already installed and configured for this project. To rebuild the graph after code changes:

```bash
./graphify.sh
```

> **Note:** This project uses Ollama as the LLM backend. The endpoint and model are configured in `graphify.sh`.

## 📊 Current Graph State

- **Nodes:** 2,518
- **Edges:** 4,502
- **Communities:** 151
- **Extraction Quality:** 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS
- **Corpus:** 1,230 files, ~1.7M words

### Generated Artifacts

✅ `graphify-out/graph.json` — Raw graph data  
✅ `graphify-out/GRAPH_REPORT.md` — Token-optimized summary (OpenCode auto-consumes)  
✅ `graphify-out/graph.html` — Interactive visualization (open in browser)  
✅ `graphify-out/cost.json` — Token usage tracking  
✅ `graphify-out/manifest.json` — File tracking for incremental updates

> **OpenCode Integration:** OpenCode reads `GRAPH_REPORT.md` automatically via native skill hooks on session start. No manual loading needed.

## 🔄 Usage Patterns

### Full Re-Extraction (Semantic + AST)

Use this after adding new docs, papers, images, or making significant changes:

```bash
./graphify.sh
```

### Code-Only Updates (Fast)

After modifying only `.js`, `.mjs`, `.py`, etc. (no document changes), use AST-only update (no LLM cost, ~seconds):

```bash
graphify update .
```

### Manual Querying

```bash
# Broad context search (BFS)
graphify query "how does authentication work"

# Trace specific dependency chain (DFS)
graphify query "how does data flow from sheets to UI" --dfs

# Budget-aware output (default 2000 tokens)
graphify query "what are the main components" --budget 4000

# Path between two concepts
graphify path "indexeddb" "programsheetservice"

# Explain a specific node
graphify explain "data_db_db"
```

All queries accept `--graph <path>` to point to a specific `graph.json` (default: `graphify-out/graph.json`).

### Watch Mode (Auto-Rebuild)

Run in a background terminal to keep graph in sync with code changes:

```bash
graphify watch . --debounce 3
```

- Code files: immediate AST rebuild (no LLM)
- Docs/images: sets `needs_update` flag → run `./graphify.sh` later

## 🎯 Most Interesting Questions to Explore

Based on surprising connections detected:

1. **How does the data layer connect to the API and UI?** (crosses Database, Services, Main)
2. **What are the core abstractions?** (identifies foundational interfaces)
3. **How does error handling propagate?** (tracks error flow across boundaries)
4. **What's the main entry point and initialization sequence?** (app startup flow)
5. **How does the migration system work?** (connects legacy to current storage)

Try:

```bash
graphify query "how does data flow from sheets to UI"
graphify explain "data_db_db"
graphify path "history" "programsheetservice"
```

Results are scoped subgraphs (usually smaller than full report) with citations (`source_file`, `source_location`).

### Find Shortest Path

Trace connections between two concepts:

```bash
graphify path "AuthModule" "Database"
```

### Explain a Node

Get a detailed explanation of a specific function/class and its relationships:

```bash
graphify explain "parseProgramData"
```

### Incremental Updates

After code-only changes (no docs/papers), run fast AST-only update:

```bash
graphify update .
```

After doc/paper/image changes, or mixed changes, run full re-extraction:

```bash
./graphify.sh  # or graphify extract .
```

### Watch Mode

Auto-rebuild graph on code changes (background process):

```bash
graphify watch . --debounce 3
```

Code changes trigger immediate AST rebuild. Doc changes set a flag prompting manual `graphify update`.

## 📈 Token Reduction Benchmark

For large corpora, graph queries reduce token usage by ~249× compared to naïve RAG:

```
Corpus:  1,695,591 words → ~2,260,788 tokens (naive)
Graph:   2,518 nodes, 4,502 edges
Avg cost: ~9,065 tokens per query
Reduction: 249.4x
```

Benchmark runs automatically after extraction if `total_words > 5000`.

## 🏷️ Community Structure

The graph is clustered into 151 communities (functional groupings). Top hubs by connectivity:

- Session Tmux State (tmux runtime, agent orchestration)
- Manager Generateqrcode Getmigration (install, share, migration)
- Class Dexie Addfilter (IndexedDB abstraction, vendor)
- Eslint Json Rigour (config, quality gates)
- Constructor Client Makeclient (Google Sheets API patterns)
- Migration Buildhistoryentry Getdeploymentpath (data migration)
- Main Addglobalcleanup Addresetbuttontohelpmodal (main UI)
- ... and 144 more

Full list in [`graphify-out/GRAPH_REPORT.md`](graphify-out/GRAPH_REPORT.md) under **Community Hubs**.

## 🛠️ Technical Details

### Extraction Pipeline

1. **Detection** — Scan corpus by file type (code/docs/papers/images)
2. **AST Extraction** — Deterministic structural parse of code files (imports, definitions, calls)
3. **Semantic Extraction** — LLM analyzes docs/papers/images to extract concepts, relationships, rationale
4. **Merging** — Combine AST + semantic into unified graph
5. **Clustering** — Community detection (Louvain) groups related nodes
6. **Labeling** — Auto-generated community labels (reviewed/editable)
7. **Visualization** — HTML interactive graph + Obsidian vault (optional)

### Edge Confidence

- `EXTRACTED` (confidence=1.0) — Explicit in source (imports, calls, citations)
- `INFERRED` (confidence=0.4-0.9) — Reasonable inference (shared data, implied dependencies)
- `AMBIGUOUS` (confidence=0.1-0.3) — Uncertain connections flagged for review

### Cache Behavior

- AST results are cached by file hash (in `graphify-out/cache/ast/`)
- Semantic extraction is cached by content hash (in `graphify-out/cache/semantic/`)
- `graphify update` re-uses cached results for unchanged files

## 🔍 Exploration Guide

The most interesting question this graph can answer:

> **"How does the data layer connect to the API and UI?"** (crosses Database, Services, Main, Editor communities)

Try tracing it:

```bash
graphify path "indexeddbmanager" "programsheetservice"
graphify query "data flow from sheets to UI"
graphify explain "data_db_db"
```

## 📚 References

- [graphify GitHub](https://github.com/safishamsi/graphify)
- [graphify CLI docs](https://github.com/safishamsi/graphify#usage)
- BMAD Method documentation (internal)

---

## 🔐 Security & Private Configuration

To avoid leaking private endpoints and credentials:

1. **All secrets go in `.env`** — This file is gitignored and never committed
2. **Commit only `.env.example`** — Template file with placeholder values
3. **Before pushing,** verify with `git status` that `.env` is not staged
4. **Rotate credentials** if they ever appear in commit history

### Files to double-check before committing:

- `graphify-out/` — Contains graph artifacts (safe to commit if no cache of sensitive data)
- `.env` — **NEVER commit** (contains private URLs, API keys)
- `GRAPHIFY.md` — Safe to commit (documentation only)
- `.env.example` — Safe to commit (template)

---

## ⚙️ Configuration (Legacy)

Prior to this update, configuration was hardcoded in `graphify.sh`. That script has been updated to read from `.env`. If you're migrating an old setup, simply copy your existing values into the new `.env` file.

### `graphify.sh`

The `./graphify.sh` script reads configuration from `.env` and runs the full extraction. Edit the `.env` file to change settings.

**Manual override** (without .env):
```bash
graphify extract . \
  --backend ollama \
  --endpoint "http://your-ollama-server:11434/v1" \
  --model "llama3.2" \
  --max-concurrency 4 \
  --token-budget 32000
```

