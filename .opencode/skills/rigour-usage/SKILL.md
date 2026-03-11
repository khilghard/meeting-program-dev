---
name: rigour-usage
description: Provides guidance on using Rigour MCP tools effectively. Covers quality gates, security audits, deep analysis, and integration with agent workflows. Use when working with Rigour, setting up quality checks, or troubleshooting MCP issues.
license: MIT
metadata:
  audience: developers
  workflow: rigour-mcp
---

# Rigour MCP Usage Guide

## What I Do

- Explain Rigour MCP tool capabilities
- Guide quality gate configuration
- Help interpret security audit results
- Optimize Rigour integration workflows
- Troubleshoot MCP connection issues

## When to Use Me

Use this skill when:

- Setting up Rigour for a new project
- Interpreting quality gate failures
- Configuring security audits
- Optimizing agent workflows with Rigour
- Troubleshooting MCP connection issues

## Rigour MCP Tools Overview

### Available Tools

#### 1. `rigour_check`

Run quality gate checks on the project.

```bash
# Basic check (fast, deterministic gates only)
rigour_check --cwd /path/to/project

# Quick mode (deep analysis with lite model)
rigour_check --cwd /path/to/project --deep quick

# Full mode (deep analysis with pro model)
rigour_check --cwd /path/to/project --deep full --pro
```

**Use Cases:**

- Pre-commit validation
- CI/CD pipeline checks
- Code review preparation
- Quality baseline verification

#### 2. `rigour_explain`

Explain the last quality gate failures with actionable bullets.

```bash
rigour_explain --cwd /path/to/project
```

**Use Cases:**

- Understanding failure reasons
- Getting fix recommendations
- Learning quality patterns

#### 3. `rigour_status`

Quick PASS/FAIL check with JSON output.

```bash
rigour_status --cwd /path/to/project
```

**Use Cases:**

- Polling current project state
- CI/CD status checks
- Automated workflow decisions

#### 4. `rigour_get_fix_packet`

Retrieve prioritized fix packet with machine-readable diagnostics.

```bash
rigour_get_fix_packet --cwd /path/to/project
```

**Use Cases:**

- Automated fix generation
- Batch processing failures
- Integration with other tools

#### 5. `rigour_list_gates`

List all configured quality gates and thresholds.

```bash
rigour_list_gates --cwd /path/to/project
```

**Use Cases:**

- Understanding current configuration
- Auditing quality standards
- Documentation

#### 6. `rigour_get_config`

Get current Rigour configuration (rigour.yml).

```bash
rigour_get_config --cwd /path/to/project
```

**Use Cases:**

- Reviewing active configuration
- Debugging behavior
- Version control audits

#### 7. `rigour_mcp_get_settings`

Get MCP runtime settings.

```bash
rigour_mcp_get_settings --cwd /path/to/project
```

**Use Cases:**

- Checking deep mode defaults
- Verifying MCP configuration

#### 8. `rigour_mcp_set_settings`

Set MCP runtime settings.

```bash
rigour_mcp_set_settings --cwd /path/to/project --deep_default_mode quick
```

**Use Cases:**

- Changing default analysis mode
- Optimizing for speed vs. depth

#### 9. `rigour_check_pattern`

Check if a code pattern exists or has vulnerabilities.

```bash
rigour_check_pattern \
  --cwd /path/to/project \
  --name "authenticateUser" \
  --type "function" \
  --intent "user authentication"
```

**Use Cases:**

- Before creating new code
- Avoiding duplicates
- Security pattern validation

#### 10. `rigour_security_audit`

Run live security audit (CVE check) on dependencies.

```bash
rigour_security_audit --cwd /path/to/project
```

**Use Cases:**

- Dependency vulnerability scanning
- Security compliance
- Pre-release checks

#### 11. `rigour_run`

Execute commands under Rigour supervision.

```bash
rigour_run --cwd /path/to/project --command "npm test"
```

**Use Cases:**

- Supervised test execution
- Quality-gated command runs

#### 12. `rigour_run_supervised`

Run command with full auto-healing loop.

