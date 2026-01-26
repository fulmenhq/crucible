//! Fulencode types - generated from Crucible SSOT
//!
//! Version: v1.0.0
//! Source: schemas/library/fulencode/v1.0.0/

use serde::{Deserialize, Serialize};

// ============================================================================
// Enums
// ============================================================================

/// EncodingFormat represents encodingformat enum.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EncodingFormat {
    /// General purpose binary encoding, email attachments
    #[serde(rename = "base64")]
    Base64,
    /// URL-safe tokens, JWT, query parameters
    #[serde(rename = "base64url")]
    Base64url,
    /// Base64 without padding
    #[serde(rename = "base64_raw")]
    Base64Raw,
    /// Human-readable identifiers, case-insensitive encodings
    #[serde(rename = "base32")]
    Base32,
    /// Hexadecimal-ordered Base32
    #[serde(rename = "base32hex")]
    Base32hex,
    /// Checksums, debug output, color codes
    #[serde(rename = "hex")]
    Hex,
    /// Universal text encoding, web, APIs
    #[serde(rename = "utf-8")]
    Utf8,
    /// Windows internals, Java string storage
    #[serde(rename = "utf-16le")]
    Utf16le,
    /// Network protocols, some Unix systems
    #[serde(rename = "utf-16be")]
    Utf16be,
    /// Western European text, HTTP headers
    #[serde(rename = "iso-8859-1")]
    Iso88591,
    /// Windows Western European (superset of ISO-8859-1)
    #[serde(rename = "cp1252")]
    Cp1252,
    /// 7-bit printable subset of UTF-8
    #[serde(rename = "ascii")]
    Ascii,
}

impl std::fmt::Display for EncodingFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Base64 => write!(f, "base64"),
            Self::Base64url => write!(f, "base64url"),
            Self::Base64Raw => write!(f, "base64_raw"),
            Self::Base32 => write!(f, "base32"),
            Self::Base32hex => write!(f, "base32hex"),
            Self::Hex => write!(f, "hex"),
            Self::Utf8 => write!(f, "utf-8"),
            Self::Utf16le => write!(f, "utf-16le"),
            Self::Utf16be => write!(f, "utf-16be"),
            Self::Iso88591 => write!(f, "iso-8859-1"),
            Self::Cp1252 => write!(f, "cp1252"),
            Self::Ascii => write!(f, "ascii"),
        }
    }
}

/// NormalizationProfile represents normalizationprofile enum.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NormalizationProfile {
    /// Compose combining marks with base characters (e.g., e + ´ → é)
    #[serde(rename = "nfc")]
    Nfc,
    /// Decompose composed characters into base + combining marks (é → e + ´)
    #[serde(rename = "nfd")]
    Nfd,
    /// Decompose compatibility equivalents then compose (ﬁ → fi, ² → 2)
    #[serde(rename = "nfkc")]
    Nfkc,
    /// Full decomposition including compatibility (ﬁ → f + i, ² → 2)
    #[serde(rename = "nfkd")]
    Nfkd,
    /// User names, API keys, identifiers requiring strict validation
    #[serde(rename = "safe_identifiers")]
    SafeIdentifiers,
    /// Full-text search, fuzzy matching
    #[serde(rename = "search_optimized")]
    SearchOptimized,
    /// Cross-platform file names
    #[serde(rename = "filename_safe")]
    FilenameSafe,
    /// Log-safe and UI-safe text display (prevent spoofing and hidden content)
    #[serde(rename = "text_safe")]
    TextSafe,
    /// Legacy system integration (limited Unicode support)
    #[serde(rename = "legacy_compatible")]
    LegacyCompatible,
}

impl std::fmt::Display for NormalizationProfile {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Nfc => write!(f, "nfc"),
            Self::Nfd => write!(f, "nfd"),
            Self::Nfkc => write!(f, "nfkc"),
            Self::Nfkd => write!(f, "nfkd"),
            Self::SafeIdentifiers => write!(f, "safe_identifiers"),
            Self::SearchOptimized => write!(f, "search_optimized"),
            Self::FilenameSafe => write!(f, "filename_safe"),
            Self::TextSafe => write!(f, "text_safe"),
            Self::LegacyCompatible => write!(f, "legacy_compatible"),
        }
    }
}

/// ConfidenceLevel represents confidencelevel enum.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConfidenceLevel {
    /// Very likely correct encoding
    #[serde(rename = "high")]
    High,
    /// Probable encoding, may need fallback
    #[serde(rename = "medium")]
    Medium,
    /// Ambiguous or uncertain
    #[serde(rename = "low")]
    Low,
}

impl std::fmt::Display for ConfidenceLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::High => write!(f, "high"),
            Self::Medium => write!(f, "medium"),
            Self::Low => write!(f, "low"),
        }
    }
}

/// Fulencode module version
pub const FULENCODE_VERSION: &str = "v1.0.0";
