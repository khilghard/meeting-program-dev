---
name: token-optimizer
description: Monitors and reduces token usage in AI conversations. Provides tools for context window management, conversation summarization, and tool call optimization. Use when approaching token limits, optimizing prompts, or reducing AI costs.
license: MIT
metadata:
  audience: developers
  workflow: token-optimization
---

# Token Usage Optimizer

## What I Do

- Monitor context window usage in real-time
- Identify token-heavy patterns in conversations
- Suggest optimization strategies
- Implement conversation summarization
- Optimize tool call patterns
- Track token usage trends

## When to Use Me

Use this skill when:

- Context window is approaching limits
- AI responses are being truncated
- Tool definitions are too large
- Multi-step workflows are inefficient
- Need to reduce API costs
- Planning long-running conversations

## Token Usage Monitoring

### Context Window Breakdown

```javascript
// Typical context window allocation
const contextAllocation = {
  systemPrompt: 500, // System instructions
  toolDefinitions: 7000, // All tool schemas (TO REDUCE)
  conversationHistory: 50000, // Past messages
  currentPrompt: 2000, // Current request
  buffer: 10000, // Safety margin
  total: 128000 // Total context window
};

// Target allocation after optimization
const optimizedAllocation = {
  systemPrompt: 500,
  toolDefinitions: 500, // Dynamic loading (93% reduction)
  conversationHistory: 30000, // Summarized old turns
  currentPrompt: 5000, // More detailed prompt
  buffer: 20000, // Larger buffer
  total: 128000
};
```

### Token Estimation

```javascript
// Rough token estimation (1 token ≈ 4 characters)
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// More accurate estimation using tiktoken
function estimateTokensAccurate(text, model = "gpt-4") {
  // Use tiktoken library for accurate counts
  const encoder = getEncoding(model);
  const tokens = encoder.encode(text);
  return tokens.length;
}
```

## Optimization Strategies

### 1. Dynamic Tool Loading (93% Token Reduction)

#### Before (Static Injection)

```json
// All 14 tools sent every request
{
  "tools": [
    {"name": "bash", "description": "...", "parameters": {...}},
    {"name": "edit", "description": "...", "parameters": {...}},
    // ... 12 more tools (~7000 tokens)
  ]
}
```

#### After (Dynamic Loading)

```json
// Compact catalog with search
{
  "tools": {
    "catalog": [
      { "name": "bash", "description": "Execute shell commands" },
      { "name": "edit", "description": "Modify files" }
      // ... compact descriptions (~500 tokens)
    ],
    "search": "tool_search(query: string)"
  }
}
```

**Implementation:**

```javascript
// Tool registry
const toolRegistry = {
  catalog: [
    { name: "bash", description: "Execute shell commands", category: "file" },
    { name: "edit", description: "Modify files", category: "file" },
    { name: "read", description: "Read files", category: "file" },
    { name: "glob", description: "Find files by pattern", category: "file" },
    { name: "grep", description: "Search file contents", category: "file" },
    { name: "list", description: "List directory contents", category: "file" },
    { name: "write", description: "Create/overwrite files", category: "file" },
    { name: "skill", description: "Load agent skills", category: "agent" },
    { name: "webfetch", description: "Fetch web content", category: "web" },
    { name: "websearch", description: "Search the web", category: "web" }
  ],

  // Search tools by keyword
  search(query) {
    return this.catalog.filter(
      (tool) =>
        tool.name.includes(query) ||
        tool.description.includes(query) ||
        tool.category.includes(query)
    );
  },

  // Load full schema for specific tools
  loadTools(toolNames) {
    return toolNames.map((name) => this.getFullSchema(name));
  }
};
```

### 2. Conversation Summarization

#### When to Summarize

```javascript
// Summarize when conversation exceeds threshold
const SUMMARIZE_THRESHOLD = 50000; // tokens

function shouldSummarize(conversation) {
  const tokenCount = estimateTokens(conversation);
  return tokenCount > SUMMARIZE_THRESHOLD;
}
```

#### Summarization Strategy

