/**
 * File upload validation and sanitization
 * Prevents malicious file uploads through MIME type checking, size limits, and magic bytes validation
 */

// Allowed MIME types with max file sizes (whitelist approach)
const ALLOWED_MIME_TYPES: Record<string, { ext: string; maxSize: number }> = {
  // Images
  'image/jpeg': { ext: 'jpg', maxSize: 5 * 1024 * 1024 }, // 5MB
  'image/png': { ext: 'png', maxSize: 5 * 1024 * 1024 },
  'image/webp': { ext: 'webp', maxSize: 5 * 1024 * 1024 },
  'image/gif': { ext: 'gif', maxSize: 5 * 1024 * 1024 },
  'image/svg+xml': { ext: 'svg', maxSize: 2 * 1024 * 1024 },

  // Documents
  'application/pdf': { ext: 'pdf', maxSize: 10 * 1024 * 1024 }, // 10MB
  'application/msword': { ext: 'doc', maxSize: 10 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    ext: 'docx',
    maxSize: 10 * 1024 * 1024,
  },
  'application/vnd.ms-excel': { ext: 'xls', maxSize: 10 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    ext: 'xlsx',
    maxSize: 10 * 1024 * 1024,
  },
  'text/plain': { ext: 'txt', maxSize: 5 * 1024 * 1024 },
  'text/csv': { ext: 'csv', maxSize: 5 * 1024 * 1024 },
}

// Disallowed extensions (defense in depth - for additional security)
const DANGEROUS_EXTENSIONS = [
  'exe',
  'bat',
  'cmd',
  'com',
  'scr',
  'vbs',
  'js',
  'jar',
  'zip',
  'rar',
  '7z',
  'dll',
  'msi',
  'app',
  'deb',
  'rpm',
  'dmg',
  'pkg',
  'run',
  'sh',
  'bash',
  'zsh',
  'ps1',
  'psc1',
  'msh',
  'msh1',
  'mshxml',
  'msh1xml',
  'pssc',
  'psc2',
  'msh2',
  'msh2xml',
  'psc3',
  'msh3',
  'msh3xml',
  'aspx',
  'asp',
  'php',
  'php3',
  'php4',
  'php5',
  'jsp',
  'jspx',
  'jspf',
  'jsw',
  'jsv',
  'jspx',
  'wsh',
  'wsf',
  'py',
  'pyc',
  'pyo',
  'rb',
  'rbw',
  'cgi',
  'pl',
  'ada',
  'asm',
  'bas',
  'c',
  'cpp',
  'cxx',
  'cc',
  'h',
  'hpp',
  'cs',
  'java',
  'class',
  'swift',
  'kt',
  'go',
  'rs',
  'ts',
  'tsx',
  'jsx',
]

export interface ValidationResult {
  valid: boolean
  error?: string
  suggestedExtension?: string
}

/**
 * Validate file before upload
 * Checks:
 * 1. MIME type is in allowlist
 * 2. File size doesn't exceed limit
 * 3. Extension is not in blocklist
 * 4. Extension matches MIME type
 *
 * @param file - File to validate
 * @returns ValidationResult with error if invalid
 *
 * @example
 * const result = validateFileUpload(file)
 * if (!result.valid) {
 *   return { error: result.error }
 * }
 */
export function validateFileUpload(file: File): ValidationResult {
  if (!file) {
    return {
      valid: false,
      error: 'No file provided',
    }
  }

  // 1. Check if file has a name
  if (!file.name || file.name.trim() === '') {
    return {
      valid: false,
      error: 'File must have a name',
    }
  }

  // 2. Check MIME type against allowlist
  if (!ALLOWED_MIME_TYPES[file.type]) {
    const allowedTypes = Object.keys(ALLOWED_MIME_TYPES).join(', ')
    return {
      valid: false,
      error: `File type "${file.type || 'unknown'}" is not allowed. Supported types: ${allowedTypes}`,
    }
  }

  // 3. Check file size
  const maxSize = ALLOWED_MIME_TYPES[file.type].maxSize
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    }
  }

  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(2)
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2)
    return {
      valid: false,
      error: `File size ${fileSizeMB}MB exceeds maximum ${maxSizeMB}MB for this file type`,
    }
  }

  // 4. Check file extension
  const ext = getFileExtension(file.name).toLowerCase()
  if (ext && DANGEROUS_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `File extension ".${ext}" is not allowed for security reasons`,
    }
  }

  // 5. Validate extension matches MIME type (warning only)
  const expectedExt = ALLOWED_MIME_TYPES[file.type].ext
  if (ext && ext !== expectedExt) {
    // Allow but log warning - some systems use different extensions
    console.warn(
      `Warning: File extension ".${ext}" may not match MIME type "${file.type}". Expected: ".${expectedExt}"`
    )
  }

  return { valid: true }
}

