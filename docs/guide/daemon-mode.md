# Daemon Mode

Daemon mode runs repo-roller as a background service with a JSON-RPC interface, providing fast bundle generation through caching and enabling IDE integrations, editor plugins, and programmatic access.

## What Is Daemon Mode

Daemon mode is a long-running background process that:

- **Caches project scans** - Instant responses for repeated queries
- **Provides JSON-RPC API** - Structured programmatic access
- **Enables IDE integration** - Build extensions and plugins
- **Reduces startup overhead** - No process spawn for each request
- **Maintains session state** - Preserves cache across requests

## When to Use Daemon Mode

**Use daemon mode for:**

- IDE/editor extensions
- Build tool integrations
- Repeated bundle generations
- Programmatic access from applications
- High-frequency queries
- Development workflows with fast iteration

**Don't use daemon mode for:**

- One-off bundle generations
- CI/CD pipelines (use CLI directly)
- Simple scripts (daemon overhead not worth it)

## Starting the Daemon

### Start Daemon

```bash
# Start daemon in background
repo-roller daemon start

# Start with custom socket path
repo-roller daemon start --socket /tmp/repo-roller.sock

# Start with custom cache settings
repo-roller daemon start --cache-ttl 600000 --max-cache-size 20
```

**Output:**

```
Daemon listening on /home/user/.cache/repo-roller/daemon.sock
PID: 12345
```

The daemon runs in the background until explicitly stopped.

### Check Daemon Status

```bash
# Check if daemon is running
repo-roller daemon status
```

**Output when running:**

```
Daemon Status
──────────────────────────────────────────────────────────

  Status          Running
  PID            12345
  Uptime         2h 34m
  Socket         /home/user/.cache/repo-roller/daemon.sock

  Activity
    Connections  45
    Requests     234
    Cache Size   8 projects

  Cached Projects
    • /home/user/projects/my-app
    • /home/user/projects/api-server
    • /home/user/projects/webapp
    ... and 5 more
```

**Output when not running:**

```
Daemon is not running
```

### Stop Daemon

```bash
# Gracefully stop daemon
repo-roller daemon stop

# Force stop (if graceful fails)
kill $(cat ~/.cache/repo-roller/daemon.pid)
```

## Daemon Configuration

### Socket Path

Default socket location:

```
~/.cache/repo-roller/daemon.sock
```

Custom socket:

```bash
repo-roller daemon start --socket /tmp/my-socket.sock
```

### Cache Settings

**Cache TTL (Time To Live):**

How long scan results are cached before expiring.

```bash
# Default: 5 minutes (300000 ms)
repo-roller daemon start --cache-ttl 300000

# 10 minutes
repo-roller daemon start --cache-ttl 600000

# 1 hour
repo-roller daemon start --cache-ttl 3600000
```

**Max Cache Size:**

Maximum number of project scans to keep in memory.

```bash
# Default: 10 projects
repo-roller daemon start --max-cache-size 10

# Larger cache for many projects
repo-roller daemon start --max-cache-size 50
```

### PID File

Daemon PID is stored at:

```
~/.cache/repo-roller/daemon.pid
```

Use this to check if daemon is running or to stop it manually.

## JSON-RPC Interface

The daemon exposes a JSON-RPC 2.0 interface over a Unix domain socket.

### Request Format

