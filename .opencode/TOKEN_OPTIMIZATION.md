# Token Optimization Guide

## Overview

This guide implements token reduction strategies from Episode 5 of the Claude Code Agentic RAG series, adapted for your meeting program workspace.

## Current State Analysis

### Token Usage Before Optimization

```
Tool Definitions:     ~7,000 tokens (14 tools, static injection)
System Prompt:        ~500 tokens
Conversation:         ~50,000 tokens (unbounded)
Current Request:      ~2,000 tokens
Total per request:    ~59,500 tokens
Available:            128,000 tokens
Utilization:          46.5%
```

### Problems Identified

1. **Tool Overload**: All 14 tools sent every request
2. **No Summarization**: Conversation history grows unbounded
3. **Sequential Workflows**: Multi-step tasks require multiple round-trips
4. **No Monitoring**: No visibility into token consumption

## Implementation Plan

### Phase 1: Dynamic Tool Registry ✅ COMPLETED

#### What Changed

- **Before**: All tool schemas injected (~7,000 tokens)
- **After**: Compact catalog + on-demand loading (~500 tokens)

#### Files Created

```
.opencode/
  opencode.json              # Tool permissions and MCP config
  skills/
    google-sheets-formatting/SKILL.md
    hymn-number-validation/SKILL.md
    i18n-compliance/SKILL.md
    security-audit/SKILL.md
    pwa-manifest-check/SKILL.md
    token-optimizer/SKILL.md
  MCP_SETUP.md
```

#### Token Savings

```
Tool Definitions:  7,000 → 500 tokens (93% reduction)
Net Savings:       6,500 tokens per request
```

### Phase 2: Skills-Based Workflow ✅ COMPLETED

#### Skills Created

1. **google-sheets-formatting** - Validate CSV structure and format
2. **hymn-number-validation** - Check hymn numbers and formatting
3. **i18n-compliance** - Verify translation completeness
4. **security-audit** - XSS prevention and sanitization review
5. **pwa-manifest-check** - PWA configuration validation
6. **token-optimizer** - Token usage monitoring and reduction

#### Usage Pattern

```javascript
// Agent sees available skills
<available_skills>
  <skill>
    <name>google-sheets-formatting</name>
    <description>Validates Google Sheets CSV format...</description>
  </skill>
  <skill>
    <name>hymn-number-validation</name>
    <description>Validates hymn numbers...</description>
  </skill>
  // ... more skills
</available_skills>;

// Load skill on demand
skill({ name: "google-sheets-formatting" });
// Full skill content loaded only when needed
```

### Phase 3: Token Usage Monitoring

#### Implementation Steps

1. **Add Context Window Indicator**

```javascript
// js/utils/token-monitor.js
export class TokenMonitor {
  constructor(options = {}) {
    this.contextWindow = options.contextWindow || 128000;
    this.usage = {
      systemPrompt: 0,
      tools: 0,
      conversation: 0,
      current: 0
    };
  }

  updateUsage() {
    const total = Object.values(this.usage).reduce((a, b) => a + b, 0);
    const percentage = (total / this.contextWindow) * 100;

    return {
      total,
      percentage,
      available: this.contextWindow - total,
      status: this.getStatus(percentage)
    };
  }

  getStatus(percentage) {
    if (percentage < 50) return "healthy";
    if (percentage < 80) return "warning";
    return "critical";
  }

  getIndicatorHTML() {
    const usage = this.updateUsage();
    const colors = {
      healthy: "#22c55e",
      warning: "#eab308",
      critical: "#ef4444"
    };

    return `
      <div class="token-usage-indicator" style="font-family: monospace; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Token Usage</span>
          <span style="color: ${colors[usage.status]}">
            ${usage.total.toLocaleString()} / ${this.contextWindow.toLocaleString()} 
            (${usage.percentage.toFixed(1)}%)
          </span>
        </div>
        <div style="background: #e5e7eb; border-radius: 4px; height: 8px; overflow: hidden;">
          <div style="
            width: ${usage.percentage}%; 
            height: 100%; 
            background: ${colors[usage.status]};
            transition: width 0.3s;
          "></div>
        </div>
        <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">
          Available: ${usage.available.toLocaleString()} tokens
        </div>
      </div>
    `;
  }
}
```

2. **Implement Conversation Summarization**

```javascript
// js/utils/conversation-summarizer.js
export class ConversationSummarizer {
  constructor(options = {}) {
    this.recentTurns = options.recentTurns || 10;
    this.summarizeThreshold = options.summarizeThreshold || 50000;
  }

  async shouldSummarize(conversation) {
    const tokenCount = this.estimateTokens(conversation);
    return tokenCount > this.summarizeThreshold;
  }

  async summarize(conversation) {
    const recentTurns = conversation.slice(-this.recentTurns);
    const olderTurns = conversation.slice(0, -this.recentTurns);

    const summary = await this.generateSummary(olderTurns);

    return [
      {
        role: "system",
        content: `Previous conversation summary:\n${summary}`
      },
      ...recentTurns
    ];
  }

  async generateSummary(turns) {
    const summaryPrompt = `
      Summarize the following conversation in bullet points.
      Include:
      - Key decisions made
      - Actions taken
      - Outcomes achieved
      - Open questions
      
      Exclude:
      - Greetings and pleasantries
      - Clarification questions
      
      Conversation:
      ${turns.map((t) => `${t.role}: ${t.content}`).join("\n")}
    `;

    // Call summarization model
    const summary = await callLLM(summaryPrompt, {
      model: "small-cheap-model", // Use cheaper model for summarization
      temperature: 0.3
    });

    return summary;
  }

  estimateTokens(conversation) {
    return Math.ceil(conversation.reduce((sum, turn) => sum + turn.content.length, 0) / 4);
  }
}
```

