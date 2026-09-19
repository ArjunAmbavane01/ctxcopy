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
4. Click **Copy Selected Files** in the view header (`Alt+Shift+C` / `Cmd+Alt+Shift+C`) to copy all staged files.
5. Click **Clear Selection** (`Alt+Shift+X` / `Cmd+Alt+Shift+X`) to reset the list.

Files currently staged in CtxCopy are decorated with a green `✓` indicator in the VS Code File Explorer and Workspace Explorer.

### 2. Quick Single-File Copy

- **Explorer Context Menu**: Right-click any file in the VS Code Explorer and click **Copy with CtxCopy**.
- **Editor Action / Shortcut**: Press `Alt+C` (`Cmd+Alt+C` on macOS) while editing any file.

---

## Commands and Shortcuts

| Command | Title | Default Shortcut |
| :--- | :--- | :--- |
| `ctxcopy.toggleCurrentFile` | CtxCopy: Toggle Current File Selection | `Alt+A` (`Cmd+Alt+A`) |
| `ctxcopy.copyCurrentFile` | CtxCopy: Copy Current File | `Alt+C` (`Cmd+Alt+C`) |
| `ctxcopy.copySelectedFiles` | CtxCopy: Copy Selected Files | `Alt+Shift+C` (`Cmd+Alt+Shift+C`) |
| `ctxcopy.clearSelection` | CtxCopy: Clear Selection | `Alt+Shift+X` (`Cmd+Alt+Shift+X`) |
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

## Installation

### From VS Code Marketplace

1. Open VS Code and press `Ctrl+Shift+X` (`Cmd+Shift+X` on macOS) to open the Extensions view.
2. Search for **CtxCopy** (by `ArjunAmbavane`).
3. Click **Install**.

Or install from the command line:

```bash
code --install-extension ArjunAmbavane.ctxcopy
```

---

## Development

For instructions on running from source, building, testing, packaging, and publishing updates, refer to [DEVELOPMENT.md](./DEVELOPMENT.md).

---

## License

MIT
