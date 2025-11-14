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
// Enums (String Literal Union Types)
// ============================================================================

/**
 * EncodingFormat enum
 * @see schemas/taxonomy/library/fulencode/encoding-families/v1.0.0/families.yaml
 */
export type EncodingFormat =
  | "base64"
  | "base64url"
  | "base64_raw"
  | "base32"
  | "base32hex"
  | "hex"
  | "utf-8"
  | "utf-16le"
  | "utf-16be"
  | "iso-8859-1"
  | "cp1252"
  | "ascii";

/**
 * NormalizationProfile enum
 * @see schemas/taxonomy/library/fulencode/normalization-profiles/v1.0.0/profiles.yaml
 */
export type NormalizationProfile =
  | "nfc"
  | "nfd"
  | "nfkc"
  | "nfkd"
  | "safe_identifiers"
  | "search_optimized"
  | "filename_safe"
  | "legacy_compatible";

/**
 * ConfidenceLevel enum
 * @see schemas/taxonomy/library/fulencode/detection-confidence/v1.0.0/levels.yaml
 */
export type ConfidenceLevel = "high" | "medium" | "low";

// ============================================================================
// Module Metadata
// ============================================================================

/**
 * Module version for compatibility checks.
 */
export const FULENCODE_VERSION = "v1.0.0";
