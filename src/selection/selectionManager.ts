import * as vscode from 'vscode';

/**
 * Manages the in-memory set of selected files for CtxCopy.
 * Dispatches change events and maintains the active context state.
 */
export class SelectionManager implements vscode.Disposable {
  private readonly _selectedMap: Map<string, vscode.Uri> = new Map();
  private readonly _onDidChangeSelection = new vscode.EventEmitter<vscode.Uri[]>();
  private readonly _disposables: vscode.Disposable[] = [];

  public readonly onDidChangeSelection: vscode.Event<vscode.Uri[]> = this._onDidChangeSelection.event;

  constructor() {
    this._disposables.push(this._onDidChangeSelection);

    // Watch for deleted files in workspace to clean up stale selections
    this._disposables.push(
      vscode.workspace.onDidDeleteFiles(e => {
        let changed = false;
        for (const uri of e.files) {
          const key = this.getKey(uri);
          if (this._selectedMap.delete(key)) {
            changed = true;
          }
        }
        if (changed) {
          this.notifyChange();
        }
      })
    );

    // Watch for renamed files in workspace to update selection paths
    this._disposables.push(
      vscode.workspace.onDidRenameFiles(e => {
        let changed = false;
        for (const file of e.files) {
          const oldKey = this.getKey(file.oldUri);
          if (this._selectedMap.has(oldKey)) {
            this._selectedMap.delete(oldKey);
            this._selectedMap.set(this.getKey(file.newUri), file.newUri);
            changed = true;
          }
        }
        if (changed) {
          this.notifyChange();
        }
      })
    );

    // Initialize context key to 0
    this.updateContext();
  }

  /**
   * Normalizes Uri key for cross-platform consistency.
   * On Windows, paths are case-insensitive and drive letters can vary in casing.
   */
  private getKey(uri: vscode.Uri): string {
    if (uri.scheme === 'file') {
      return `file://${uri.fsPath.toLowerCase().replace(/\\/g, '/')}`;
    }
    return uri.toString().toLowerCase();
  }

  /**
   * Check if a file is currently selected.
   */
  public has(uri: vscode.Uri): boolean {
    return this._selectedMap.has(this.getKey(uri));
  }

  /**
   * Count how many selected files are inside a given folder directory.
   */
  public getSelectedCountInFolder(folderUri: vscode.Uri): number {
    const folderKey = this.getKey(folderUri) + '/';
    let count = 0;
    for (const key of this._selectedMap.keys()) {
      if (key.startsWith(folderKey)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Remove all selected files under a given directory.
   */
  public removeFolder(folderUri: vscode.Uri): number {
    const folderKey = this.getKey(folderUri) + '/';
    const toDelete: string[] = [];
    for (const key of this._selectedMap.keys()) {
      if (key.startsWith(folderKey)) {
        toDelete.push(key);
      }
    }
    for (const k of toDelete) {
      this._selectedMap.delete(k);
    }
    if (toDelete.length > 0) {
      this.notifyChange();
    }
    return toDelete.length;
  }

  /**
   * Add one or more Uris to selection.
   * Returns the count of newly added files.
   */
  public add(uris: vscode.Uri | vscode.Uri[]): number {
    const list = Array.isArray(uris) ? uris : [uris];
    let addedCount = 0;

    for (const uri of list) {
      const key = this.getKey(uri);
      if (!this._selectedMap.has(key)) {
        this._selectedMap.set(key, uri);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      this.notifyChange();
    }

    return addedCount;
  }

  /**
   * Remove a single Uri from selection.
   */
  public remove(uri: vscode.Uri): boolean {
    const key = this.getKey(uri);
    const deleted = this._selectedMap.delete(key);
    if (deleted) {
      this.notifyChange();
    }
    return deleted;
  }

  /**
   * Toggle a single Uri in selection.
   */
  public toggle(uri: vscode.Uri): boolean {
    if (this.has(uri)) {
      this.remove(uri);
      return false;
    } else {
      this.add(uri);
      return true;
    }
  }

  /**
   * Clear all selected files.
   */
  public clear(): void {
    if (this._selectedMap.size === 0) {
      return;
    }
    this._selectedMap.clear();
    this.notifyChange();
  }

  /**
   * Returns array of all currently selected Uris in insertion order.
   */
  public getAll(): vscode.Uri[] {
    return Array.from(this._selectedMap.values());
  }

  /**
   * Returns total count of currently selected files.
   */
  public getCount(): number {
    return this._selectedMap.size;
  }

  private notifyChange(): void {
    this.updateContext();
    this._onDidChangeSelection.fire(this.getAll());
  }

  private updateContext(): void {
    vscode.commands.executeCommand('setContext', 'ctxcopy.selectedCount', this._selectedMap.size);
  }

  public dispose(): void {
    this._disposables.forEach(d => d.dispose());
  }
}