```json
{
  "id": "unique-request-id",
  "method": "method.name",
  "params": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

### Response Format

**Success:**

```json
{
  "id": "unique-request-id",
  "result": {
    "data": "response data"
  }
}
```

**Error:**

```json
{
  "id": "unique-request-id",
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": "additional error info"
  }
}
```

## Available RPC Methods

### Daemon Management

#### daemon.status

Get daemon status and statistics.

**Request:**

```json
{
  "id": "1",
  "method": "daemon.status",
  "params": {}
}
```

**Response:**

```json
{
  "id": "1",
  "result": {
    "uptime": 9240000,
    "activeConnections": 2,
    "requestCount": 234,
    "cacheSize": 8,
    "cachedProjects": [
      "/home/user/projects/my-app",
      "/home/user/projects/api-server"
    ]
  }
}
```

#### daemon.ping

Health check.

**Request:**

```json
{
  "id": "2",
  "method": "daemon.ping",
  "params": {}
}
```

**Response:**

```json
{
  "id": "2",
  "result": {
    "pong": true,
    "timestamp": 1704067200000
  }
}
```

#### daemon.shutdown

Gracefully stop the daemon.

**Request:**

```json
{
  "id": "3",
  "method": "daemon.shutdown",
  "params": {}
}
```

**Response:**

```json
{
  "id": "3",
  "result": {
    "shutting_down": true
  }
}
```

### Project Operations

#### project.scan

Scan a project for files (with caching).

**Request:**

```json
{
  "id": "4",
  "method": "project.scan",
  "params": {
    "root": "/home/user/projects/my-app",
    "preset": "typescript",
    "force": false
  }
}
```

**Response:**

```json
{
  "id": "4",
  "result": {
    "cached": false,
    "files": 42,
    "totalBytes": 156300,
    "extensionCounts": {
      "ts": 38,
      "json": 3,
      "md": 1
    },
    "fileList": [
      "src/index.ts",
      "src/core/types.ts"
    ]
  }
}
```

**Parameters:**

- `root` - Project directory path (default: current directory)
- `preset` - Preset name (optional)
- `profile` - Profile name (optional)
- `ext` - Extensions filter (optional)
- `include` - Include patterns (optional)
- `exclude` - Exclude patterns (optional)
- `force` - Force refresh, bypass cache (default: false)

#### bundle.generate

Generate a bundle (uses cache if available).

**Request:**

```json
{
  "id": "5",
  "method": "bundle.generate",
  "params": {
    "root": "/home/user/projects/my-app",
    "preset": "typescript",
    "format": "markdown",
    "outFile": "./bundle.md",
    "stripComments": true,
    "withTree": true,
    "withStats": true,
    "returnContent": false
  }
}
```

**Response:**

```json
{
  "id": "5",
  "result": {
    "outputFile": "./bundle.md",
    "fileCount": 42,
    "totalBytes": 156300,
    "estimatedTokens": 12500,
    "estimatedCost": 0.0188,
    "duration": 234,
    "historyId": "a1b2c3d4e5f6g7h8"
  }
}
```

**Parameters:**

- `root` - Project directory (default: current directory)
- `preset` - Preset name (optional)
- `profile` - Profile name (optional)
- `format` - Output format: `md`, `json`, `yaml`, `txt` (optional)
- `ext` - Extensions filter (optional)
- `include` - Include patterns (optional)
- `exclude` - Exclude patterns (optional)
- `stripComments` - Strip code comments (optional)
- `withTree` - Include directory tree (optional)
- `withStats` - Include statistics (optional)
- `model` - Model preset (optional)
- `outFile` - Output file path (optional)
- `returnContent` - Return bundle content in response (default: false)

#### tokens.estimate

Estimate tokens for a cached project scan.

**Request:**

```json
{
  "id": "6",
  "method": "tokens.estimate",
  "params": {
    "root": "/home/user/projects/my-app"
  }
}
```

**Response:**

```json
{
  "id": "6",
  "result": {
    "tokens": 12500,
    "estimates": [
      {
        "provider": "claude-sonnet",
        "tokens": 12500,
        "cost": 0.0188,
        "withinContext": true
      },
      {
        "provider": "gpt-4o",
        "tokens": 12500,
        "cost": 0.0250,
        "withinContext": true
      },
      {
        "provider": "gemini-1.5-pro",
        "tokens": 12500,
        "cost": 0.0156,
        "withinContext": true
      }
    ]
  }
}
```

**Note:** Requires a cached scan. Call `project.scan` first.

### History Operations

#### history.list

List recent history entries.

**Request:**

```json
{
  "id": "7",
  "method": "history.list",
  "params": {
    "limit": 10,
    "project": "my-app"
  }
}
```

**Response:**

```json
{
  "id": "7",
  "result": [
    {
      "id": "a1b2c3d4e5f6g7h8",
      "timestamp": "2024-01-15T14:30:45.123Z",
      "project": "my-app",
      "files": 42,
      "tokens": 12500,
      "cost": 0.0188
    }
  ]
}
```

#### history.get

Get a specific history entry.

**Request:**

```json
{
  "id": "8",
  "method": "history.get",
  "params": {
    "id": "a1b2c3d4"
  }
}
```

**Response:**

```json
{
  "id": "8",
  "result": {
    "id": "a1b2c3d4e5f6g7h8",
    "timestamp": "2024-01-15T14:30:45.123Z",
    "project": { /* full project info */ },
    "command": { /* full command info */ },
    "result": { /* full result info */ },
    "files": { /* file list */ }
  }
}
```

#### history.stats

Get history statistics.

**Request:**

```json
{
  "id": "9",
  "method": "history.stats",
  "params": {}
}
```

**Response:**

```json
{
  "id": "9",
  "result": {
    "totalRuns": 156,
    "uniqueProjects": 8,
    "averageFilesPerRun": 34,
    "totalTokensGenerated": 1234567,
    "totalCostIncurred": 18.52
  }
}
```

### Cache Management

#### cache.clear

Clear project cache.

**Request:**

```json
{
  "id": "10",
  "method": "cache.clear",
  "params": {
    "project": "/home/user/projects/my-app"
  }
}
```

**Response:**

```json
{
  "id": "10",
  "result": {
    "cleared": "/home/user/projects/my-app"
  }
}
```

**Clear all:**

```json
{
  "id": "11",
  "method": "cache.clear",
  "params": {}
}
```

**Response:**

```json
{
  "id": "11",
  "result": {
    "cleared": "all",
    "count": 8
  }
}
```

#### cache.stats

View cache statistics.

**Request:**

```json
{
  "id": "12",
  "method": "cache.stats",
  "params": {}
}
```

**Response:**

```json
{
  "id": "12",
  "result": {
    "size": 8,
    "entries": [
      {
        "path": "/home/user/projects/my-app",
        "files": 42,
        "bytes": 156300,
        "age": 120000
      }
    ]
  }
}
```

### Schema Introspection

#### schema.cli

Get CLI schema for tool builders.

**Request:**

```json
{
  "id": "13",
  "method": "schema.cli",
  "params": {}
}
```

**Response:**

```json
{
  "id": "13",
  "result": {
    "commands": [ /* CLI command schema */ ],
    "options": [ /* CLI options schema */ ]
  }
}
```

#### schema.llm

Get LLM tool definition for AI assistants.

**Request:**

```json
{
  "id": "14",
  "method": "schema.llm",
  "params": {}
}
```

**Response:**

```json
{
  "id": "14",
  "result": {
    "type": "function",
    "function": {
      "name": "repo_roller",
      "description": "Generate code bundles for LLM context",
      "parameters": { /* JSON Schema */ }
    }
  }
}
```

## Using the Daemon

### From Node.js

```javascript
import { createConnection } from 'net';

