//! Fulhash types - generated from Crucible SSOT
//!
//! Version: v1.0.0
//! Source: schemas/library/fulhash/v1.0.0/

use serde::{Deserialize, Serialize};

// ============================================================================
// Enums
// ============================================================================

/// Algorithm represents supported hashing algorithms for fulhash.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Algorithm {
    /// Fast non-cryptographic hash (default). Excellent collision resistance, extremely high throughput (50GB/s+).
    #[serde(rename = "xxh3-128")]
    Xxh3128,
    /// Cryptographic security standard. Resistant to intentional collisions. Use for security verification.
    #[serde(rename = "sha256")]
    Sha256,
    /// 32-bit Cyclic Redundancy Check. Standard for GZIP/ZIP/PNG legacy format interoperability.
    #[serde(rename = "crc32")]
    Crc32,
    /// 32-bit CRC (Castagnoli). HW accelerated (SSE4.2/ARMv8). Use for cloud storage (GCS, AWS) and networking.
    #[serde(rename = "crc32c")]
    Crc32c,
}

impl std::fmt::Display for Algorithm {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Xxh3128 => write!(f, "xxh3-128"),
            Self::Sha256 => write!(f, "sha256"),
            Self::Crc32 => write!(f, "crc32"),
            Self::Crc32c => write!(f, "crc32c"),
        }
    }
}

// ============================================================================
// Data Structures
// ============================================================================

/// Digest standard digest payload returned by fulhash helpers.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Digest {
    /// Hash algorithm identifier
    #[serde(rename = "algorithm")]
    pub algorithm: String,
    /// Lowercase hexadecimal representation of the digest
    #[serde(rename = "hex")]
    pub hex: String,
    /// Canonical string representation '<algorithm>:<hex>'
    #[serde(rename = "formatted")]
    pub formatted: String,

    /// Raw digest bytes (optional)
    #[serde(rename = "bytes")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bytes: Option<Vec<u8>>,
}

/// Fulhash module version
pub const FULHASH_VERSION: &str = "v1.0.0";
