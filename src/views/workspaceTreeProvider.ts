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
    selectedCount: number
  ) {
    const folderName = path.basename(folderUri.fsPath) || folderUri.fsPath;
    super(folderName, vscode.TreeItemCollapsibleState.Collapsed);

    this.resourceUri = folderUri;
    this.iconPath = vscode.ThemeIcon.Folder;

    if (selectedCount > 0) {
      this.description = `✓ ${selectedCount}`;
      this.contextValue = 'workspaceDirectoryHasSelections';
      this.tooltip = `${getRelativePath(folderUri)} (${selectedCount} selected)`;
    } else {
      this.description = '';
      this.contextValue = 'workspaceDirectoryEmpty';
      this.tooltip = getRelativePath(folderUri);
    }
  }
}

export class WorkspaceFileItem extends vscode.TreeItem {
  constructor(
    public readonly fileUri: vscode.Uri,
    public readonly isSelected: boolean
  ) {
    const fileName = path.basename(fileUri.fsPath);
    super(fileName, vscode.TreeItemCollapsibleState.None);

    this.resourceUri = fileUri;
    const relPath = getRelativePath(fileUri);

    // Keep description empty so the only indicator is the single green checkmark badge at the end
    this.description = '';

    if (isSelected) {
      this.contextValue = 'workspaceFileSelected';
      this.tooltip = `${relPath} (Selected in CtxCopy)`;
    } else {
      this.contextValue = 'workspaceFileUnselected';
      this.tooltip = relPath;
    }

    this.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [fileUri]
    };
  }
}

export class WorkspaceTreeProvider implements vscode.TreeDataProvider<WorkspaceTreeItem>, vscode.Disposable {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<WorkspaceTreeItem | undefined | null | void>();
  public readonly onDidChangeTreeData: vscode.Event<WorkspaceTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
  private readonly _disposables: vscode.Disposable[] = [];

  constructor(private readonly selectionManager: SelectionManager) {
    this._disposables.push(this._onDidChangeTreeData);

    // Refresh when selections change so checkmarks & folder counts update immediately
    this._disposables.push(
      this.selectionManager.onDidChangeSelection(() => {
        this.refresh();
      })
    );

    // Refresh when workspace folders change
    this._disposables.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        this.refresh();
      })
    );

    // Watch for file creation / deletion in workspace
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');
    this._disposables.push(
      watcher,
      watcher.onDidCreate(() => this.refresh()),
      watcher.onDidDelete(() => this.refresh()),
      watcher.onDidChange(() => this.refresh())
    );
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
          return new WorkspaceFolderItem(wf.uri, count);
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
      const entries = await vscode.workspace.fs.readDirectory(dirUri);
      const folders: WorkspaceFolderItem[] = [];
      const files: WorkspaceFileItem[] = [];

      for (const [name, type] of entries) {
        // Filter out common build & package directories
        if (DEFAULT_IGNORED_DIRS.has(name)) {
          continue;
        }

        const childUri = vscode.Uri.joinPath(dirUri, name);

        if (type & vscode.FileType.Directory) {
          const count = this.selectionManager.getSelectedCountInFolder(childUri);
          folders.push(new WorkspaceFolderItem(childUri, count));
        } else if (type & vscode.FileType.File) {
          const isSelected = this.selectionManager.has(childUri);
          files.push(new WorkspaceFileItem(childUri, isSelected));
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
