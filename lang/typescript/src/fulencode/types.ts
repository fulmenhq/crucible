/**
 * Fulencode Types - Generated from Crucible schemas.
 *
 * This file is AUTO-GENERATED from the Fulencode module specification.
 * DO NOT EDIT MANUALLY - changes will be overwritten.
 *
 * Schema Version: v1.0.0
 * Last Reviewed: 2025-11-13
 * Source: schemas/taxonomy/library/fulencode/
 *
 * See: https://github.com/fulmenhq/crucible/blob/main/docs/standards/library/modules/fulencode.md
 */

// ============================================================================
// Enums (TypeScript Enums)
// ============================================================================

/**
 * EncodingFormat enum
 * @see schemas/taxonomy/library/fulencode/encoding-families/v1.0.0/families.yaml
 */
export enum EncodingFormat {
  /** General purpose binary encoding, email attachments */
  BASE64 = "base64",
  /** URL-safe tokens, JWT, query parameters */
  BASE64URL = "base64url",
  /** Base64 without padding */
  BASE64_RAW = "base64_raw",
  /** Human-readable identifiers, case-insensitive encodings */
  BASE32 = "base32",
  /** Hexadecimal-ordered Base32 */
  BASE32HEX = "base32hex",
  /** Checksums, debug output, color codes */
  HEX = "hex",
  /** Universal text encoding, web, APIs */
  UTF_8 = "utf-8",
  /** Windows internals, Java string storage */
  UTF_16LE = "utf-16le",
  /** Network protocols, some Unix systems */
  UTF_16BE = "utf-16be",
  /** Western European text, HTTP headers */
  ISO_8859_1 = "iso-8859-1",
  /** Windows Western European (superset of ISO-8859-1) */
  CP1252 = "cp1252",
  /** 7-bit printable subset of UTF-8 */
  ASCII = "ascii",
}

/**
 * NormalizationProfile enum
 * @see schemas/taxonomy/library/fulencode/normalization-profiles/v1.0.0/profiles.yaml
 */
export enum NormalizationProfile {
  /** Compose combining marks with base characters (e.g., e + ´ → é) */
  NFC = "nfc",
  /** Decompose composed characters into base + combining marks (é → e + ´) */
  NFD = "nfd",
  /** Decompose compatibility equivalents then compose (ﬁ → fi, ² → 2) */
  NFKC = "nfkc",
  /** Full decomposition including compatibility (ﬁ → f + i, ² → 2) */
  NFKD = "nfkd",
  /** User names, API keys, identifiers requiring strict validation */
  SAFE_IDENTIFIERS = "safe_identifiers",
  /** Full-text search, fuzzy matching */
  SEARCH_OPTIMIZED = "search_optimized",
  /** Cross-platform file names */
  FILENAME_SAFE = "filename_safe",
  /** Log-safe and UI-safe text display (prevent spoofing and hidden content) */
  TEXT_SAFE = "text_safe",
  /** Legacy system integration (limited Unicode support) */
  LEGACY_COMPATIBLE = "legacy_compatible",
}

/**
 * ConfidenceLevel enum
 * @see schemas/taxonomy/library/fulencode/detection-confidence/v1.0.0/levels.yaml
 */
export enum ConfidenceLevel {
  /** Very likely correct encoding */
  HIGH = "high",
  /** Probable encoding, may need fallback */
  MEDIUM = "medium",
  /** Ambiguous or uncertain */
  LOW = "low",
}

// ============================================================================
// Module Metadata
// ============================================================================

/**
 * Module version for compatibility checks.
 */
export const FULENCODE_VERSION = "v1.0.0";