```bash
rigour_run_supervised \
  --cwd /path/to/project \
  --command "claude 'fix the bug'" \
  --maxRetries 3
```

**Use Cases:**

- Self-healing agent loops
- Automated bug fixing
- Quality restoration

#### 13. `rigour_agent_register`

Register an agent in multi-agent session.

```bash
rigour_agent_register \
  --cwd /path/to/project \
  --agentId "agent-a" \
  --taskScope '["src/api/**", "tests/api/**"]'
```

**Use Cases:**

- Multi-agent coordination
- Conflict detection
- Scope management

#### 14. `rigour_handoff`

Handoff task to another agent.

```bash
rigour_handoff \
  --cwd /path/to/project \
  --fromAgentId "agent-a" \
  --toAgentId "agent-b" \
  --taskDescription "Complete API validation"
```

**Use Cases:**

- Agent workflow handoffs
- Task delegation
- Multi-agent collaboration

#### 15. `rigour_checkpoint`

Record quality checkpoint during long execution.

```bash
rigour_checkpoint \
  --cwd /path/to/project \
  --progressPct 50 \
  --summary "Completed API layer" \
  --qualityScore 85
```

**Use Cases:**

- Long-running agent tracking
- Drift detection
- Progress monitoring

#### 16. `rigour_hooks_check`

Run fast hook checker on specific files.

```bash
rigour_hooks_check \
  --cwd /path/to/project \
  --files '["src/auth.js", "src/api.js"]'
```

**Use Cases:**

- Pre-commit validation
- IDE hook checks
- Fast security scanning

#### 17. `rigour_hooks_init`

Generate hook configs for AI coding tools.

```bash
rigour_hooks_init \
  --cwd /path/to/project \
  --tool "claude" \
  --dlp true
```

**Use Cases:**

- Setting up IDE integration
- DLP (Data Loss Prevention) hooks
- Credential interception

#### 18. `rigour_review`

Perform high-fidelity code review on PR diff.

```bash
rigour_review \
  --cwd /path/to/project \
  --repository "owner/repo" \
  --branch "feature-branch" \
  --diff "@diff_content@"
```

**Use Cases:**

- Pull request reviews
- Pre-merge validation
- Quality gate enforcement

#### 19. `rigour_check_deep`

Run quality gates with deep LLM analysis.

```bash
rigour_check_deep \
  --cwd /path/to/project \
  --pro true \
  --provider "claude"
```

**Use Cases:**

- Comprehensive code analysis
- Design pattern validation
- Architecture review

#### 20. `rigour_deep_stats`

Get deep analysis statistics from SQLite storage.

```bash
rigour_deep_stats --cwd /path/to/project --limit 10
```

**Use Cases:**

- Trend analysis
- Score tracking
- Quality history

## Workflow Examples

### Example 1: Pre-Commit Validation

```bash
# 1. Check for secrets and hallucinated imports
rigour_hooks_check --cwd . --files '["src/auth.js"]'

# 2. Run quality gates
rigour_check --cwd . --deep quick

# 3. If failures, get explanation
rigour_explain --cwd .
```

### Example 2: Security Audit

```bash
# 1. Run CVE check on dependencies
rigour_security_audit --cwd .

# 2. Check for hardcoded secrets
rigour_hooks_check --cwd . --text "$SECRET_VARIABLE"

# 3. Review security patterns
rigour_check_deep --cwd . --pro true
```

### Example 3: Multi-Agent Workflow

```bash
# Agent A: Register scope
rigour_agent_register \
  --cwd . \
  --agentId "frontend-agent" \
  --taskScope '["src/components/**", "src/pages/**"]'

# Agent A: Work on task
# ... coding ...

# Agent A: Checkpoint
rigour_checkpoint \
  --cwd . \
  --progressPct 50 \
  --summary "Completed login component" \
  --qualityScore 90

# Agent A: Handoff to Agent B
rigour_handoff \
  --cwd . \
  --fromAgentId "frontend-agent" \
  --toAgentId "backend-agent" \
  --taskDescription "Implement API integration"

# Agent B: Accept handoff
rigour_handoff_accept \
  --cwd . \
  --handoffId "handoff-123" \
  --agentId "backend-agent"
```

