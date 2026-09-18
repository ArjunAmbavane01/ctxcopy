import * as path from 'path';
import * as vscode from 'vscode';

export const COMMON_BINARY_EXTENSIONS = new Set([
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.tiff', '.tif', '.psd', '.ai',
  // Audio & Video
  '.mp3', '.mp4', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.mov', '.avi', '.mkv', '.webm',
  // Archives & Compressed
  '.zip', '.tar', '.gz', '.tgz', '.bz2', '.7z', '.rar', '.xz',
  // Executables & Binaries
  '.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.o', '.class', '.pyc', '.pyo', '.wasm',
  // Documents & Fonts
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  // Databases & stores
  '.sqlite', '.sqlite3', '.db', '.dat'
]);

export interface FileReadSuccess {
  uri: vscode.Uri;
  relativePath: string;
  content: string;
  lineCount: number;
  byteSize: number;
}

export type FileReadFailureReason = 'binary' | 'notFound' | 'tooLarge' | 'permissionDenied' | 'unreadable';

export interface FileReadFailure {
  uri: vscode.Uri;
  relativePath: string;
  reason: FileReadFailureReason;
  errorMessage: string;
}

export type FileReadResult =
  | { success: true; file: FileReadSuccess }
  | { success: false; failure: FileReadFailure };

/**
 * Normalizes file path to workspace relative path with forward slashes.
 */
export function getRelativePath(uri: vscode.Uri): string {
  const relative = vscode.workspace.asRelativePath(uri, true);
  return relative.replace(/\\/g, '/');
}

/**
 * Format bytes into human readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check if the file extension is known to be binary.
 */
export function isBinaryExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return COMMON_BINARY_EXTENSIONS.has(ext);
}

/**
 * Check if buffer content appears to be binary by inspecting for null bytes
 * or unprintable control characters in the sample.
 */
export function isBinaryContent(buffer: Uint8Array, sampleLength: number = 8000): boolean {
  const checkLen = Math.min(buffer.length, sampleLength);
  let nonPrintableCount = 0;

  for (let i = 0; i < checkLen; i++) {
    const byte = buffer[i];

    // Null byte is a definitive indicator of binary files in almost all text encodings
    if (byte === 0x00) {
      return true;
    }

    // Check for non-printable control characters (excluding tab, newline, carriage return)
    if ((byte < 7 || (byte > 13 && byte < 27)) && byte !== 0x1B) {
      nonPrintableCount++;
    }
  }

  // If more than 10% of characters are non-printable control characters, treat as binary
  if (checkLen > 0 && nonPrintableCount / checkLen > 0.1) {
    return true;
  }

  return false;
}

/**
 * Reads a single file as UTF-8 text with safety checks.
 */
export async function readFileAsText(
  uri: vscode.Uri,
  maxFileSizeKB?: number
): Promise<FileReadResult> {
  const relativePath = getRelativePath(uri);

  // 1. Fast check by extension
  if (isBinaryExtension(uri.fsPath)) {
    return {
      success: false,
      failure: {
        uri,
        relativePath,
        reason: 'binary',
        errorMessage: `Cannot copy "${relativePath}": known binary file extension.`
      }
    };
  }

  // 2. Check file stats
  let stat: vscode.FileStat;
  try {
    stat = await vscode.workspace.fs.stat(uri);
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'FileNotFound' || err.code === 'EntryNotFound') {
      return {
        success: false,
        failure: {
          uri,
          relativePath,
          reason: 'notFound',
          errorMessage: `File not found: "${relativePath}". It may have been moved or deleted.`
        }
      };
    }
    if (err.code === 'NoPermissions') {
      return {
        success: false,
        failure: {
          uri,
          relativePath,
          reason: 'permissionDenied',
          errorMessage: `Permission denied reading file: "${relativePath}".`
        }
      };
    }
    return {
      success: false,
      failure: {
        uri,
        relativePath,
        reason: 'unreadable',
        errorMessage: `Could not access "${relativePath}": ${err.message || 'unknown error'}`
      }
    };
  }

  // Check if directory
  if (stat.type & vscode.FileType.Directory) {
    return {
      success: false,
      failure: {
        uri,
        relativePath,
        reason: 'unreadable',
        errorMessage: `"${relativePath}" is a directory, not a file.`
      }
    };
  }

  // Check size limit if provided
  if (maxFileSizeKB && maxFileSizeKB > 0) {
    const maxBytes = maxFileSizeKB * 1024;
    if (stat.size > maxBytes) {
      return {
        success: false,
        failure: {
          uri,
          relativePath,
          reason: 'tooLarge',
          errorMessage: `"${relativePath}" is ${formatBytes(stat.size)}, which exceeds the configured limit of ${maxFileSizeKB} KB.`
        }
      };
    }
  }

  // 3. Read content
  let bytes: Uint8Array;
  try {
    bytes = await vscode.workspace.fs.readFile(uri);
  } catch (error: unknown) {
    const err = error as { message?: string };
    return {
      success: false,
      failure: {
        uri,
        relativePath,
        reason: 'unreadable',
        errorMessage: `Error reading file "${relativePath}": ${err.message || 'unknown error'}`
      }
    };
  }

  // 4. Inspect buffer for binary characters
  if (isBinaryContent(bytes)) {
    return {
      success: false,
      failure: {
        uri,
        relativePath,
        reason: 'binary',
        errorMessage: `Cannot copy "${relativePath}": detected binary or non-text content.`
      }
    };
  }

  // 5. Decode as UTF-8
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const content = decoder.decode(bytes);

    // Calculate line count (counting newline chars)
    let lineCount = 1;
    for (let i = 0; i < content.length; i++) {
      if (content[i] === '\n') {
        lineCount++;
      }
    }

    return {
      success: true,
      file: {
        uri,
        relativePath,
        content,
        lineCount,
        byteSize: stat.size
      }
    };
  } catch (_e) {
    return {
      success: false,
      failure: {
        uri,
        relativePath,
        reason: 'binary',
        errorMessage: `Cannot copy "${relativePath}": File is not valid UTF-8 text.`
      }
    };
  }
}
