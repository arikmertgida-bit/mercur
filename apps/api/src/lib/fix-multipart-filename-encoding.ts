// Multer/busboy decode the multipart `Content-Disposition: filename="..."`
// header as latin1 by default (a legacy RFC 2388 assumption). Every non-ASCII
// byte a real browser sends today is valid UTF-8, so a filename like
// "ELEKTRONİK.png" arrives in `file.originalname` with each UTF-8 byte
// misread as one latin1 character (e.g. "İ" == 0xC4 0xB0 becomes "Ä°").
// Re-decoding those mis-read characters as UTF-8 recovers the original name.
export function fixMultipartFilenameEncoding(originalname: string): string {
  return Buffer.from(originalname, "latin1").toString("utf8")
}