const SOCKET_PATH = process.env.HOME + '/.cache/repo-roller/daemon.sock';

function sendRequest(method, params) {
  return new Promise((resolve, reject) => {
    const socket = createConnection(SOCKET_PATH);

    const request = {
      id: Date.now().toString(),
      method,
      params
    };

    socket.write(JSON.stringify(request) + '\n');

    let buffer = '';
    socket.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          const response = JSON.parse(line);
          socket.end();
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        }
      }
    });

    socket.on('error', reject);
  });
}

// Usage
const result = await sendRequest('project.scan', {
  root: '/path/to/project',
  preset: 'typescript'
});

console.log(`Found ${result.files} files`);
```

### From Python

```python
import socket
import json
import os

SOCKET_PATH = os.path.expanduser('~/.cache/repo-roller/daemon.sock')

def send_request(method, params=None):
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    sock.connect(SOCKET_PATH)

    request = {
        'id': str(time.time()),
        'method': method,
        'params': params or {}
    }

    sock.sendall((json.dumps(request) + '\n').encode())

    response = ''
    while True:
        chunk = sock.recv(4096).decode()
        if not chunk:
            break
        response += chunk
        if '\n' in response:
            break

    sock.close()

    result = json.loads(response.strip())
    if 'error' in result:
        raise Exception(result['error']['message'])
    return result['result']

# Usage
result = send_request('project.scan', {
    'root': '/path/to/project',
    'preset': 'typescript'
})

print(f"Found {result['files']} files")
```

### From Shell Script

```bash
#!/bin/bash

SOCKET_PATH="$HOME/.cache/repo-roller/daemon.sock"

send_request() {
  local method=$1
  local params=$2

  local request=$(cat <<EOF
{"id":"$(date +%s)","method":"$method","params":$params}
EOF
)

  echo "$request" | nc -U "$SOCKET_PATH" | head -1
}

# Usage
result=$(send_request "daemon.status" "{}")
echo "$result" | jq .
```

## Caching Behavior

### How Caching Works

1. **First scan** - Project is scanned, results cached with timestamp
2. **Cache hit** - Subsequent scans return cached results (if within TTL)
3. **Cache miss** - After TTL expires, project is re-scanned
4. **Cache eviction** - Oldest entries removed when cache is full

### Cache Key

Cache is keyed by:
- Project root path (absolute)
- Scan options (preset, profile, filters)

Changing options invalidates the cache for that combination.

### Force Refresh

Bypass cache and force re-scan:

```json
{
  "method": "project.scan",
  "params": {
    "root": "/path/to/project",
    "force": true
  }
}
```

### Cache TTL

**Default: 5 minutes**

After 5 minutes, cached results expire and the project is re-scanned on the next request.

**Adjust TTL:**

```bash
# 10 minute cache
repo-roller daemon start --cache-ttl 600000

