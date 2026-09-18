import * as path from 'path';
import * as vscode from 'vscode';
import { SelectionManager } from '../selection/selectionManager';
import { getRelativePath } from '../utils/fileReader';

export class SelectedFileTreeItem extends vscode.TreeItem {
  constructor(public readonly fileUri: vscode.Uri) {
    const fullRelativePath = getRelativePath(fileUri);
    const fileName = path.basename(fileUri.fsPath);
    const parentDir = path.dirname(fullRelativePath);

    super(fileName, vscode.TreeItemCollapsibleState.None);

    this.resourceUri = fileUri;
    this.description = parentDir === '.' ? '' : parentDir;
    this.tooltip = fullRelativePath;
    this.contextValue = 'selectedFile';
    this.iconPath = vscode.ThemeIcon.File;

    this.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [fileUri]
    };
  }
}

export class SelectedFilesTreeProvider implements vscode.TreeDataProvider<SelectedFileTreeItem>, vscode.Disposable {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<SelectedFileTreeItem | undefined | null | void>();
  public readonly onDidChangeTreeData: vscode.Event<SelectedFileTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
  private readonly _disposables: vscode.Disposable[] = [];
  private _treeView?: vscode.TreeView<SelectedFileTreeItem>;

  constructor(private readonly selectionManager: SelectionManager) {
    this._disposables.push(this._onDidChangeTreeData);

    this._disposables.push(
      this.selectionManager.onDidChangeSelection(() => {
        this.refresh();
      })
    );
  }

  public setTreeView(treeView: vscode.TreeView<SelectedFileTreeItem>): void {
    this._treeView = treeView;
    this.updateBadge();
  }

  public refresh(): void {
    this.updateBadge();
    this._onDidChangeTreeData.fire();
  }

  private updateBadge(): void {
    if (!this._treeView) {
      return;
    }
    const count = this.selectionManager.getCount();
    if (count > 0) {
      this._treeView.badge = {
        value: count,
        tooltip: `${count} file${count === 1 ? '' : 's'} selected in CtxCopy`
      };
      this._treeView.description = `${count} file${count === 1 ? '' : 's'}`;
    } else {
      this._treeView.badge = undefined;
      this._treeView.description = '';
    }
  }

  public getTreeItem(element: SelectedFileTreeItem): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: SelectedFileTreeItem): vscode.ProviderResult<SelectedFileTreeItem[]> {
    if (element) {
      return [];
    }

    const uris = this.selectionManager.getAll();
    return uris.map(uri => new SelectedFileTreeItem(uri));
  }

  public dispose(): void {
    this._disposables.forEach(d => d.dispose());
  }
}
