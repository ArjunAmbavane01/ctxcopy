export class MockUri {
  constructor(public readonly fsPath: string, public readonly scheme: string = 'file') {}

  static file(path: string): MockUri {
    return new MockUri(path);
  }

  static parse(uriStr: string): MockUri {
    return new MockUri(uriStr);
  }

  toString(): string {
    return `${this.scheme}://${this.fsPath.replace(/\\/g, '/')}`;
  }
}

export class MockEventEmitter<T> {
  private listeners: ((e: T) => void)[] = [];

  event = (listener: (e: T) => void) => {
    this.listeners.push(listener);
    return {
      dispose: () => {
        this.listeners = this.listeners.filter(l => l !== listener);
      }
    };
  };

  fire(data: T): void {
    this.listeners.forEach(l => l(data));
  }

  dispose(): void {
    this.listeners = [];
  }
}

export const mockVscode = {
  Uri: MockUri,
  EventEmitter: MockEventEmitter,
  ThemeIcon: {
    File: 'file-icon'
  },
  ThemeColor: class {
    constructor(public id: string) {}
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2
  },
  TreeItem: class {
    constructor(public label: string, public collapsibleState: number) {}
  },
  commands: {
    executeCommand: async (_command: string, ..._args: unknown[]) => {}
  },
  workspace: {
    asRelativePath: (uri: MockUri, _includeWorkspace?: boolean) => {
      return uri.fsPath.replace(/\\/g, '/');
    },
    onDidDeleteFiles: (_listener: unknown) => ({ dispose: () => {} }),
    onDidRenameFiles: (_listener: unknown) => ({ dispose: () => {} })
  }
};
