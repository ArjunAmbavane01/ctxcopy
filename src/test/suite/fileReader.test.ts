import * as assert from 'assert';
import {
  COMMON_BINARY_EXTENSIONS,
  formatBytes,
  isBinaryContent,
  isBinaryExtension
} from '../../utils/fileReader';

suite('File Reader Utilities Test Suite', () => {
  test('Identifies binary extensions correctly', () => {
    assert.strictEqual(isBinaryExtension('image.png'), true);
    assert.strictEqual(isBinaryExtension('archive.tar.gz'), true);
    assert.strictEqual(isBinaryExtension('binary.exe'), true);
    assert.strictEqual(isBinaryExtension('document.pdf'), true);
    assert.strictEqual(isBinaryExtension('font.woff2'), true);

    assert.strictEqual(isBinaryExtension('index.ts'), false);
    assert.strictEqual(isBinaryExtension('styles.css'), false);
    assert.strictEqual(isBinaryExtension('data.json'), false);
    assert.strictEqual(isBinaryExtension('README.md'), false);
  });

  test('Detects null byte in binary buffer', () => {
    const textBytes = new TextEncoder().encode('Hello world this is plain text');
    assert.strictEqual(isBinaryContent(textBytes), false);

    const binaryBytes = new Uint8Array([0x48, 0x65, 0x6c, 0x00, 0x6f]); // 'Hel\0o'
    assert.strictEqual(isBinaryContent(binaryBytes), true);
  });

  test('Format bytes accurately', () => {
    assert.strictEqual(formatBytes(500), '500 B');
    assert.strictEqual(formatBytes(1024), '1.0 KB');
    assert.strictEqual(formatBytes(2048), '2.0 KB');
    assert.strictEqual(formatBytes(1024 * 1024 * 2.5), '2.5 MB');
  });

  test('Common binary extensions set is populated', () => {
    assert.ok(COMMON_BINARY_EXTENSIONS.size > 20);
    assert.ok(COMMON_BINARY_EXTENSIONS.has('.png'));
    assert.ok(COMMON_BINARY_EXTENSIONS.has('.wasm'));
  });
});
