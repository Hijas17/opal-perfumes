/**
 * Resolve an image path returned by the API to a fully-qualified URL.
 *
 * - Absolute URLs (http/https) are returned as-is so external images (e.g. Google Drive)
 *   keep working after bulk import.
 * - Relative paths are prefixed with the configured uploads URL.
 */
const UPLOADS_URL = process.env.NEXT_PUBLIC_UPLOADS_URL || 'http://localhost:8000/uploads'

export function getImageUrl(path?: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${UPLOADS_URL}/${path.replace(/^\//, '')}`
}

export { UPLOADS_URL }
