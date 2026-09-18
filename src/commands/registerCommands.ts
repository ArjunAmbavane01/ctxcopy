import * as path from 'path';
import * as vscode from 'vscode';
import { formatFilesForClipboard, formatSingleFile } from '../formatter/clipboardFormatter';
import { SelectionManager } from '../selection/selectionManager';
import { readFileAsText, FileReadSuccess, getRelativePath } from '../utils/fileReader';
import { findSecretFiles } from '../utils/secrets';
import { SelectedFileTreeItem } from '../views/selectedFilesTreeProvider';

interface CtxCopyConfig {
  warnOnSecrets: boolean;
  maxFileSizeKB: number;
  includeLineNumbers: boolean;
}

function getConfig(): CtxCopyConfig {
  const config = vscode.workspace.getConfiguration('ctxcopy');
  return {
    warnOnSecrets: config.get<boolean>('warnOnSecrets', true),
    maxFileSizeKB: config.get<number>('maxFileSizeKB', 2048),
    includeLineNumbers: config.get<boolean>('includeLineNumbers', false)
  };
}

/**
 * Resolves a list of Uris, expanding any directories into their contained files.
 */
async function resolveUrisToFiles(uris: vscode.Uri[]): Promise<vscode.Uri[]> {
  const fileUris: vscode.Uri[] = [];

  for (const uri of uris) {
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type & vscode.FileType.Directory) {
        const pattern = new vscode.RelativePattern(uri, '**/*');
        const found = await vscode.workspace.findFiles(
          pattern,
          '**/{.git,node_modules,.next,dist,out,build,coverage}/**'
        );
        fileUris.push(...found);
      } else {
        fileUris.push(uri);
      }
    } catch {
      fileUris.push(uri);
    }
  }

  return fileUris;
}

/**
 * Prompts user confirmation if any of the target Uris are detected as sensitive files.
 * Returns true if safe to proceed, false if cancelled.
 */
async function checkSecretsConfirmation(uris: vscode.Uri[], warnEnabled: boolean): Promise<boolean> {
  if (!warnEnabled) {
    return true;
  }

  const secrets = findSecretFiles(uris);
  if (secrets.length === 0) {
    return true;
  }

  const names = secrets.map(u => path.basename(u.fsPath)).join(', ');
  const message = secrets.length === 1
    ? `CtxCopy: "${names}" appears to contain secrets or credentials. Are you sure you want to copy it to the clipboard?`
    : `CtxCopy: The selection includes ${secrets.length} potential secret/credential files (${names}). Are you sure you want to copy them to the clipboard?`;

  const choice = await vscode.window.showWarningMessage(
    message,
    { modal: true },
    'Copy Anyway'
  );

  return choice === 'Copy Anyway';
}

/**
 * Reads a collection of Uris, reporting any failures and returning successful files.
 */
async function readFilesWithReporting(
  uris: vscode.Uri[],
  maxFileSizeKB: number
): Promise<FileReadSuccess[]> {
  const successes: FileReadSuccess[] = [];
  const failures: string[] = [];

  for (const uri of uris) {
    const result = await readFileAsText(uri, maxFileSizeKB);
    if (result.success) {
      successes.push(result.file);
    } else {
      failures.push(result.failure.errorMessage);
    }
  }

  if (failures.length > 0) {
    if (successes.length === 0) {
      if (failures.length === 1) {
        vscode.window.showErrorMessage(failures[0]);
      } else {
        vscode.window.showErrorMessage(`CtxCopy could not read ${failures.length} files:\n${failures.slice(0, 3).join('\n')}`);
      }
      return [];
    } else {
      // Partial failure: warn about skipped files
      const firstFailure = failures[0];
      const additional = failures.length > 1 ? ` (+${failures.length - 1} other files)` : '';
      vscode.window.showWarningMessage(`CtxCopy skipped unreadable file: ${firstFailure}${additional}`);
    }
  }

  return successes;
}

