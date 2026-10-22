import multer from 'multer'

// Customer avatar/banner images — multer's own `fileFilter` only sees the
// client-supplied Content-Type (trivially spoofable: an attacker can rename
// malicious.html to photo.jpg and send `Content-Type: image/jpeg`), so it is
// a cheap first filter only. The real check is
// matchesAllowedImageMagicBytes() below, run against the buffered file
// content after upload.
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

export const MAX_IMAGE_FILE_SIZE = 8 * 1024 * 1024 // 8MB
export const MAX_IMAGE_FILES = 10

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_FILE_SIZE, files: MAX_IMAGE_FILES },
  fileFilter: (_req, file, callback) => {
    callback(null, ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype))
  },
})

// Verifies the file's actual bytes match one of the allowed image formats,
// independent of whatever Content-Type/extension the client claimed —
// blocks e.g. an SVG or HTML file (which can carry a <script>) uploaded
// with a spoofed image/* mimetype and a .jpg filename.
export function matchesAllowedImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) {
    return false
  }

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  const isGif =
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50

  return isJpeg || isPng || isGif || isWebp
}

// Bulk product CSV import — same "cheap client-supplied filter, then verify
// real content" split as images. A CSV has no reliable magic bytes, so the
// content check instead rejects anything containing a NUL byte (a real CSV
// export never produces one; binary content masquerading as .csv typically
// does).
export const ALLOWED_CSV_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
]

export const MAX_CSV_FILE_SIZE = 15 * 1024 * 1024 // 15MB

export const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CSV_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    callback(null, ALLOWED_CSV_MIME_TYPES.includes(file.mimetype))
  },
})

export function looksLikeTextCsv(buffer: Buffer): boolean {
  return !buffer.subarray(0, 8192).includes(0)
}
