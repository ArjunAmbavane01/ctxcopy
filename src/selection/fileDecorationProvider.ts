import * as vscode from 'vscode';
import { SelectionManager } from './selectionManager';

/**
 * Provides visual decorations in the native VS Code Explorer and Open Editors
 * to indicate files that are currently staged in CtxCopy.
 */
export class CtxCopyFileDecorationProvider implements vscode.FileDecorationProvider, vscode.Disposable {
  private readonly _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
  public readonly onDidChangeFileDecorations: vscode.Event<vscode.Uri | vscode.Uri[] | undefined> = this._onDidChangeFileDecorations.event;
  private readonly _disposables: vscode.Disposable[] = [];

  constructor(private readonly selectionManager: SelectionManager) {
    this._disposables.push(this._onDidChangeFileDecorations);

    this._disposables.push(
      this.selectionManager.onDidChangeSelection(() => {
        // Trigger decoration refresh across all explorer items
        this._onDidChangeFileDecorations.fire(undefined);
      })
    );
  }

  public provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
    if (this.selectionManager.has(uri)) {
      return {
        badge: '✓',
        tooltip: 'Selected in CtxCopy',
        color: new vscode.ThemeColor('charts.green')
      };
    }
    return undefined;
  }

  public dispose(): void {
    this._disposables.forEach(d => d.dispose());
  }
}
