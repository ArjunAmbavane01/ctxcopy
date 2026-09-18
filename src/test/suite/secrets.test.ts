import * as assert from 'assert';
import { isLikelySecretFile } from '../../utils/secrets';

suite('Secrets Detection Test Suite', () => {
  test('Identifies common env files as secrets', () => {
    assert.strictEqual(isLikelySecretFile('.env'), true);
    assert.strictEqual(isLikelySecretFile('.env.local'), true);
    assert.strictEqual(isLikelySecretFile('.env.production'), true);
    assert.strictEqual(isLikelySecretFile('path/to/.env.staging'), true);
  });

  test('Excludes example or template env files', () => {
    assert.strictEqual(isLikelySecretFile('.env.example'), false);
    assert.strictEqual(isLikelySecretFile('.env.sample'), false);
    assert.strictEqual(isLikelySecretFile('.env.template'), false);
  });

  test('Identifies private keys and certificates as secrets', () => {
    assert.strictEqual(isLikelySecretFile('id_rsa'), true);
    assert.strictEqual(isLikelySecretFile('id_ed25519'), true);
    assert.strictEqual(isLikelySecretFile('server.key'), true);
    assert.strictEqual(isLikelySecretFile('cert.pem'), true);
    assert.strictEqual(isLikelySecretFile('cert.pfx'), true);
  });

  test('Identifies service account credential files as secrets', () => {
    assert.strictEqual(isLikelySecretFile('credentials.json'), true);
    assert.strictEqual(isLikelySecretFile('service-account.json'), true);
    assert.strictEqual(isLikelySecretFile('serviceAccountKey.json'), true);
    assert.strictEqual(isLikelySecretFile('client_secret_xyz.json'), true);
  });

  test('Treats ordinary source code files as non-secret', () => {
    assert.strictEqual(isLikelySecretFile('src/index.ts'), false);
    assert.strictEqual(isLikelySecretFile('package.json'), false);
    assert.strictEqual(isLikelySecretFile('README.md'), false);
    assert.strictEqual(isLikelySecretFile('tsconfig.json'), false);
    assert.strictEqual(isLikelySecretFile('src/components/TaskRow.tsx'), false);
  });
});
