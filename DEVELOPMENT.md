# CtxCopy Development Guide

This guide provides end-to-end instructions for maintaining, testing, packaging, and publishing the **CtxCopy** VS Code extension.

---

## 1. Prerequisites

Ensure your workstation has the following tools installed:

- **Node.js**: `v18.0.0` or newer (Recommended: Current LTS, e.g. Node 20.x or 22.x)
- **npm**: `v9.0.0` or newer
- **VS Code**: `v1.85.0` or newer
- **Git**: For source control management

Verify your versions:

```bash
node -v
npm -v
git --version
```

---

## 2. Installing Dependencies

Clone or navigate to the repository directory and run:

```bash
cd ctxcopy
npm install
```

This installs:
- TypeScript compiler (`tsc`)
- Modern bundler (`esbuild`)
- ESLint and TypeScript ESLint plugins
- Mocha test framework
- VS Code extension test runner (`@vscode/test-electron`)
- Official extension packager (`@vscode/vsce`)

---

## 3. Opening the Project in VS Code

Open the workspace folder in VS Code:

```bash
code .
```

VS Code will automatically detect the `.vscode/launch.json` and `.vscode/tasks.json` configuration files included in the repository.

---

## 4. Running the Extension in Extension Development Host

To launch and run the extension interactively:

1. Press `F5` in VS Code (or navigate to the **Run and Debug** view and select **Run Extension**).
2. VS Code runs the pre-launch task `npm: bundle:dev` to build `dist/extension.js` via `esbuild`.
3. A new **Extension Development Host** window opens.
4. In the Extension Development Host:
   - Open any workspace or folder.
   - The **CtxCopy** icon appears in the Activity Bar.
   - Right-click any file in the Explorer to access **Add to CtxCopy** or **Copy with CtxCopy**.
   - Use shortcuts `Ctrl+Alt+C` or `Ctrl+Alt+A`.

To inspect logs or debug breakpoints:
- Set breakpoints directly in the TypeScript files inside `src/`.
- The Extension Development Host hits breakpoints via generated source maps.
- Use **Developer: Toggle Developer Tools** in the Extension Development Host to inspect console logs or UI elements.

---

## 5. Linting, Type-Checking, and Building

### Type Checking (TypeScript)

To run the TypeScript compiler and ensure all types adhere to strict mode:

```bash
npm run compile
```

To run the compiler in watch mode during development:

```bash
npm run watch
```

### Linting (ESLint)

To check code quality and ensure style compliance:

```bash
npm run lint
```

### Production Build (esbuild)

To produce an optimized, minified bundle in `dist/extension.js`:

```bash
npm run build
```

---

## 6. Running Tests

The test suite covers:
- Formatting logic and whitespace handling (`src/test/suite/formatter.test.ts`)
- Sensitive file and credential heuristics (`src/test/suite/secrets.test.ts`)
- Binary file detection, UTF-8 validation, and byte formatting (`src/test/suite/fileReader.test.ts`)
- Selection state, de-duplication, and event emitters (`src/test/suite/selectionManager.test.ts`)

To execute the test suite:

```bash
npm test
```

This compiles TypeScript and launches an isolated, headless instance of VS Code via `@vscode/test-electron` to execute Mocha tests against the actual VS Code runtime.

---

## 7. Packaging a `.vsix`

A `.vsix` file is the distributable archive format for VS Code extensions.

To package the extension into a local `.vsix`:

```bash
npm run package
```

This creates a file named `ctxcopy-0.1.0.vsix` in the project root.

### Testing the Packaged `.vsix` Locally

You can test installing your `.vsix` in your everyday VS Code before publishing:

```bash
code --install-extension ctxcopy-0.1.0.vsix
```

Or in VS Code:
1. Open the **Extensions** view (`Ctrl+Shift+X`).
2. Click the **...** (Views and More Actions) menu in the top-right corner.
3. Select **Install from VSIX...**.
4. Choose `ctxcopy-0.1.0.vsix`.

---

## 8. Creating a VS Code Marketplace Publisher

To publish extensions to the public VS Code Marketplace, you must have a registered Publisher ID.

1. Navigate to the [Visual Studio Marketplace Management Portal](https://marketplace.visualstudio.com/manage).
2. Sign in with your Microsoft or GitHub account.
3. Click **Create publisher**.
4. Fill in:
   - **ID**: A unique lowercase identifier (e.g. `your-name` or `your-org`). This must match the `"publisher"` field in `package.json`.
   - **Name**: The display name for your organization or user profile.
5. Accept the Marketplace terms and submit.

---

## 9. Marketplace Authentication (Personal Access Token)

Publishing via the command line requires an Azure DevOps Personal Access Token (PAT):

1. Go to [Azure DevOps](https://dev.azure.com) and log in with the same Microsoft account used for your Marketplace publisher.
2. If you don't have an organization, create one (e.g. `https://dev.azure.com/{your-org}`).
3. In the top-right corner, click **User Settings** (icon next to your profile picture) > **Personal access tokens**.
4. Click **+ New Token**.
5. Configure the token:
   - **Name**: `VS Code Marketplace Publishing`
   - **Organization**: Select **All accessible organizations**. *(Crucial: vsce requires "All accessible organizations")*
   - **Expiration**: Select desired duration (e.g. 90 days or 1 year).
   - **Scopes**:
     - Under **Marketplace**, check **Acquire** and **Manage**.
6. Click **Create** and securely copy the generated token.

Log in to `vsce` on your machine:

```bash
npx vsce login <your-publisher-id>
```

Paste your Personal Access Token when prompted. The credential is encrypted and stored locally in your OS credential store.

---

## 10. Publishing the Extension

Once logged in and tested:

```bash
npm run build
npx vsce publish
```

Alternatively, you can upload the `.vsix` file manually via the web interface:
1. Go to [Marketplace Management Portal](https://marketplace.visualstudio.com/manage).
2. Find your publisher and click **New extension > Visual Studio Code**.
3. Drag and drop the packaged `.vsix` file.

Within a few minutes, the extension will be verified and published publicly.

---

## 11. Updating and Versioning the Extension

Follow [Semantic Versioning](https://semver.org/):

- **Patch** (`0.1.0` -> `0.1.1`): Bug fixes, non-breaking minor tweaks.
- **Minor** (`0.1.0` -> `0.2.0`): New backward-compatible functionality (e.g. new formatting options).
- **Major** (`0.1.0` -> `1.0.0`): Breaking architectural or behavior changes.

To increment the version and publish in one command:

```bash
# For a patch release
npx vsce publish patch

# For a minor release
npx vsce publish minor

# For a major release
npx vsce publish major
```

`vsce` automatically updates `package.json`, creates a Git tag, and uploads the new version to the Marketplace.

---

## 12. Marketplace Requirements and Policies

Before publishing to the official Marketplace, ensure your extension meets official requirements:

1. **Manifest Fields**:
   - `publisher`: Must match your Marketplace publisher ID.
   - `repository`: Must link to a valid public Git repository URL.
   - `license`: Must specify a standard SPDX license identifier (e.g. `MIT`).
   - `icon`: Relative path to a square PNG or SVG file (e.g. `media/icon.svg`).
2. **README**:
   - Must contain a clear, helpful `README.md` at the project root.
3. **No Malicious Behavior**:
   - No hidden network calls, arbitrary remote code execution, or tracking without consent.
   - CtxCopy operates strictly in local memory and file storage.
4. **Bundle Size**:
   - Extensions should remain lean. The bundled `dist/extension.js` generated by `esbuild` is under 100 KB.
