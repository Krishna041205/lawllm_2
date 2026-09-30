/**
 * PostgreSQL Unicode and Control Character Sanitizer
 *
 * PostgreSQL text, varchar, and jsonb strictly prohibit:
 * - \0 (0x00 null bytes)
 * - \u0000 literal Unicode escape sequences in json/jsonb (Error 22P05: unsupported Unicode escape sequence)
 * - Non-printable control characters that disrupt UTF-8 text processing
 */

export function sanitizePostgresString(str: string): string {
  if (!str || typeof str !== "string") {
    return (str as any) || "";
  }

  // 1. Remove null byte chars (\0 / \x00) and literal string representations \u0000 / \\u0000
  let cleaned = str
    .replace(/\0/g, "")
    .replace(/\\u0000/g, "")
    .replace(/\\x00/g, "");

  // 2. Replace unprintable ASCII control characters (0x01-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F) with spaces
  // Note: Preserve \t (0x09), \n (0x0A), \r (0x0D)
  cleaned = cleaned.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F\uFFFD]/g, " ");

  return cleaned;
}

export function sanitizePostgresObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return sanitizePostgresString(obj) as any;
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return obj;
  }

  if (obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizePostgresObject) as any;
  }

  if (typeof obj === "object") {
    const sanitizedObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizePostgresString(key);
      sanitizedObj[sanitizedKey] = sanitizePostgresObject(value);
    }
    return sanitizedObj;
  }

  return obj;
}