/**
 * Registers all commands for CtxCopy.
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  selectionManager: SelectionManager
): void {
  const config = getConfig();

  // 1. Copy Current File
  context.subscriptions.push(
    vscode.commands.registerCommand('ctxcopy.copyCurrentFile', async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor || !activeEditor.document || activeEditor.document.isUntitled) {
        vscode.window.showInformationMessage('CtxCopy: No active workspace file to copy.');
        return;
      }

      const uri = activeEditor.document.uri;
      const proceed = await checkSecretsConfirmation([uri], config.warnOnSecrets);
      if (!proceed) {
        return;
      }

      const result = await readFileAsText(uri, config.maxFileSizeKB);
      if (!result.success) {
        vscode.window.showErrorMessage(result.failure.errorMessage);
        return;
      }

      const formatted = formatSingleFile(
        { relativePath: result.file.relativePath, content: result.file.content },
        { includeLineNumbers: config.includeLineNumbers }
      );

      await vscode.env.clipboard.writeText(formatted);
      vscode.window.showInformationMessage('Copied 1 file to clipboard');
    })
  );

  // 2. Add Current File
  context.subscriptions.push(
    vscode.commands.registerCommand('ctxcopy.addCurrentFile', () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor || !activeEditor.document || activeEditor.document.isUntitled) {
        vscode.window.showInformationMessage('CtxCopy: No active workspace file to add.');
        return;
      }

      const uri = activeEditor.document.uri;
      const fileName = path.basename(uri.fsPath);
      const added = selectionManager.add(uri);

      if (added > 0) {
        vscode.window.showInformationMessage(`Added ${fileName} to CtxCopy (${selectionManager.getCount()} selected)`);
      } else {
        vscode.window.showInformationMessage(`${fileName} is already in CtxCopy selection.`);
      }
    })
  );

  // 3. Copy Selected Files
  context.subscriptions.push(
    vscode.commands.registerCommand('ctxcopy.copySelectedFiles', async () => {
      const uris = selectionManager.getAll();
      if (uris.length === 0) {
        vscode.window.showInformationMessage('CtxCopy: No files selected.');
        return;
      }

      const proceed = await checkSecretsConfirmation(uris, config.warnOnSecrets);
      if (!proceed) {
        return;
      }

      const successes = await readFilesWithReporting(uris, config.maxFileSizeKB);
      if (successes.length === 0) {
        return;
      }

      const formatted = formatFilesForClipboard(
        successes.map(s => ({ relativePath: s.relativePath, content: s.content })),
        { includeLineNumbers: config.includeLineNumbers }
      );

      await vscode.env.clipboard.writeText(formatted);
      const fileCountWord = successes.length === 1 ? '1 file' : `${successes.length} files`;
      vscode.window.showInformationMessage(`Copied ${fileCountWord} to clipboard`);
    })
  );

  // 4. Clear Selection
  context.subscriptions.push(
    vscode.commands.registerCommand('ctxcopy.clearSelection', () => {
      const count = selectionManager.getCount();
      if (count === 0) {
        vscode.window.showInformationMessage('CtxCopy selection is already empty.');
        return;
      }
      selectionManager.clear();
      vscode.window.showInformationMessage('CtxCopy selection cleared.');
    })
  );

  // 5. Remove File From Selection (TreeView inline action or context menu)
  context.subscriptions.push(
    vscode.commands.registerCommand('ctxcopy.removeFileFromSelection', (item?: SelectedFileTreeItem | vscode.Uri) => {
      if (!item) {
        return;
      }
      const uri = item instanceof SelectedFileTreeItem ? item.fileUri : item;
      selectionManager.remove(uri);
    })
  );

  // 6. Copy File Directly (Explorer context menu or TreeView action)
  context.subscriptions.push(
    vscode.commands.registerCommand('ctxcopy.copyFileDirect', async (first?: SelectedFileTreeItem | vscode.Uri, all?: vscode.Uri[]) => {
      let targetUris: vscode.Uri[] = [];

      if (all && all.length > 0) {
        targetUris = all;
      } else if (first instanceof SelectedFileTreeItem) {
        targetUris = [first.fileUri];
      } else if (first instanceof vscode.Uri) {
        targetUris = [first];
      } else if (vscode.window.activeTextEditor) {
        targetUris = [vscode.window.activeTextEditor.document.uri];
      }

      if (targetUris.length === 0) {
        vscode.window.showInformationMessage('CtxCopy: No file selected to copy.');
        return;
      }

      // Expand folders if any were selected
      const resolvedFiles = await resolveUrisToFiles(targetUris);
      if (resolvedFiles.length === 0) {
        vscode.window.showInformationMessage('CtxCopy: No files found to copy.');
        return;
      }

      const proceed = await checkSecretsConfirmation(resolvedFiles, config.warnOnSecrets);
      if (!proceed) {
        return;
      }

      const successes = await readFilesWithReporting(resolvedFiles, config.maxFileSizeKB);
      if (successes.length === 0) {
        return;
      }

      const formatted = formatFilesForClipboard(
        successes.map(s => ({ relativePath: s.relativePath, content: s.content })),
        { includeLineNumbers: config.includeLineNumbers }
      );

      await vscode.env.clipboard.writeText(formatted);
      const fileCountWord = successes.length === 1 ? '1 file' : `${successes.length} files`;
      vscode.window.showInformationMessage(`Copied ${fileCountWord} to clipboard`);
    })
  );

  // 7. Add File to Selection (Explorer context menu)
  context.subscriptions.push(
    vscode.commands.registerCommand('ctxcopy.addFileToSelection', async (first?: vscode.Uri, all?: vscode.Uri[]) => {
      let targetUris: vscode.Uri[] = [];

      if (all && all.length > 0) {
        targetUris = all;
      } else if (first instanceof vscode.Uri) {
        targetUris = [first];
      } else if (vscode.window.activeTextEditor) {
        targetUris = [vscode.window.activeTextEditor.document.uri];
      }

      if (targetUris.length === 0) {
        vscode.window.showInformationMessage('CtxCopy: No file selected to add.');
        return;
      }

      // Expand folders if selected
      const resolvedFiles = await resolveUrisToFiles(targetUris);
      if (resolvedFiles.length === 0) {
        vscode.window.showInformationMessage('CtxCopy: No files found to add.');
        return;
      }

      const added = selectionManager.add(resolvedFiles);
      const total = selectionManager.getCount();
      if (added > 0) {
        const addedWord = added === 1 ? '1 file' : `${added} files`;
        vscode.window.showInformationMessage(`Added ${addedWord} to CtxCopy (${total} selected)`);
      } else {
        vscode.window.showInformationMessage('Selected file(s) are already in CtxCopy selection.');
      }
    })
  );

  // 8. Add Files via QuickPick
  context.subscriptions.push(
    vscode.commands.registerCommand('ctxcopy.addFilesQuickPick', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showInformationMessage('CtxCopy: Open a workspace or folder to select files.');
        return;
      }

      const files = await vscode.workspace.findFiles(
        '**/*',
        '**/{.git,node_modules,.next,dist,out,build,coverage}/**'
      );

      if (files.length === 0) {
        vscode.window.showInformationMessage('CtxCopy: No workspace files found.');
        return;
      }

      interface FileQuickPickItem extends vscode.QuickPickItem {
        uri: vscode.Uri;
      }

      const items: FileQuickPickItem[] = files.map(uri => {
        const relPath = getRelativePath(uri);
        const fileName = path.basename(uri.fsPath);
        const parentDir = path.dirname(relPath);
        const isSelected = selectionManager.has(uri);

        return {
          label: fileName,
          description: parentDir === '.' ? '' : parentDir,
          picked: isSelected,
          uri
        };
      });

      // Sort alphabetically by relative path
      items.sort((a, b) => a.uri.fsPath.localeCompare(b.uri.fsPath));

      const selectedItems = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: 'Select files to add to CtxCopy...',
        matchOnDescription: true
      });

      if (selectedItems) {
        const pickedUris = selectedItems.map(item => item.uri);
        // If user changed quickpick, we can either add newly picked or synchronize
        const newlyAdded = selectionManager.add(pickedUris);
        const total = selectionManager.getCount();
        vscode.window.showInformationMessage(`CtxCopy: ${total} files selected (${newlyAdded} new)`);
      }
    })
  );
}
