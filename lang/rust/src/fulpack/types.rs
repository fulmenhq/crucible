//! Fulpack types - generated from Crucible SSOT
//!
//! Version: v1.0.0
//! Source: schemas/library/fulpack/v1.0.0/

use serde::{Deserialize, Serialize};

// ============================================================================
// Enums
// ============================================================================

/// ArchiveFormat represents archiveformat enum.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ArchiveFormat {
    /// POSIX tar archive (uncompressed)
    #[serde(rename = "tar")]
    Tar,
    /// POSIX tar archive with gzip compression
    #[serde(rename = "tar.gz")]
    TarGz,
    /// ZIP archive with deflate compression
    #[serde(rename = "zip")]
    Zip,
    /// GZIP compressed single file
    #[serde(rename = "gzip")]
    Gzip,
}

impl std::fmt::Display for ArchiveFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Tar => write!(f, "tar"),
            Self::TarGz => write!(f, "tar.gz"),
            Self::Zip => write!(f, "zip"),
            Self::Gzip => write!(f, "gzip"),
        }
    }
}

/// EntryType represents entrytype enum.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EntryType {
    /// Normal file with data
    #[serde(rename = "file")]
    File,
    /// Directory/folder entry
    #[serde(rename = "directory")]
    Directory,
    /// Symbolic link to another entry
    #[serde(rename = "symlink")]
    Symlink,
}

impl std::fmt::Display for EntryType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::File => write!(f, "file"),
            Self::Directory => write!(f, "directory"),
            Self::Symlink => write!(f, "symlink"),
        }
    }
}

/// Operation represents operation enum.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Operation {
    /// Create new archive from source files/directories
    #[serde(rename = "create")]
    Create,
    /// Extract archive contents to destination
    #[serde(rename = "extract")]
    Extract,
    /// List archive entries (for Pathfinder integration)
    #[serde(rename = "scan")]
    Scan,
    /// Validate archive integrity and checksums
    #[serde(rename = "verify")]
    Verify,
    /// Get archive metadata without extraction
    #[serde(rename = "info")]
    Info,
}

impl std::fmt::Display for Operation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Create => write!(f, "create"),
            Self::Extract => write!(f, "extract"),
            Self::Scan => write!(f, "scan"),
            Self::Verify => write!(f, "verify"),
            Self::Info => write!(f, "info"),
        }
    }
}

// ============================================================================
// Data Structures
// ============================================================================

/// ArchiveInfo metadata about an archive file.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveInfo {
    /// Archive format from archive-formats taxonomy
    #[serde(rename = "format")]
    pub format: String,
    /// Total number of entries in the archive
    #[serde(rename = "entry_count")]
    pub entry_count: i64,
    /// Total uncompressed size in bytes
    #[serde(rename = "total_size")]
    pub total_size: i64,
    /// Compressed archive file size in bytes
    #[serde(rename = "compressed_size")]
    pub compressed_size: i64,

    /// Compression algorithm used
    #[serde(rename = "compression")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compression: Option<String>,
    /// Compression ratio (total_size / compressed_size)
    #[serde(rename = "compression_ratio")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compression_ratio: Option<f64>,
    /// Whether the archive contains checksums
    #[serde(rename = "has_checksums")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub has_checksums: Option<bool>,
    /// Checksum algorithm used from fulhash module (xxh3-128 and sha256 are standard, others may require optional extensions)
    #[serde(rename = "checksum_algorithm")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checksum_algorithm: Option<String>,
    /// Archive creation timestamp (ISO 8601 format)
    #[serde(rename = "created")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created: Option<String>,
}

/// ArchiveEntry metadata for a single archive entry (returned by scan operation).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveEntry {
    /// Normalized entry path within archive
    #[serde(rename = "path")]
    pub path: String,
    /// Entry type from entry-types taxonomy
    #[serde(rename = "type")]
    pub r#type: String,
    /// Uncompressed size in bytes
    #[serde(rename = "size")]
    pub size: i64,

    /// Compressed size in bytes (if available)
    #[serde(rename = "compressed_size")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compressed_size: Option<i64>,
    /// Modification timestamp (ISO 8601 format)
    #[serde(rename = "modified")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified: Option<String>,
    /// SHA-256 checksum (64 hex characters)
    #[serde(rename = "checksum")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checksum: Option<String>,
    /// Unix file permissions (octal string, e.g., '0644')
    #[serde(rename = "mode")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mode: Option<String>,
    /// Target path if type is symlink, null otherwise
    #[serde(rename = "symlink_target")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub symlink_target: Option<String>,
}