```javascript
// Keep recent turns in full detail
const RECENT_TURNS = 10;

// Summarize older turns
async function summarizeOlderTurns(conversation) {
  const recentTurns = conversation.slice(-RECENT_TURNS);
  const olderTurns = conversation.slice(0, -RECENT_TURNS);

  const summary = await llm.summarize(olderTurns, {
    format: "bullet_points",
    include: ["decisions", "actions", "outcomes"],
    exclude: ["redundant_greetings", "clarification_questions"]
  });

  return [
    { role: "system", content: `Previous conversation summary:\n${summary}` },
    ...recentTurns
  ];
}
```

### 3. Multi-Tool Code Execution (98% Token Reduction)

#### Before (Sequential Calls)

```
Round 1: Read file A
Round 2: Edit file A
Round 3: Read file B
Round 4: Edit file B
Round 5: Run tests
Round 6: Check results
Total: 6 round-trips, ~12,000 tokens
```

#### After (Single Script)

```python
# Single execution with tool bridge
import tools

# Read files
file_a = tools.read('file-a.js')
file_b = tools.read('file-b.js')

# Edit files
tools.edit('file-a.js', old_text, new_text)
tools.edit('file-b.js', old_text, new_text)

# Run tests
result = tools.bash('npm test')

# Check results
print(result)
Total: 1 round-trip, ~500 tokens
```

**Implementation:**

```javascript
// Sandbox tool bridge
class ToolBridge {
  constructor() {
    this.tools = {
      read: async (path) => fs.readFile(path, "utf-8"),
      edit: async (path, old, new_) => editFile(path, old, new_),
      write: async (path, content) => fs.writeFile(path, content),
      bash: async (cmd) => exec(cmd),
      glob: async (pattern) => glob(pattern),
      grep: async (pattern, path) => search(pattern, path)
    };
  }

  // Generate typed stubs for Python
  generateStubs() {
    return `
import json
from typing import Any

class tools:
    @staticmethod
    def read(path: str) -> str:
        """Read file content"""
        pass
    
    @staticmethod
    def edit(path: str, old: str, new: str) -> bool:
        """Edit file with exact string replacement"""
        pass
    
    @staticmethod
    def bash(command: str) -> str:
        """Execute shell command"""
        pass
    
    # ... more tools
`;
  }
}
```

## Token Usage Dashboard

### Visual Indicator

```javascript
// Context window usage indicator
function createContextWindowIndicator() {
  const usage = {
    current: 45000,
    total: 128000,
    percentage: (45000 / 128000) * 100
  };

  const color = usage.percentage < 50 ? "green" : usage.percentage < 80 ? "yellow" : "red";

  return `
    <div class="token-usage" style="color: ${color}">
      Token Usage: ${usage.current.toLocaleString()} / ${usage.total.toLocaleString()} 
      (${usage.percentage.toFixed(1)}%)
      <div class="progress-bar">
        <div style="width: ${usage.percentage}%; background: ${color}"></div>
      </div>
    </div>
  `;
}
```

### Token Breakdown

```javascript
// Detailed token breakdown
const tokenBreakdown = {
  systemPrompt: { tokens: 500, percentage: 0.4 },
  toolDefinitions: { tokens: 500, percentage: 0.4 }, // After optimization
  conversationHistory: { tokens: 30000, percentage: 23.4 },
  currentPrompt: { tokens: 5000, percentage: 3.9 },
  buffer: { tokens: 20000, percentage: 15.6 },
  available: { tokens: 71000, percentage: 55.5 }
};
```

## Optimization Checklist

### Immediate Actions

- [ ] Enable dynamic tool loading
- [ ] Implement tool search functionality
- [ ] Add context window usage indicator
- [ ] Configure conversation summarization
- [ ] Set up sandbox for multi-tool execution

### Ongoing Maintenance

- [ ] Monitor token usage trends
- [ ] Review and update tool schemas
- [ ] Optimize system prompts
- [ ] Update summarization strategies
- [ ] Track cost savings

### Advanced Optimizations

- [ ] Implement tool call batching
- [ ] Add response streaming
- [ ] Optimize embedding usage
- [ ] Cache frequent responses
- [ ] Use smaller models for simple tasks

## References

- [Episode 5: Advanced Tool Use](https://github.com/theaiautomators/claude-code-agentic-rag-series/tree/main/ep5-advanced-tool-use)
- [OpenCode Tools Documentation](https://opencode.ai/docs/tools/)
- [Agent Skills Standard](https://agentskills.io/)
- [Context Window Optimization Guide](https://platform.openai.com/docs/guides/context-management)
