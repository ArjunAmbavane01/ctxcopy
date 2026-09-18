import * as assert from 'assert';
import * as vscode from 'vscode';
import { SelectionManager } from '../../selection/selectionManager';

suite('SelectionManager Test Suite', () => {
  let manager: SelectionManager;

  setup(() => {
    manager = new SelectionManager();
  });

  teardown(() => {
    manager.dispose();
  });

  test('Initial state is empty', () => {
    assert.strictEqual(manager.getCount(), 0);
    assert.deepStrictEqual(manager.getAll(), []);
  });

  test('Adds file uri and updates count', () => {
    const uri1 = vscode.Uri.file('/workspace/src/app.ts');
    const added = manager.add(uri1);

    assert.strictEqual(added, 1);
    assert.strictEqual(manager.getCount(), 1);
    assert.strictEqual(manager.has(uri1), true);
  });

  test('Prevents duplicate file additions', () => {
    const uri1 = vscode.Uri.file('/workspace/src/app.ts');
    manager.add(uri1);
    const addedAgain = manager.add(uri1);

    assert.strictEqual(addedAgain, 0);
    assert.strictEqual(manager.getCount(), 1);
  });

  test('Adds multiple files at once', () => {
    const uri1 = vscode.Uri.file('/workspace/src/app.ts');
    const uri2 = vscode.Uri.file('/workspace/src/utils.ts');
    const added = manager.add([uri1, uri2]);

    assert.strictEqual(added, 2);
    assert.strictEqual(manager.getCount(), 2);
  });

  test('Removes file uri', () => {
    const uri1 = vscode.Uri.file('/workspace/src/app.ts');
    manager.add(uri1);
    assert.strictEqual(manager.has(uri1), true);

    const removed = manager.remove(uri1);
    assert.strictEqual(removed, true);
    assert.strictEqual(manager.getCount(), 0);
    assert.strictEqual(manager.has(uri1), false);
  });

  test('Toggles file selection', () => {
    const uri1 = vscode.Uri.file('/workspace/src/app.ts');
    const toggledOn = manager.toggle(uri1);
    assert.strictEqual(toggledOn, true);
    assert.strictEqual(manager.has(uri1), true);

    const toggledOff = manager.toggle(uri1);
    assert.strictEqual(toggledOff, false);
    assert.strictEqual(manager.has(uri1), false);
  });

  test('Clears all files', () => {
    const uri1 = vscode.Uri.file('/workspace/src/app.ts');
    const uri2 = vscode.Uri.file('/workspace/src/utils.ts');
    manager.add([uri1, uri2]);
    assert.strictEqual(manager.getCount(), 2);

    manager.clear();
    assert.strictEqual(manager.getCount(), 0);
    assert.deepStrictEqual(manager.getAll(), []);
  });

  test('Fires onDidChangeSelection event when files change', () => {
    let eventReceived = false;
    let receivedCount = 0;

    manager.onDidChangeSelection(uris => {
      eventReceived = true;
      receivedCount = uris.length;
    });

    const uri1 = vscode.Uri.file('/workspace/src/app.ts');
    manager.add(uri1);

    assert.strictEqual(eventReceived, true);
    assert.strictEqual(receivedCount, 1);
  });
});
