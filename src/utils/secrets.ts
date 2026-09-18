import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Patterns and filenames commonly associated with secrets, credentials, and private keys.
 */
const SECRET_EXACT_NAMES = new Set([
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  '.env.staging',
  '.env.test',
  'credentials.json',
  'service-account.json',
  'serviceaccount.json',
  'serviceaccountkey.json',
  'id_rsa',
  'id_dsa',
  'id_ed25519',
  'id_ecdsa',
  '.netrc',
  '.npmrc',
  'secret_key_base',
  'master.key'
]);

const SECRET_EXTENSIONS = new Set([
  '.pem',
  '.key',
  '.pfx',
  '.p12',
  '.pkcs12',
  '.jks',
  '.keystore'
]);

const SECRET_NAME_PATTERNS: RegExp[] = [
  /^\.env(\..+)?$/i,
  /^credentials.*\.json$/i,
  /^client_secret.*\.json$/i,
  /^service[-_]?account.*\.json$/i,
  /.*secret.*\.ya?ml$/i,
  /.*secret.*\.json$/i,
  /^id_[a-z0-9_]+$/i
];

/**
 * Check if a file path matches known secret/credential conventions.
 */
export function isLikelySecretFile(filePath: string): boolean {
  const baseName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  // Allow obvious example or template files
  if (baseName.endsWith('.example') || baseName.endsWith('.sample') || baseName.endsWith('.template')) {
    return false;
  }

  if (SECRET_EXACT_NAMES.has(baseName.toLowerCase())) {
    return true;
  }

  if (SECRET_EXTENSIONS.has(ext)) {
    return true;
  }

  for (const pattern of SECRET_NAME_PATTERNS) {
    if (pattern.test(baseName)) {
      return true;
    }
  }

  return false;
}

/**
 * Filter an array of Uris to find those that are likely secret/sensitive files.
 */
export function findSecretFiles(uris: vscode.Uri[]): vscode.Uri[] {
  return uris.filter(uri => isLikelySecretFile(uri.fsPath));
}
