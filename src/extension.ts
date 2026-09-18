import * as vscode from 'vscode';
import { registerCommands } from './commands/registerCommands';
import { CtxCopyFileDecorationProvider } from './selection/fileDecorationProvider';
import { SelectionManager } from './selection/selectionManager';
import { SelectedFilesTreeProvider } from './views/selectedFilesTreeProvider';
import { WorkspaceTreeProvider } from './views/workspaceTreeProvider';

/**
 * CtxCopy Extension Activation Entry Point.
 */
export function activate(context: vscode.ExtensionContext): void {
  // 1. Initialize Selection Manager
  const selectionManager = new SelectionManager();
  context.subscriptions.push(selectionManager);

  // 2. Initialize Selected Files Tree View Provider
  const selectedTreeProvider = new SelectedFilesTreeProvider(selectionManager);
  context.subscriptions.push(selectedTreeProvider);

  const selectedTreeView = vscode.window.createTreeView('ctxcopy.selectedFilesView', {
    treeDataProvider: selectedTreeProvider,
    showCollapseAll: false
  });
  context.subscriptions.push(selectedTreeView);
  selectedTreeProvider.setTreeView(selectedTreeView);

  // 3. Initialize Workspace Explorer Tree View Provider (replicates workspace folder tree)
  const workspaceTreeProvider = new WorkspaceTreeProvider(selectionManager);
  context.subscriptions.push(workspaceTreeProvider);

  const workspaceTreeView = vscode.window.createTreeView('ctxcopy.workspaceExplorerView', {
    treeDataProvider: workspaceTreeProvider,
    showCollapseAll: true
  });
  context.subscriptions.push(workspaceTreeView);

  // 4. Register File Decoration Provider (decorates Explorer & Editors with badges)
  const fileDecorationProvider = new CtxCopyFileDecorationProvider(selectionManager);
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(fileDecorationProvider),
    fileDecorationProvider
  );

  // 5. Register all commands
  registerCommands(context, selectionManager);
}

export function deactivate(): void {
  // Disposables registered in context.subscriptions are automatically cleaned up
}
