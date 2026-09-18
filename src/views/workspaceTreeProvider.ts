import * as path from 'path';
import * as vscode from 'vscode';
import { SelectionManager } from '../selection/selectionManager';
import { getRelativePath } from '../utils/fileReader';

export const DEFAULT_IGNORED_DIRS = new Set([
  '.git',
  '.svn',
  '.hg',
  'node_modules',
  'dist',
  'out',
  'build',
  '.next',
  '.nuxt',
  '.turbo',
  '.cache',
  '.vscode-test',
  'coverage'
]);

export type WorkspaceTreeItem = WorkspaceFolderItem | WorkspaceFileItem;

export class WorkspaceFolderItem extends vscode.TreeItem {
  constructor(
    public readonly folderUri: vscode.Uri,
    public selectedCount: number
  ) {
    const folderName = path.basename(folderUri.fsPath) || folderUri.fsPath;
    super(folderName, vscode.TreeItemCollapsibleState.Collapsed);

    this.resourceUri = folderUri;
    this.iconPath = vscode.ThemeIcon.Folder;
    this.updateCount(selectedCount);
  }

  public updateCount(selectedCount: number): void {
    this.selectedCount = selectedCount;
    if (selectedCount > 0) {
      this.description = `✓ ${selectedCount}`;
      this.contextValue = 'workspaceDirectoryHasSelections';
      this.tooltip = `${getRelativePath(this.folderUri)} (${selectedCount} selected)`;
    } else {
      this.description = '';
      this.contextValue = 'workspaceDirectoryEmpty';
      this.tooltip = getRelativePath(this.folderUri);
    }
  }
}

export class WorkspaceFileItem extends vscode.TreeItem {
  constructor(
    public readonly fileUri: vscode.Uri,
    public isSelected: boolean
  ) {
    const fileName = path.basename(fileUri.fsPath);
    super(fileName, vscode.TreeItemCollapsibleState.None);

    this.resourceUri = fileUri;
    this.updateSelection(isSelected);

    this.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [fileUri]
    };
  }

  public updateSelection(isSelected: boolean): void {
    this.isSelected = isSelected;
    this.description = '';
    const relPath = getRelativePath(this.fileUri);

    if (isSelected) {
      this.contextValue = 'workspaceFileSelected';
      this.tooltip = `${relPath} (Selected in CtxCopy)`;
    } else {
      this.contextValue = 'workspaceFileUnselected';
      this.tooltip = relPath;
    }
  }
}

export class WorkspaceTreeProvider implements vscode.TreeDataProvider<WorkspaceTreeItem>, vscode.Disposable {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<WorkspaceTreeItem | undefined | null | void>();
  public readonly onDidChangeTreeData: vscode.Event<WorkspaceTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
  private readonly _disposables: vscode.Disposable[] = [];

  // In-memory caches for 0-latency updates without disk I/O
  private readonly _dirCache = new Map<string, [string, vscode.FileType][]>();
  private readonly _itemMap = new Map<string, WorkspaceTreeItem>();