/// ArchiveManifest complete archive table of contents (for large archives and caching).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveManifest {
    /// Archive format from archive-formats taxonomy
    #[serde(rename = "format")]
    pub format: String,
    /// Manifest schema version (semantic versioning)
    #[serde(rename = "version")]
    pub version: String,
    /// Manifest generation timestamp (ISO 8601 format)
    #[serde(rename = "generated")]
    pub generated: String,
    /// Total number of entries in manifest
    #[serde(rename = "entry_count")]
    pub entry_count: i64,
    /// Array of archive entries
    #[serde(rename = "entries")]
    pub entries: Vec<serde_json::Value>,

    /// Total uncompressed size in bytes
    #[serde(rename = "total_size")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_size: Option<i64>,
    /// Compressed archive file size in bytes
    #[serde(rename = "compressed_size")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compressed_size: Option<i64>,
    /// Optional searchable index for fast lookups
    #[serde(rename = "index")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub index: Option<std::collections::HashMap<String, serde_json::Value>>,
}

/// ValidationResult result of archive integrity verification (from verify operation).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationResult {
    /// Whether the archive is valid and intact
    #[serde(rename = "valid")]
    pub valid: bool,
    /// Array of validation errors (empty if valid)
    #[serde(rename = "errors")]
    pub errors: Vec<String>,
    /// Array of non-critical warnings (e.g., missing checksums)
    #[serde(rename = "warnings")]
    pub warnings: Vec<String>,
    /// Number of entries validated
    #[serde(rename = "entry_count")]
    pub entry_count: i64,

    /// Number of checksums successfully verified
    #[serde(rename = "checksums_verified")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checksums_verified: Option<i64>,
    /// List of security and integrity checks performed
    #[serde(rename = "checks_performed")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checks_performed: Option<Vec<String>>,
}

/// ExtractResult result of archive extraction operation.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractResult {
    /// Number of entries successfully extracted
    #[serde(rename = "extracted_count")]
    pub extracted_count: i64,
    /// Number of entries skipped (e.g., already exists)
    #[serde(rename = "skipped_count")]
    pub skipped_count: i64,
    /// Number of entries that failed to extract
    #[serde(rename = "error_count")]
    pub error_count: i64,

    /// Array of error messages for failed extractions
    #[serde(rename = "errors")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub errors: Option<Vec<String>>,
    /// Array of warning messages (e.g., skipped files)
    #[serde(rename = "warnings")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub warnings: Option<Vec<String>>,
    /// Number of checksums successfully verified during extraction
    #[serde(rename = "checksums_verified")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checksums_verified: Option<i64>,
    /// Total bytes extracted
    #[serde(rename = "total_bytes")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_bytes: Option<i64>,
}

// ============================================================================
// Options
// ============================================================================

/// CreateOptions options for archive creation operation.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CreateOptions {
    /// Compression level (1=fastest, 9=best compression, format-dependent)
    #[serde(rename = "compression_level")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compression_level: Option<i64>,
    /// Glob patterns for files to include (e.g., `["**/*.py", "**/*.md"]`)
    #[serde(rename = "include_patterns")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub include_patterns: Option<Vec<String>>,
    /// Glob patterns for files to exclude (e.g., `["**/__pycache__", "**/.git"]`)
    #[serde(rename = "exclude_patterns")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exclude_patterns: Option<Vec<String>>,
    /// Checksum algorithm for entry verification (xxh3-128 and sha256 are standard via fulhash module, others may require optional extensions)
    #[serde(rename = "checksum_algorithm")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checksum_algorithm: Option<String>,
    /// Preserve Unix file permissions in archive
    #[serde(rename = "preserve_permissions")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preserve_permissions: Option<bool>,
    /// Follow symbolic links and archive their targets
    #[serde(rename = "follow_symlinks")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub follow_symlinks: Option<bool>,
}

/// ExtractOptions options for archive extraction operation.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ExtractOptions {
    /// How to handle existing files (error=fail, skip=keep existing, overwrite=replace)
    #[serde(rename = "overwrite")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overwrite: Option<String>,
    /// Verify checksums during extraction if available
    #[serde(rename = "verify_checksums")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub verify_checksums: Option<bool>,
    /// Preserve Unix file permissions from archive
    #[serde(rename = "preserve_permissions")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preserve_permissions: Option<bool>,
    /// Glob patterns for entries to extract (e.g., `["**/*.csv"]`)
    #[serde(rename = "include_patterns")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub include_patterns: Option<Vec<String>>,
    /// Maximum total decompressed size in bytes (decompression bomb protection)
    #[serde(rename = "max_size")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_size: Option<i64>,
    /// Maximum number of entries to extract (decompression bomb protection)
    #[serde(rename = "max_entries")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_entries: Option<i64>,
}

/// ScanOptions options for archive scanning operation (for pathfinder integration).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ScanOptions {
    /// Include metadata (size, checksum, modified timestamp) in results
    #[serde(rename = "include_metadata")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub include_metadata: Option<bool>,
    /// Filter entries by type (from entry-types taxonomy)
    #[serde(rename = "entry_types")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entry_types: Option<Vec<String>>,
    /// Maximum depth for directory traversal (null = unlimited)
    #[serde(rename = "max_depth")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_depth: Option<i64>,
    /// Safety limit for maximum entries to return
    #[serde(rename = "max_entries")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_entries: Option<i64>,
}

/// Fulpack module version
pub const FULPACK_VERSION: &str = "v1.0.0";
