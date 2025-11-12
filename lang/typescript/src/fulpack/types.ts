/**
 * Fulpack Types - Generated from Crucible schemas.
 *
 * This file is AUTO-GENERATED from the Fulpack module specification.
 * DO NOT EDIT MANUALLY - changes will be overwritten.
 *
 * Schema Version: v1.0.0
 * Last Reviewed: 2025-11-12
 * Source: schemas/library/fulpack/v1.0.0/
 *
 * See: https://github.com/fulmenhq/crucible/blob/main/docs/standards/library/modules/fulpack.md
 */

// ============================================================================
// Enums (String Literal Union Types)
// ============================================================================

/**
 * ArchiveFormat enum
 * @see schemas/taxonomy/library/fulpack/archive-formats/v1.0.0/formats.yaml
 */
export type ArchiveFormat = "tar.gz" | "zip" | "gzip";

/**
 * EntryType enum
 * @see schemas/taxonomy/library/fulpack/entry-types/v1.0.0/types.yaml
 */
export type EntryType = "file" | "directory" | "symlink";

/**
 * Operation enum
 * @see schemas/taxonomy/library/fulpack/operations/v1.0.0/operations.yaml
 */
export type Operation = "create" | "extract" | "scan" | "verify" | "info";

// ============================================================================
// Data Structures (Interfaces)
// ============================================================================

/**
 * Metadata about an archive file
 * @see schemas/library/fulpack/v1.0.0/archive-info.schema.json
 */
export interface ArchiveInfo {
  readonly format: "tar.gz" | "zip" | "gzip"; // Archive format from archive-formats taxonomy
  readonly entry_count: number; // Total number of entries in the archive
  readonly total_size: number; // Total uncompressed size in bytes
  readonly compressed_size: number; // Compressed archive file size in bytes
  readonly compression?: "gzip" | "deflate" | "none"; // Compression algorithm used
  readonly compression_ratio?: number; // Compression ratio (total_size / compressed_size)
  readonly has_checksums?: boolean; // Whether the archive contains checksums
  readonly checksum_algorithm?: "sha256" | "sha512" | "sha1" | "md5"; // Checksum algorithm used (if has_checksums is true)
  readonly created?: string; // Archive creation timestamp (ISO 8601 format)
}

/**
 * Metadata for a single archive entry (returned by scan operation)
 * @see schemas/library/fulpack/v1.0.0/archive-entry.schema.json
 */
export interface ArchiveEntry {
  readonly path: string; // Normalized entry path within archive
  readonly type: "file" | "directory" | "symlink"; // Entry type from entry-types taxonomy
  readonly size: number; // Uncompressed size in bytes
  readonly compressed_size?: number; // Compressed size in bytes (if available)
  readonly modified?: string; // Modification timestamp (ISO 8601 format)
  readonly checksum?: string; // SHA-256 checksum (64 hex characters)
  readonly mode?: string; // Unix file permissions (octal string, e.g., '0644')
  readonly symlink_target?: string | null; // Target path if type is symlink, null otherwise
}

/**
 * Complete archive table of contents (for large archives and caching)
 * @see schemas/library/fulpack/v1.0.0/archive-manifest.schema.json
 */
export interface ArchiveManifest {
  readonly format: "tar.gz" | "zip" | "gzip"; // Archive format from archive-formats taxonomy
  readonly version: string; // Manifest schema version (semantic versioning)
  readonly generated: string; // Manifest generation timestamp (ISO 8601 format)
  readonly entry_count: number; // Total number of entries in manifest
  readonly entries: unknown[]; // Array of archive entries
  readonly total_size?: number; // Total uncompressed size in bytes
  readonly compressed_size?: number; // Compressed archive file size in bytes
  readonly index?: Record<string, unknown>; // Optional searchable index for fast lookups
}

/**
 * Result of archive integrity verification (from verify operation)
 * @see schemas/library/fulpack/v1.0.0/validation-result.schema.json
 */
export interface ValidationResult {
  readonly valid: boolean; // Whether the archive is valid and intact
  readonly errors: string[]; // Array of validation errors (empty if valid)
  readonly warnings: string[]; // Array of non-critical warnings (e.g., missing checksums)
  readonly entry_count: number; // Number of entries validated
  readonly checksums_verified?: number; // Number of checksums successfully verified
  readonly checks_performed?:
    | "structure_valid"
    | "checksums_verified"
    | "no_path_traversal"
    | "no_decompression_bomb"
    | "symlinks_safe"[]; // List of security and integrity checks performed
}

/**
 * Result of archive extraction operation
 * @see schemas/library/fulpack/v1.0.0/extract-result.schema.json
 */
export interface ExtractResult {
  readonly extracted_count: number; // Number of entries successfully extracted
  readonly skipped_count: number; // Number of entries skipped (e.g., already exists)
  readonly error_count: number; // Number of entries that failed to extract
  readonly errors?: string[]; // Array of error messages for failed extractions
  readonly warnings?: string[]; // Array of warning messages (e.g., skipped files)
  readonly checksums_verified?: number; // Number of checksums successfully verified during extraction
  readonly total_bytes?: number; // Total bytes extracted
}

// ============================================================================
// Options (Partial Interfaces)
// ============================================================================

/**
 * Options for archive creation operation
 * @see schemas/library/fulpack/v1.0.0/create-options.schema.json
 *
 * All fields are optional. Use when calling functions.
 */
export interface CreateOptions {
  compression_level?: number; // Compression level (1=fastest, 9=best compression, format-dependent)
  include_patterns?: string[]; // Glob patterns for files to include (e.g., ['**/*.py', '**/*.md'])
  exclude_patterns?: string[]; // Glob patterns for files to exclude (e.g., ['**/__pycache__', '**/.git'])
  checksum_algorithm?: "sha256" | "sha512" | "sha1" | "md5"; // Checksum algorithm for entry verification
  preserve_permissions?: boolean; // Preserve Unix file permissions in archive
  follow_symlinks?: boolean; // Follow symbolic links and archive their targets
}

/**
 * Options for archive extraction operation
 * @see schemas/library/fulpack/v1.0.0/extract-options.schema.json
 *
 * All fields are optional. Use when calling functions.
 */
export interface ExtractOptions {
  overwrite?: "error" | "skip" | "overwrite"; // How to handle existing files (error=fail, skip=keep existing, overwrite=replace)
  verify_checksums?: boolean; // Verify checksums during extraction if available
  preserve_permissions?: boolean; // Preserve Unix file permissions from archive
  include_patterns?: string[]; // Glob patterns for entries to extract (e.g., ['**/*.csv'])
  max_size?: number; // Maximum total decompressed size in bytes (decompression bomb protection)
  max_entries?: number; // Maximum number of entries to extract (decompression bomb protection)
}

/**
 * Options for archive scanning operation (for Pathfinder integration)
 * @see schemas/library/fulpack/v1.0.0/scan-options.schema.json
 *
 * All fields are optional. Use when calling functions.
 */
export interface ScanOptions {
  include_metadata?: boolean; // Include metadata (size, checksum, modified timestamp) in results
  entry_types?: "file" | "directory" | "symlink"[]; // Filter entries by type (from entry-types taxonomy)
  max_depth?: number | null; // Maximum depth for directory traversal (null = unlimited)
  max_entries?: number; // Safety limit for maximum entries to return
}

// ============================================================================
// Module Metadata
// ============================================================================

/**
 * Module version for compatibility checks.
 */
export const FULPACK_VERSION = "v1.0.0";