### Example 4: Self-Healing Loop

```bash
# Run command with auto-healing
rigour_run_supervised \
  --cwd . \
  --command "claude 'fix the authentication bug'" \
  --maxRetries 3

# This will:
# 1. Execute the command
# 2. Check quality gates
# 3. If failures, get fix packet
# 4. Apply fixes and retry
# 5. Repeat until PASS or max retries
```

## Configuration Guidelines

### Setting Deep Mode Default

```bash
# For fast iteration (development)
rigour_mcp_set_settings --cwd . --deep_default_mode off

# For balanced analysis (normal work)
rigour_mcp_set_settings --cwd . --deep_default_mode quick

# For comprehensive review (pre-release)
rigour_mcp_set_settings --cwd . --deep_default_mode full
```

### Quality Gate Thresholds

See `rigour.yml` for current configuration:

- `max_file_lines: 500`
- `complexity: 10`
- `max_methods: 10`
- `max_params: 5`
- `max_nesting: 2`

### Protected Paths

```yaml
protected_paths:
  - .github/**
  - docs/**
  - rigour.yml

protected_memory_paths:
  - CLAUDE.md
  - .claude/CLAUDE.md

protected_skills_paths:
  - .claude/skills/**
  - .opencode/skills/**
```

## Troubleshooting

### Issue: MCP Connection Failed

**Symptoms**: "MCP server not responding"

**Solutions:**

```bash
# 1. Check settings
rigour_mcp_get_settings --cwd .

# 2. Verify rigour.yml exists
ls -la rigour.yml

# 3. Restart MCP server
# (Close and reopen your AI coding tool)
```

### Issue: Quality Gates Always Failing

**Symptoms**: Same failures repeatedly

**Solutions:**

```bash
# 1. Get current configuration
rigour_get_config --cwd .

# 2. List all gates
rigour_list_gates --cwd .

# 3. Get detailed explanation
rigour_explain --cwd .

# 4. Check if thresholds are appropriate
# (Don't modify rigour.yml without team approval)
```

### Issue: Deep Analysis Too Slow

**Symptoms**: Analysis takes >60 seconds

**Solutions:**

```bash
# Switch to quick mode
rigour_mcp_set_settings --cwd . --deep_default_mode quick

# Or disable deep analysis
rigour_mcp_set_settings --cwd . --deep_default_mode off
```

### Issue: DLP Hooks Missing

**Symptoms**: Secrets not being intercepted

**Solutions:**

```bash
# Reinitialize hooks with DLP enabled
rigour_hooks_init --cwd . --tool "claude" --dlp true

# Verify hook files exist
ls -la .claude/hooks.json  # or .opencode/hooks.json
```

## Best Practices

### 1. Use Appropriate Deep Mode

- **Development**: `off` or `quick`
- **Code Review**: `quick`
- **Pre-Release**: `full`

### 2. Check Patterns Before Coding

```bash
rigour_check_pattern \
  --cwd . \
  --name "myFunction" \
  --type "function" \
  --intent "my purpose"
```

### 3. Use Checkpoints for Long Tasks

```bash
# Every 15-30 minutes during long execution
rigour_checkpoint \
  --cwd . \
  --progressPct $((current_progress)) \
  --summary "Working on X" \
  --qualityScore $((estimated_score))
```

### 4. Enable DLP Hooks

Always enable DLP (Data Loss Prevention) to intercept credentials:

```bash
rigour_hooks_init --cwd . --tool "claude" --dlp true
```

### 5. Use Supervised Mode for Auto-Healing

```bash
rigour_run_supervised \
  --cwd . \
  --command "your-agent-command" \
  --maxRetries 3
```

## References

- [Rigour Documentation](https://rigour.dev)
- [Rigour Configuration](./rigour.yml)
- [MCP Settings](./.rigour/mcp-settings.json)
- [Security Audit Guide](./security-audit/SKILL.md)
