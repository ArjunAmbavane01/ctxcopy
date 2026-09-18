# CtxCopy

CtxCopy is a lightweight VS Code extension for staging and copying workspace files directly to your clipboard in a structured format designed for LLM prompts and code review assistants (e.g., ChatGPT, Claude, Gemini).

It operates locally within your editor with no telemetry, external network requests, or background daemons.

---

## How It Works

When copying selected files, CtxCopy reads their content as UTF-8 text, verifies they are not binary or unreadable, formats each file with its workspace-relative path, and writes the consolidated payload directly to the system clipboard.

### Clipboard Format

Single file:

```text
src/components/TaskRow.tsx

<file contents>
```

Multiple files:

```text
src/components/TaskRow.tsx

<file contents>

src/components/MissedTasksSheet.tsx

<file contents>

convex/tasks.ts

<file contents>
```

---

## Usage

### 1. Multi-File Selection (CtxCopy View)

1. Open the **CtxCopy** view from the Activity Bar.
2. Add files using any of these methods:
   - Click **Add Files...** (`+`) in the CtxCopy view toolbar to search and select files across the workspace.
   - Right-click any file or folder in the VS Code File Explorer and select **Add to CtxCopy**.
   - With an active file open in the editor, run **CtxCopy: Add Current File** (`Ctrl+Alt+A` / `Cmd+Alt+A`).
3. View your staged files in the CtxCopy sidebar list.
4. Click **Copy Selected Files** in the view header (`Ctrl+Alt+Shift+C` / `Cmd+Alt+Shift+C`) to copy all staged files.
5. Click **Clear Selection** (`Ctrl+Alt+Shift+X` / `Cmd+Alt+Shift+X`) to reset the list.

Files currently staged in CtxCopy are decorated with a `✓` indicator in the VS Code File Explorer.

### 2. Quick Single-File Copy

- **Explorer Context Menu**: Right-click any file in the VS Code Explorer and click **Copy with CtxCopy**.
- **Editor Action / Shortcut**: Press `Ctrl+Alt+C` (`Cmd+Alt+C` on macOS) while editing any file.

---

## Commands and Shortcuts

| Command | Title | Default Shortcut |
| :--- | :--- | :--- |
| `ctxcopy.copyCurrentFile` | CtxCopy: Copy Current File | `Ctrl+Alt+C` (`Cmd+Alt+C`) |
| `ctxcopy.addCurrentFile` | CtxCopy: Add Current File | `Ctrl+Alt+A` (`Cmd+Alt+A`) |
| `ctxcopy.copySelectedFiles` | CtxCopy: Copy Selected Files | `Ctrl+Alt+Shift+C` (`Cmd+Alt+Shift+C`) |
| `ctxcopy.clearSelection` | CtxCopy: Clear Selection | `Ctrl+Alt+Shift+X` (`Cmd+Alt+Shift+X`) |
| `ctxcopy.addFilesQuickPick` | CtxCopy: Add Files to Selection... | - |
| `ctxcopy.copyFileDirect` | Copy with CtxCopy | - |
| `ctxcopy.addFileToSelection` | Add to CtxCopy | - |

---

## Configuration

Settings can be customized under **Preferences > Settings > Extensions > CtxCopy**:

- `ctxcopy.warnOnSecrets` (default: `true`): Prompt for confirmation when attempting to copy sensitive files (e.g. `.env`, `.pem`, credentials).
- `ctxcopy.maxFileSizeKB` (default: `2048`): Maximum file size in KB permitted before warning about potential performance issues.
- `ctxcopy.includeLineNumbers` (default: `false`): Prefix each line in the copied output with line numbers.

---

## Project Structure

```text
ctxcopy/
├── .vscode/             # Launch and build task configurations
├── media/               # Activity Bar icons
├── src/
│   ├── commands/        # Extension command definitions and registrations
│   ├── formatter/       # Clipboard formatting logic
│   ├── selection/       # Selection state management and Explorer decorations
│   ├── utils/           # UTF-8 file reader, binary detection, secret heuristics
│   ├── views/           # CtxCopy TreeDataProvider and sidebar view
│   ├── test/            # Mocha and @vscode/test-electron test suites
│   └── extension.ts     # Extension activation and lifecycle
├── esbuild.js           # Production & development bundler
├── package.json         # Extension manifest and contributions
└── tsconfig.json        # TypeScript configuration
```

---

## Development Setup

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- VS Code 1.85.0 or later

### Install & Build

```bash
npm install
npm run build
```

### Running the Extension Locally

1. Open this repository in VS Code:
   ```bash
   code .
   ```
2. Press `F5` (or go to **Run and Debug** and choose **Run Extension**).
3. A new **Extension Development Host** window will open with CtxCopy active.

### Running Tests

```bash
npm test
```

### Packaging

To build a `.vsix` package locally:

```bash
npm run package
```

For full release, publisher account setup, and publishing instructions, refer to [DEVELOPMENT.md](./DEVELOPMENT.md).

---

## License

MIT