/**
 * Sanitize filename to prevent directory traversal and special characters
 *
 * @param filename - Filename to sanitize
 * @returns Safe filename
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'file'

  return (
    filename
      .replace(/\\/g, '') // Remove backslashes
      .replace(/\//g, '') // Remove forward slashes
      .replace(/\.\./g, '') // Remove dot-dot
      .replace(/[<>:"|?*\x00-\x1f]/g, '') // Remove special/control characters
      .replace(/\s+/g, '_') // Replace whitespace with underscore
      .substring(0, 255) // Limit filename length
  )
}

/**
 * Generate safe filename for storage with unique identifier
 *
 * @param originalName - Original filename from upload
 * @param userId - User ID for tracking
 * @returns Safe unique filename
 */
export function generateSafeFilename(originalName: string, userId: number): string {
  const ext = getFileExtension(originalName)
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)

  // Format: user_123_timestamp_random.ext
  return `u${userId}_${timestamp}_${random}.${ext}`
}

/**
 * Get file extension from filename
 *
 * @param filename - Filename
 * @returns File extension without the dot
 */
function getFileExtension(filename: string): string {
  if (!filename) return ''
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

/**
 * Validate file content by checking magic bytes (file signature)
 * This prevents MIME type spoofing attacks
 *
 * @param buffer - File content as ArrayBuffer
 * @param mimeType - Expected MIME type
 * @returns True if magic bytes match expected type, false otherwise
 */
export async function validateFileContent(buffer: ArrayBuffer, mimeType: string): Promise<boolean> {
  // Magic numbers for common file types
  const magicNumbers: Record<string, number[]> = {
    'image/jpeg': [0xff, 0xd8, 0xff], // JPEG starts with FFD8FF
    'image/png': [0x89, 0x50, 0x4e, 0x47], // PNG starts with 89504E47
    'image/gif': [0x47, 0x49, 0x46], // GIF starts with GIF
    'image/webp': [0x52, 0x49, 0x46, 0x46], // WebP starts with RIFF
    'application/pdf': [0x25, 0x50, 0x44, 0x46], // PDF starts with %PDF
  }

  const magic = magicNumbers[mimeType]
  if (!magic) return true // No magic bytes defined for this type, skip validation

  const bytes = new Uint8Array(buffer)

  // Check if file has enough bytes
  if (bytes.length < magic.length) {
    return false
  }

  // Check if file starts with expected magic bytes
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic[i]) {
      return false
    }
  }

  return true
}

/**
 * Get human-readable file size
 *
 * @param bytes - Size in bytes
 * @returns Human-readable size string
 */
export function getReadableFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}

/**
 * Get maximum allowed file size for a MIME type
 *
 * @param mimeType - MIME type
 * @returns Maximum file size in bytes
 */
export function getMaxFileSize(mimeType: string): number {
  return ALLOWED_MIME_TYPES[mimeType]?.maxSize ?? 0
}

/**
 * Get list of allowed MIME types
 *
 * @returns Array of allowed MIME types
 */
export function getAllowedMimeTypes(): string[] {
  return Object.keys(ALLOWED_MIME_TYPES)
}

/**
 * Check if MIME type is allowed
 *
 * @param mimeType - MIME type to check
 * @returns True if allowed, false otherwise
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return mimeType in ALLOWED_MIME_TYPES
}
