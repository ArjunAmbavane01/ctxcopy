export interface FormattableFile {
  relativePath: string;
  content: string;
}

export interface FormatOptions {
  includeLineNumbers?: boolean;
}

/**
 * Format a single file for clipboard output.
 * Format:
 * <relative-path>
 *
 * <content>
 */
export function formatSingleFile(
  file: FormattableFile,
  options: FormatOptions = {}
): string {
  let content = file.content;

  if (options.includeLineNumbers) {
    const lines = content.split('\n');
    const padLength = String(lines.length).length;
    content = lines
      .map((line, idx) => `${String(idx + 1).padStart(padLength, ' ')} | ${line}`)
      .join('\n');
  }

  return `${file.relativePath}\n\n${content}`;
}

/**
 * Format multiple files for clipboard output.
 * Each file is separated cleanly with standard blank lines between file blocks.
 *
 * Format:
 * <relative-path-1>
 *
 * <content-1>
 *
 * <relative-path-2>
 *
 * <content-2>
 */
export function formatFilesForClipboard(
  files: FormattableFile[],
  options: FormatOptions = {}
): string {
  if (files.length === 0) {
    return '';
  }

  return files
    .map(file => {
      let content = file.content;

      if (options.includeLineNumbers) {
        const lines = content.split('\n');
        const padLength = String(lines.length).length;
        content = lines
          .map((line, idx) => `${String(idx + 1).padStart(padLength, ' ')} | ${line}`)
          .join('\n');
      }

      // If content ends with a newline, one additional newline provides the blank line separator.
      // If content does not end with a newline, two newlines provide the blank line separator.
      const separator = content.endsWith('\n') ? '\n' : '\n\n';
      return `${file.relativePath}\n\n${content}${separator}`;
    })
    .join('')
    .trimEnd();
}