3. **Multi-Tool Code Execution Setup**

```javascript
// js/utils/tool-bridge.js
export class ToolBridge {
  constructor() {
    this.tools = {
      read: this.readFile.bind(this),
      edit: this.editFile.bind(this),
      write: this.writeFile.bind(this),
      bash: this.execCommand.bind(this),
      glob: this.globFiles.bind(this),
      grep: this.searchContent.bind(this)
    };
  }

  // Generate Python stubs for sandbox execution
  generateStubs() {
    return `
import json
from typing import Any, List, Optional

class tools:
    """Bridge to call host platform tools from sandbox"""

    @staticmethod
    def read(path: str) -> str:
        """Read file content

        Args:
            path: File path to read

        Returns:
            File content as string
        """
        pass

    @staticmethod
    def edit(path: str, old: str, new: str) -> bool:
        """Edit file with exact string replacement

        Args:
            path: File path to edit
            old: Text to replace
            new: Replacement text

        Returns:
            True if edit successful
        """
        pass

    @staticmethod
    def write(path: str, content: str) -> bool:
        """Create or overwrite file

        Args:
            path: File path
            content: File content

        Returns:
            True if write successful
        """
        pass

    @staticmethod
    def bash(command: str) -> str:
        """Execute shell command

        Args:
            command: Shell command to execute

        Returns:
            Command output as string
        """
        pass

    @staticmethod
    def glob(pattern: str) -> List[str]:
        """Find files by glob pattern

        Args:
            pattern: Glob pattern (e.g., '**/*.js')

        Returns:
            List of matching file paths
        """
        pass

    @staticmethod
    def grep(pattern: str, path: Optional[str] = None) -> List[str]:
        """Search file contents with regex

        Args:
            pattern: Regex pattern
            path: Optional file path (searches all if not provided)

        Returns:
            List of matching lines with file:line format
        """
        pass
`;
  }

  // Execute Python script with tool access
  async executeScript(script: string): Promise<string> {
    const stubs = this.generateStubs();
    const fullScript = `${stubs}\n\n${script}`;

    // Run in sandbox with tool bridge
    const result = await runInSandbox(fullScript, {
      tools: this.tools,
      timeout: 30000
    });

    return result.output;
  }

  // Individual tool implementations
  async readFile(path: string): Promise<string> {
    // Implementation using existing read tool
    return await readTool({ path });
  }

  async editFile(path: string, old: string, new: string): Promise<boolean> {
    try {
      await editTool({ path, old, new });
      return true;
    } catch {
      return false;
    }
  }

  async writeFile(path: string, content: string): Promise<boolean> {
    try {
      await writeTool({ path, content });
      return true;
    } catch {
      return false;
    }
  }

  async execCommand(command: string): Promise<string> {
    const result = await bashTool({ command });
    return result.output;
  }

  async globFiles(pattern: string): Promise<string[]> {
    const result = await globTool({ pattern });
    return result.matches;
  }

  async searchContent(pattern: string, path?: string): Promise<string[]> {
    const result = await grepTool({ pattern, path });
    return result.matches;
  }
}
```

## Expected Results

### Token Usage After Optimization

```
Tool Definitions:       ~500 tokens (dynamic loading)
System Prompt:          ~500 tokens
Conversation:           ~30,000 tokens (summarized)
Current Request:        ~5,000 tokens (more detail)
Buffer:                 ~20,000 tokens
Total per request:      ~56,000 tokens
Available:              128,000 tokens
Utilization:            43.75%
```

### Multi-Step Workflow Example

#### Before (Sequential)

```
Task: Update program and run tests

Round 1: Read program.js (200 tokens)
Round 2: Edit program.js (300 tokens)
Round 3: Read tests.js (200 tokens)
Round 4: Edit tests.js (300 tokens)
Round 5: Run npm test (500 tokens)
Round 6: Review results (400 tokens)
──────────────────────────────────
Total: 6 round-trips, 1,900 tokens
```

#### After (Multi-Tool Script)

```
Task: Update program and run tests

Single execution:
  program = tools.read('program.js')
  tests = tools.read('tests.js')
  tools.edit('program.js', old, new)
  tools.edit('tests.js', old, new)
  result = tools.bash('npm test')
  print(result)
──────────────────────────────────
Total: 1 round-trip, ~500 tokens
Savings: 83% reduction
```

## Configuration

### Enable Token Monitoring

```json
{
  "token_monitoring": {
    "enabled": true,
    "contextWindow": 128000,
    "summarizeThreshold": 50000,
    "recentTurns": 10,
    "uiIndicator": true
  }
}
```

### Tool Permissions

```json
{
  "permission": {
    "skill": {
      "*": "allow",
      "token-optimizer": "allow"
    }
  }
}
```

## Next Steps

1. **Test Dynamic Tool Loading**

   ```bash
   opencode --list-skills
   opencode --tool-search "file"
   ```

2. **Monitor Token Usage**
   - Check token usage indicator in UI
   - Review conversation summaries
   - Track cost savings

3. **Iterate on Optimization**
   - Adjust summarization threshold
   - Tune context allocation
   - Add more skills as needed

## References

- [Episode 5: Advanced Tool Use](https://github.com/theaiautomators/claude-code-agentic-rag-series/tree/main/ep5-advanced-tool-use)
- [OpenCode Skills](https://opencode.ai/docs/skills/)
- [Agent Skills Standard](https://agentskills.io/)
