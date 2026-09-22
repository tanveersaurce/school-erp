import { z } from 'zod';

const DANGEROUS_EXTENSIONS = [
  '.exe',
  '.sh',
  '.bat',
  '.cmd',
  '.msi',
  '.php',
  '.phtml',
  '.php3',
  '.php4',
  '.php5',
  '.phps',
  '.jsp',
  '.asp',
  '.aspx',
  '.cgi',
  '.pl',
  '.py',
  '.js',
  '.mjs',
  '.vbs',
  '.ps1',
  '.scr',
  '.jar',
  '.com',
  '.gadget',
  '.wsf',
  '.hta',
];

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.rtf',
  '.odt',
  '.ods',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.zip',
];

/**
 * Validates a filename to prevent path traversal and arbitrary executable uploads.
 */
export function isSafeFileName(fileName: string): boolean {
  if (!fileName || typeof fileName !== 'string') return false;

  const trimmed = fileName.trim();
  if (trimmed.length < 1 || trimmed.length > 255) return false;

  // Path traversal and null byte checks
  if (
    trimmed.includes('..') ||
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    trimmed.includes('\0') ||
    trimmed.includes('%00')
  ) {
    return false;
  }

  const dotIndex = trimmed.lastIndexOf('.');
  if (dotIndex === -1) return false;

  const ext = trimmed.substring(dotIndex).toLowerCase();

  // Explicitly block dangerous script and executable extensions
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return false;
  }

  // Enforce allowed extensions
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Validates a file URL to prevent SSRF and unsafe protocol schemes (javascript:, file:, data:text/html).
 */
export function isSafeFileUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  const trimmed = url.trim().toLowerCase();

  // Block malicious protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:') ||
    trimmed.startsWith('data:text/html')
  ) {
    return false;
  }

  // Safe relative upload paths
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/attachments/')) {
    return !trimmed.includes('..');
  }

  // Safe absolute URLs
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 's3:';
  } catch {
    return false;
  }
}

export const safeFileNameSchema = z
  .string()
  .min(1)
  .max(255)
  .refine((name) => isSafeFileName(name), {
    message:
      'Invalid filename: path traversal characters are forbidden and only standard documents, images, and archives are allowed.',
  });

export const safeFileUrlSchema = z
  .string()
  .min(1)
  .refine((url) => isSafeFileUrl(url), {
    message: 'Invalid file URL: unsafe protocol or forbidden path pattern.',
  });
