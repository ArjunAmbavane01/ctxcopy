import * as assert from 'assert';
import { formatFilesForClipboard, formatSingleFile } from '../../formatter/clipboardFormatter';

suite('Clipboard Formatter Test Suite', () => {
  test('Single file formatting without trailing newline', () => {
    const file = {
      relativePath: 'src/components/TaskRow.tsx',
      content: 'export const TaskRow = () => <div>Task</div>;'
    };

    const result = formatSingleFile(file);
    const expected = 'src/components/TaskRow.tsx\n\nexport const TaskRow = () => <div>Task</div>;';
    assert.strictEqual(result, expected);
  });

  test('Single file formatting with trailing newline', () => {
    const file = {
      relativePath: 'src/components/TaskRow.tsx',
      content: 'export const TaskRow = () => <div>Task</div>;\n'
    };

    const result = formatSingleFile(file);
    const expected = 'src/components/TaskRow.tsx\n\nexport const TaskRow = () => <div>Task</div>;\n';
    assert.strictEqual(result, expected);
  });

  test('Multiple files formatting matches required specification', () => {
    const files = [
      {
        relativePath: 'src/components/TaskRow.tsx',
        content: 'export const TaskRow = () => <div>Task</div>;\n'
      },
      {
        relativePath: 'src/components/MissedTasksSheet.tsx',
        content: 'export const MissedTasksSheet = () => <div>Sheet</div>;\n'
      },
      {
        relativePath: 'convex/tasks.ts',
        content: 'export const getTasks = query();\n'
      }
    ];

    const result = formatFilesForClipboard(files);
    const expected =
      'src/components/TaskRow.tsx\n\n' +
      'export const TaskRow = () => <div>Task</div>;\n\n' +
      'src/components/MissedTasksSheet.tsx\n\n' +
      'export const MissedTasksSheet = () => <div>Sheet</div>;\n\n' +
      'convex/tasks.ts\n\n' +
      'export const getTasks = query();';

    assert.strictEqual(result, expected);
  });

  test('Multiple files without trailing newlines format cleanly with separation', () => {
    const files = [
      {
        relativePath: 'file1.ts',
        content: 'const a = 1;'
      },
      {
        relativePath: 'file2.ts',
        content: 'const b = 2;'
      }
    ];

    const result = formatFilesForClipboard(files);
    const expected = 'file1.ts\n\nconst a = 1;\n\nfile2.ts\n\nconst b = 2;';
    assert.strictEqual(result, expected);
  });

  test('Empty file list returns empty string', () => {
    const result = formatFilesForClipboard([]);
    assert.strictEqual(result, '');
  });

  test('Optional line numbers formatting', () => {
    const file = {
      relativePath: 'test.ts',
      content: 'line 1\nline 2'
    };

    const result = formatSingleFile(file, { includeLineNumbers: true });
    assert.strictEqual(result, 'test.ts\n\n1 | line 1\n2 | line 2');
  });
});
