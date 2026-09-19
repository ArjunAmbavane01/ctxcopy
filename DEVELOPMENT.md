# CtxCopy Development Guide

A quick reference and development guide for building, testing, packaging, and releasing **CtxCopy**.

---

## 1. Quick Reference: Scripts & Commands

| Task | Command | Description |
| :--- | :--- | :--- |
| **Install** | `npm install` | Install all development dependencies |
| **Run / Debug** | Press `F5` in VS Code | Launch Extension Development Host with debugger |
| **Dev Bundle** | `npm run bundle:dev` | Bundle development build using esbuild |
| **Type Check** | `npm run compile` | Run TypeScript compiler (`tsc`) |
| **Watch Mode** | `npm run watch` | Compile TypeScript continuously on file changes |
| **Lint** | `npm run lint` | Check code quality via ESLint |
| **Integration Tests** | `npm test` | Run tests in an isolated VS Code instance |
| **Unit Tests** | `npm run test:unit` | Run unit tests directly via Node.js |
| **Production Build** | `npm run build` | Generate minified production bundle in `dist/` |
| **Package VSIX** | `npm run package` | Package `ctxcopy-<version>.vsix` for release |

---

## 2. Prerequisites

- **Node.js**: `v18.0.0` or newer (Recommended: Node 20.x or 22.x LTS)
- **npm**: `v9.0.0` or newer
- **VS Code**: `v1.85.0` or newer
- **Git**: Installed and configured

---

## 3. Local Development & Debugging

1. Open this repository in VS Code:
   ```bash
   code .
   ```
2. Press **`F5`** (or open **Run and Debug** > **Run Extension**).
3. A new **Extension Development Host** window opens with CtxCopy loaded.
4. Test the extension features in the new window:
   - **Activity Bar**: Click the CtxCopy icon to open the staged files list.
   - **Shortcuts**:
     - `Alt+C` (`Cmd+Alt+C` on macOS): Copy active file directly to clipboard.
     - `Alt+A` (`Cmd+Alt+A` on macOS): Add or remove active file from selection.
     - `Alt+Shift+C` (`Cmd+Alt+Shift+C` on macOS): Copy all selected files to clipboard.
     - `Alt+Shift+X` (`Cmd+Alt+Shift+X` on macOS): Clear selection.
   - **Context Menus**: Right-click files in Explorer to add or copy.
5. **Breakpoints & Logs**:
   - Set breakpoints directly inside `src/**/*.ts`.
   - In the Extension Development Host window, run **Developer: Toggle Developer Tools** (`Ctrl+Shift+I` / `Cmd+Option+I`) to view console logs.

---

## 4. Testing & Code Quality

Run tests and linting before packaging or committing:

```bash
# Type-check TypeScript
npm run compile

# Lint TypeScript code
npm run lint

# Run fast unit tests
npm run test:unit

# Run full integration tests (launches headless VS Code)
npm test
```

---

## 5. Building & Packaging

To create a distributable `.vsix` package:

```bash
npm run package
```

This runs `vscode:prepublish` (which compiles `dist/extension.js` with `esbuild`) and produces:
```text
ctxcopy-<version>.vsix
```

### Testing the VSIX Locally
You can test the packaged extension in your primary VS Code before releasing:

```bash
code --install-extension ctxcopy-0.1.0.vsix
```

*(Or open Extensions view > `...` menu > **Install from VSIX...**)*.

---

## 6. Publishing Updates

Your extension identifier on the Marketplace is:
```text
ArjunAmbavane.ctxcopy
```

### The Web Portal Way (Fast & Simple)

Whenever you want to release an update:

1. Update `"version"` in `package.json` (e.g. from `"0.1.0"` to `"0.1.1"`):
   ```json
   "version": "0.1.1"
   ```
2. Build and package the new `.vsix`:
   ```bash
   npm run build
   npm run package
   ```
3. Go to the [Visual Studio Marketplace Management Portal](https://marketplace.visualstudio.com/manage).
4. Find **CtxCopy** in your extensions list.
5. Click the **`...`** (More Actions) menu next to CtxCopy > **Update**.
6. Upload the newly generated `ctxcopy-0.1.1.vsix`.
7. The Marketplace validates and rolls out the update automatically.

---

### The CLI Way (Optional via `vsce`)

If you prefer publishing directly from your terminal:

```bash
# Auto-increments version in package.json, creates git commit & tag, and publishes:
npx @vscode/vsce publish patch   # 0.1.0 -> 0.1.1
npx @vscode/vsce publish minor   # 0.1.0 -> 0.2.0
npx @vscode/vsce publish major   # 0.1.0 -> 1.0.0
```

*(Requires a Personal Access Token or Azure credential configured with `npx @vscode/vsce login ArjunAmbavane`).*

---

## 7. Project Architecture

```text
ctxcopy/
├── .vscode/             # VS Code launch and task configs
├── media/               # Icons and UI assets
├── src/
│   ├── commands/        # Command registrations and handlers
│   ├── formatter/       # Structured clipboard formatting
│   ├── selection/       # Staged file selection state & Explorer decorators
│   ├── utils/           # UTF-8 reader, binary detection, secrets heuristics
│   ├── views/           # Activity Bar TreeDataProvider views
│   ├── test/            # Mocha and @vscode/test-electron test suites
│   └── extension.ts     # Extension activation entry point
├── esbuild.js           # Fast production & dev bundler
├── package.json         # Extension manifest, commands, menus, shortcuts
└── tsconfig.json        # TypeScript configuration
```
