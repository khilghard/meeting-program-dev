# MCP Server Setup Guide

## Overview

Model Context Protocol (MCP) servers enable external tool integration with OpenCode.

## Currently Configured Servers

### 1. Filesystem Server (Enabled)

- **Purpose**: Access project files via MCP
- **Status**: Enabled by default
- **Command**: `npx -y @modelcontextprotocol/server-filesystem .`

## Google Sheets Note

Google Sheets data is accessed via CSV export URLs (publicly accessible):

```
https://docs.google.com/spreadsheets/d/{ID}/gviz/tq?tqx=out:csv
```

No MCP server needed - the AI can fetch this directly via `webfetch` tool.

## Installing Additional MCP Servers

### Available Servers

```bash
# Filesystem (already configured)
npx -y @modelcontextprotocol/server-filesystem <path>

# GitHub
npx -y @modelcontextprotocol/server-github

# Git
npx -y @modelcontextprotocol/server-git

# Google Maps
npx -y @modelcontextprotocol/server-google-maps

# PostgreSQL
npx -y @modelcontextprotocol/server-postgres

# SQLite
npx -y @modelcontextprotocol/server-sqlite

# Puppeteer (browser automation)
npx -y @modelcontextprotocol/server-puppeteer
```

### Adding a New Server

1. Install the server package
2. Add to `opencode.json` under `mcp.servers`:

```json
{
  "mcp": {
    "servers": {
      "my-server": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-myservice"],
        "disabled": false,
        "description": "My custom server"
      }
    }
  }
}
```

## Google Sheets Integration (Future Work)

### Option 1: Custom MCP Server

Create a custom MCP server for Google Sheets API:

```javascript
// google-sheets-mcp-server/index.js
import { Server } from "@modelcontextprotocol/sdk/server";
import { google } from "googleapis";

const server = new Server({
  name: "google-sheets",
  version: "1.0.0"
});

server.listTools(() => ({
  tools: [
    {
      name: "read_sheet",
      description: "Read data from Google Sheet",
      inputSchema: {
        type: "object",
        properties: {
          spreadsheetId: { type: "string" },
          range: { type: "string" }
        }
      }
    }
  ]
}));

server.callTool(async (request) => {
  if (request.name === "read_sheet") {
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/spreadsheets.read"]
    });
    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: request.arguments.spreadsheetId,
      range: request.arguments.range
    });

    return {
      content: [{ type: "text", text: JSON.stringify(response.data) }]
    };
  }
});

server.start();
```

### Option 2: Use Existing HTTP API

For now, use the existing Google Sheets CSV export URL pattern:

```
https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/gviz/tq?tqx=out:csv
```

This is already implemented in your meeting program app.

## Troubleshooting

### Server Not Starting

```bash
# Check if npx is available
which npx

# Test server manually
npx -y @modelcontextprotocol/server-filesystem .

# Check logs in OpenCode output
```

### Permission Issues

```bash
# Ensure execute permissions
chmod +x node_modules/.bin/*
```

### Connection Issues

```bash
# Check for port conflicts
lsof -i :3000

# Restart OpenCode
```

## References

- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP Servers Repository](https://github.com/modelcontextprotocol/servers)
- [OpenCode MCP Docs](https://opencode.ai/docs/mcp-servers/)