# 1 hour cache (for stable projects)
repo-roller daemon start --cache-ttl 3600000
```

### Cache Size

**Default: 10 projects**

The daemon keeps the 10 most recently scanned projects in memory.

**Adjust size:**

```bash
# Cache 50 projects (for multi-project workflows)
repo-roller daemon start --max-cache-size 50
```

## IDE Integration Use Cases

### VS Code Extension

```typescript
// extension.ts
import { DaemonClient } from './daemon-client';

export async function activate(context: vscode.ExtensionContext) {
  const daemon = new DaemonClient();

  const command = vscode.commands.registerCommand(
    'repo-roller.generateBundle',
    async () => {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

      const result = await daemon.request('bundle.generate', {
        root: workspaceRoot,
        preset: 'typescript',
        format: 'markdown'
      });

      vscode.window.showInformationMessage(
        `Bundle generated: ${result.fileCount} files, ${result.estimatedTokens} tokens`
      );
    }
  );

  context.subscriptions.push(command);
}
```

### JetBrains Plugin

```kotlin
// BundleAction.kt
class GenerateBundleAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val projectPath = project.basePath ?: return

        val result = DaemonClient.sendRequest("bundle.generate", mapOf(
            "root" to projectPath,
            "preset" to "typescript"
        ))

        Messages.showInfoMessage(
            "Generated bundle: ${result["fileCount"]} files",
            "Bundle Generated"
        )
    }
}
```

### Emacs Package

```elisp
;; repo-roller.el
(defun repo-roller-generate-bundle ()
  "Generate a bundle using repo-roller daemon."
  (interactive)
  (let* ((root (projectile-project-root))
         (response (repo-roller--daemon-request
                    "bundle.generate"
                    `((root . ,root) (preset . "typescript")))))
    (message "Generated bundle: %d files, %d tokens"
             (alist-get 'fileCount response)
             (alist-get 'estimatedTokens response))))

(defun repo-roller--daemon-request (method params)
  "Send JSON-RPC request to daemon."
  (let ((socket (make-network-process
                 :name "repo-roller"
                 :remote "~/.cache/repo-roller/daemon.sock")))
    ;; Send request and parse response
    ;; ...
    ))
```

## Troubleshooting

### Daemon Won't Start

**Problem:** `repo-roller daemon start` fails

**Solution:**

```bash
# Check if socket file exists
ls -la ~/.cache/repo-roller/daemon.sock

# Remove stale socket
rm ~/.cache/repo-roller/daemon.sock

# Try again
repo-roller daemon start
```

### Can't Connect to Daemon

**Problem:** RPC requests fail with connection error

**Solution:**

```bash
# Check daemon status
repo-roller daemon status

# Check socket path
ls -la ~/.cache/repo-roller/daemon.sock

# Verify PID file
cat ~/.cache/repo-roller/daemon.pid
ps aux | grep $(cat ~/.cache/repo-roller/daemon.pid)
```

### Stale Cache

**Problem:** Daemon returns outdated file lists

**Solution:**

```bash
# Clear cache for specific project
# (via RPC or CLI once implemented)

# Or restart daemon
repo-roller daemon stop
repo-roller daemon start
```

### High Memory Usage

**Problem:** Daemon uses too much memory

**Solution:**

```bash
# Reduce cache size
repo-roller daemon stop
repo-roller daemon start --max-cache-size 5

# Reduce TTL to expire cache faster
repo-roller daemon start --cache-ttl 60000  # 1 minute
```

## Best Practices

### 1. Use Daemon for Development Workflows

Start daemon when you begin work:

```bash
# In your .bashrc or .zshrc
alias work-start='repo-roller daemon start'
alias work-stop='repo-roller daemon stop'
```

### 2. Tune Cache Settings for Your Workflow

**Frequent changes:**
```bash
# Short TTL for active development
repo-roller daemon start --cache-ttl 60000  # 1 minute
```

**Stable codebase:**
```bash
# Long TTL for stable projects
repo-roller daemon start --cache-ttl 3600000  # 1 hour
```

### 3. Monitor Daemon Health

Check status periodically:

```bash
repo-roller daemon status
```

### 4. Graceful Shutdown

Always stop daemon gracefully:

```bash
repo-roller daemon stop
```

Don't kill the process unless necessary.

### 5. Use Force Refresh When Needed

After major file changes, force refresh:

```json
{
  "method": "project.scan",
  "params": {
    "force": true
  }
}
```

## Related Documentation

- **[API Reference](/api/)** - Programmatic API
- **[CI/CD Integration](/guide/ci-cd)** - Automation
- **[Interactive Mode](/guide/interactive-mode)** - Interactive TUI
- **[Getting Started](/guide/getting-started)** - Basic usage

## Next Steps

- **Start the daemon** - `repo-roller daemon start`
- **Check status** - `repo-roller daemon status`
- **Build an integration** - Use JSON-RPC API
- **Explore examples** - See IDE integration patterns