  constructor(private readonly selectionManager: SelectionManager) {
    this._disposables.push(this._onDidChangeTreeData);

    // Targeted high-performance updates on selection change
    this._disposables.push(
      this.selectionManager.onDidChangeSelectionDetail(e => {
        const changedUris = [...e.added, ...e.removed];

        // If a small number of items changed (e.g. user toggling files), perform targeted update
        if (changedUris.length > 0 && changedUris.length <= 15) {
          const itemsToRefresh = new Set<WorkspaceTreeItem>();

          for (const uri of changedUris) {
            const key = this.selectionManager.getKey(uri);
            const item = this._itemMap.get(key);

            if (item instanceof WorkspaceFileItem) {
              item.updateSelection(this.selectionManager.has(uri));
              itemsToRefresh.add(item);
            }

            // Update parent folders up to workspace root
            let parentDir = path.dirname(uri.fsPath);
            while (parentDir && parentDir.length > 3) {
              const parentUri = vscode.Uri.file(parentDir);
              const parentKey = this.selectionManager.getKey(parentUri);
              const folderItem = this._itemMap.get(parentKey);

              if (folderItem instanceof WorkspaceFolderItem) {
                const count = this.selectionManager.getSelectedCountInFolder(parentUri);
                folderItem.updateCount(count);
                itemsToRefresh.add(folderItem);
              }

              const next = path.dirname(parentDir);
              if (next === parentDir) {
                break;
              }
              parentDir = next;
            }
          }

          if (itemsToRefresh.size > 0) {
            for (const it of itemsToRefresh) {
              this._onDidChangeTreeData.fire(it);
            }
            return;
          }
        }

        // Otherwise fast in-memory refresh
        this._onDidChangeTreeData.fire();
      })
    );

    // Invalidate caches when workspace folders change
    this._disposables.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        this.clearCacheAndRefresh();
      })
    );

    // Watch for file creation / deletion in workspace to invalidate directory cache
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');
    this._disposables.push(
      watcher,
      watcher.onDidCreate(uri => {
        this._dirCache.delete(path.dirname(uri.fsPath).toLowerCase());
        this.refresh();
      }),
      watcher.onDidDelete(uri => {
        this._dirCache.delete(path.dirname(uri.fsPath).toLowerCase());
        this.refresh();
      }),
      watcher.onDidChange(() => {})
    );
  }

  public clearCacheAndRefresh(): void {
    this._dirCache.clear();
    this._itemMap.clear();
    this._onDidChangeTreeData.fire();
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: WorkspaceTreeItem): vscode.TreeItem {
    return element;
  }

  public async getChildren(element?: WorkspaceTreeItem): Promise<WorkspaceTreeItem[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return [];
    }

    // Root level
    if (!element) {
      if (workspaceFolders.length === 1) {
        return this.getDirectoryChildren(workspaceFolders[0].uri);
      } else {
        // Multi-root: show root folders
        return workspaceFolders.map(wf => {
          const count = this.selectionManager.getSelectedCountInFolder(wf.uri);
          const folderItem = new WorkspaceFolderItem(wf.uri, count);
          this._itemMap.set(this.selectionManager.getKey(wf.uri), folderItem);
          return folderItem;
        });
      }
    }

    // Expanding a folder
    if (element instanceof WorkspaceFolderItem) {
      return this.getDirectoryChildren(element.folderUri);
    }

    return [];
  }

  private async getDirectoryChildren(dirUri: vscode.Uri): Promise<WorkspaceTreeItem[]> {
    try {
      const dirKey = dirUri.fsPath.toLowerCase();
      let entries = this._dirCache.get(dirKey);

      if (!entries) {
        entries = await vscode.workspace.fs.readDirectory(dirUri);
        this._dirCache.set(dirKey, entries);
      }

      const folders: WorkspaceFolderItem[] = [];
      const files: WorkspaceFileItem[] = [];

      for (const [name, type] of entries) {
        // Filter out common build & package directories
        if (DEFAULT_IGNORED_DIRS.has(name)) {
          continue;
        }

        const childUri = vscode.Uri.joinPath(dirUri, name);
        const childKey = this.selectionManager.getKey(childUri);

        if (type & vscode.FileType.Directory) {
          const count = this.selectionManager.getSelectedCountInFolder(childUri);
          const folderItem = new WorkspaceFolderItem(childUri, count);
          this._itemMap.set(childKey, folderItem);
          folders.push(folderItem);
        } else if (type & vscode.FileType.File) {
          const isSelected = this.selectionManager.has(childUri);
          const fileItem = new WorkspaceFileItem(childUri, isSelected);
          this._itemMap.set(childKey, fileItem);
          files.push(fileItem);
        }
      }

      // Sort alphabetically: directories first, then files
      folders.sort((a, b) => (a.label as string).localeCompare(b.label as string, undefined, { sensitivity: 'base' }));
      files.sort((a, b) => (a.label as string).localeCompare(b.label as string, undefined, { sensitivity: 'base' }));

      return [...folders, ...files];
    } catch {
      return [];
    }
  }

  public dispose(): void {
    this._disposables.forEach(d => d.dispose());
  }
}
