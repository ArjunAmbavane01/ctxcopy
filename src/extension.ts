import * as vscode from 'vscode';
import { registerCommands } from './commands/registerCommands';
import { CtxCopyFileDecorationProvider } from './selection/fileDecorationProvider';
import { SelectionManager } from './selection/selectionManager';
import { SelectedFilesTreeProvider } from './views/selectedFilesTreeProvider';

/**
 * CtxCopy Extension Activation Entry Point.
 */
export function activate(context: vscode.ExtensionContext): void {
  // 1. Initialize Selection Manager
  const selectionManager = new SelectionManager();
  context.subscriptions.push(selectionManager);

  // 2. Initialize Tree View Provider
  const treeDataProvider = new SelectedFilesTreeProvider(selectionManager);
  context.subscriptions.push(treeDataProvider);

  const treeView = vscode.window.createTreeView('ctxcopy.selectedFilesView', {
    treeDataProvider,
    showCollapseAll: false
  });
  context.subscriptions.push(treeView);

  // Attach treeView reference for badge and description updates
  treeDataProvider.setTreeView(treeView);

  // 3. Register File Decoration Provider (decorates Explorer & Editors with badges)
  const fileDecorationProvider = new CtxCopyFileDecorationProvider(selectionManager);
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(fileDecorationProvider),
    fileDecorationProvider
  );

  // 4. Register all commands
  registerCommands(context, selectionManager);
}

export function deactivate(): void {
  // Disposables registered in context.subscriptions are automatically cleaned up
}
