// Package fulpack provides type definitions for fulpack archive operations.
//
// This file is AUTO-GENERATED from the Fulpack module specification.
// DO NOT EDIT MANUALLY - changes will be overwritten.
//
// Schema Version: v1.0.0
// Last Reviewed: 2025-11-12
// Source: schemas/library/fulpack/v1.0.0/
//
// See: https://github.com/fulmenhq/crucible/blob/main/docs/standards/library/modules/fulpack.md
package fulpack

import (
	"fmt"
)

// ============================================================================
// Enums (Typed String Constants)
// ============================================================================

// ArchiveFormat represents archiveformat enum.
// See: schemas/taxonomy/library/fulpack/archive-formats/v1.0.0/formats.yaml
type ArchiveFormat string

const (
	ArchiveFormatTarGz ArchiveFormat = "tar.gz"
	ArchiveFormatZip   ArchiveFormat = "zip"
	ArchiveFormatGzip  ArchiveFormat = "gzip"
)

// ValidateArchiveFormat checks if the value is valid.
func ValidateArchiveFormat(value ArchiveFormat) error {
	switch value {
	case ArchiveFormatTarGz:
	case ArchiveFormatZip:
	case ArchiveFormatGzip:
	default:
		return fmt.Errorf("invalid archiveformat: %s", value)
	}
	return nil
}

// EntryType represents entrytype enum.
// See: schemas/taxonomy/library/fulpack/entry-types/v1.0.0/types.yaml
type EntryType string

const (
	EntryTypeFile      EntryType = "file"
	EntryTypeDirectory EntryType = "directory"
	EntryTypeSymlink   EntryType = "symlink"
)

// ValidateEntryType checks if the value is valid.
func ValidateEntryType(value EntryType) error {
	switch value {
	case EntryTypeFile:
	case EntryTypeDirectory:
	case EntryTypeSymlink:
	default:
		return fmt.Errorf("invalid entrytype: %s", value)
	}
	return nil
}

// Operation represents operation enum.
// See: schemas/taxonomy/library/fulpack/operations/v1.0.0/operations.yaml
type Operation string

const (
	OperationCreate  Operation = "create"
	OperationExtract Operation = "extract"
	OperationScan    Operation = "scan"
	OperationVerify  Operation = "verify"
	OperationInfo    Operation = "info"
)

// ValidateOperation checks if the value is valid.
func ValidateOperation(value Operation) error {
	switch value {
	case OperationCreate:
	case OperationExtract:
	case OperationScan:
	case OperationVerify:
	case OperationInfo:
	default:
		return fmt.Errorf("invalid operation: %s", value)
	}
	return nil
}

// ============================================================================
// Data Structures
// ============================================================================

// ArchiveInfo metadata about an archive file.
// See: schemas/library/fulpack/v1.0.0/archive-info.schema.json
type ArchiveInfo struct {
	Format            string   `json:"format"`                       // Archive format from archive-formats taxonomy
	EntryCount        int64    `json:"entry_count"`                  // Total number of entries in the archive
	TotalSize         int64    `json:"total_size"`                   // Total uncompressed size in bytes
	CompressedSize    int64    `json:"compressed_size"`              // Compressed archive file size in bytes
	Compression       string   `json:"compression,omitempty"`        // Compression algorithm used
	CompressionRatio  *float64 `json:"compression_ratio,omitempty"`  // Compression ratio (total_size / compressed_size)
	HasChecksums      *bool    `json:"has_checksums,omitempty"`      // Whether the archive contains checksums
	ChecksumAlgorithm string   `json:"checksum_algorithm,omitempty"` // Checksum algorithm used (if has_checksums is true)
	Created           string   `json:"created,omitempty"`            // Archive creation timestamp (ISO 8601 format)
}

// ArchiveEntry metadata for a single archive entry (returned by scan operation).
// See: schemas/library/fulpack/v1.0.0/archive-entry.schema.json
type ArchiveEntry struct {
	Path           string  `json:"path"`                      // Normalized entry path within archive
	Type           string  `json:"type"`                      // Entry type from entry-types taxonomy
	Size           int64   `json:"size"`                      // Uncompressed size in bytes
	CompressedSize *int64  `json:"compressed_size,omitempty"` // Compressed size in bytes (if available)
	Modified       string  `json:"modified,omitempty"`        // Modification timestamp (ISO 8601 format)
	Checksum       *string `json:"checksum,omitempty"`        // SHA-256 checksum (64 hex characters)
	Mode           *string `json:"mode,omitempty"`            // Unix file permissions (octal string, e.g., '0644')
	SymlinkTarget  *string `json:"symlink_target,omitempty"`  // Target path if type is symlink, null otherwise
}

// ArchiveManifest complete archive table of contents (for large archives and caching).
// See: schemas/library/fulpack/v1.0.0/archive-manifest.schema.json
type ArchiveManifest struct {
	Format         string                  `json:"format"`                    // Archive format from archive-formats taxonomy
	Version        string                  `json:"version"`                   // Manifest schema version (semantic versioning)
	Generated      string                  `json:"generated"`                 // Manifest generation timestamp (ISO 8601 format)
	EntryCount     int64                   `json:"entry_count"`               // Total number of entries in manifest
	Entries        []interface{}           `json:"entries"`                   // Array of archive entries
	TotalSize      *int64                  `json:"total_size,omitempty"`      // Total uncompressed size in bytes
	CompressedSize *int64                  `json:"compressed_size,omitempty"` // Compressed archive file size in bytes
	Index          *map[string]interface{} `json:"index,omitempty"`           // Optional searchable index for fast lookups
}

// ValidationResult result of archive integrity verification (from verify operation).
// See: schemas/library/fulpack/v1.0.0/validation-result.schema.json
type ValidationResult struct {
	Valid             bool     `json:"valid"`                        // Whether the archive is valid and intact
	Errors            []string `json:"errors"`                       // Array of validation errors (empty if valid)
	Warnings          []string `json:"warnings"`                     // Array of non-critical warnings (e.g., missing checksums)
	EntryCount        int64    `json:"entry_count"`                  // Number of entries validated
	ChecksumsVerified *int64   `json:"checksums_verified,omitempty"` // Number of checksums successfully verified
	ChecksPerformed   []string `json:"checks_performed,omitempty"`   // List of security and integrity checks performed
}

// ExtractResult result of archive extraction operation.
// See: schemas/library/fulpack/v1.0.0/extract-result.schema.json
type ExtractResult struct {
	ExtractedCount    int64    `json:"extracted_count"`              // Number of entries successfully extracted
	SkippedCount      int64    `json:"skipped_count"`                // Number of entries skipped (e.g., already exists)
	ErrorCount        int64    `json:"error_count"`                  // Number of entries that failed to extract
	Errors            []string `json:"errors,omitempty"`             // Array of error messages for failed extractions
	Warnings          []string `json:"warnings,omitempty"`           // Array of warning messages (e.g., skipped files)
	ChecksumsVerified *int64   `json:"checksums_verified,omitempty"` // Number of checksums successfully verified during extraction
	TotalBytes        *int64   `json:"total_bytes,omitempty"`        // Total bytes extracted
}

// ============================================================================
// Options
// ============================================================================

// CreateOptions options for archive creation operation.
// See: schemas/library/fulpack/v1.0.0/create-options.schema.json
//
// All fields are optional.
type CreateOptions struct {
	CompressionLevel    *int64   `json:"compression_level,omitempty"`    // Compression level (1=fastest, 9=best compression, format-dependent)
	IncludePatterns     []string `json:"include_patterns,omitempty"`     // Glob patterns for files to include (e.g., ['**/*.py', '**/*.md'])
	ExcludePatterns     []string `json:"exclude_patterns,omitempty"`     // Glob patterns for files to exclude (e.g., ['**/__pycache__', '**/.git'])
	ChecksumAlgorithm   string   `json:"checksum_algorithm,omitempty"`   // Checksum algorithm for entry verification
	PreservePermissions *bool    `json:"preserve_permissions,omitempty"` // Preserve Unix file permissions in archive
	FollowSymlinks      *bool    `json:"follow_symlinks,omitempty"`      // Follow symbolic links and archive their targets
}

// ExtractOptions options for archive extraction operation.
// See: schemas/library/fulpack/v1.0.0/extract-options.schema.json
//
// All fields are optional.
type ExtractOptions struct {
	Overwrite           string   `json:"overwrite,omitempty"`            // How to handle existing files (error=fail, skip=keep existing, overwrite=replace)
	VerifyChecksums     *bool    `json:"verify_checksums,omitempty"`     // Verify checksums during extraction if available
	PreservePermissions *bool    `json:"preserve_permissions,omitempty"` // Preserve Unix file permissions from archive
	IncludePatterns     []string `json:"include_patterns,omitempty"`     // Glob patterns for entries to extract (e.g., ['**/*.csv'])
	MaxSize             *int64   `json:"max_size,omitempty"`             // Maximum total decompressed size in bytes (decompression bomb protection)
	MaxEntries          *int64   `json:"max_entries,omitempty"`          // Maximum number of entries to extract (decompression bomb protection)
}

// ScanOptions options for archive scanning operation (for pathfinder integration).
// See: schemas/library/fulpack/v1.0.0/scan-options.schema.json
//
// All fields are optional.
type ScanOptions struct {
	IncludeMetadata *bool    `json:"include_metadata,omitempty"` // Include metadata (size, checksum, modified timestamp) in results
	EntryTypes      []string `json:"entry_types,omitempty"`      // Filter entries by type (from entry-types taxonomy)
	MaxDepth        *int64   `json:"max_depth,omitempty"`        // Maximum depth for directory traversal (null = unlimited)
	MaxEntries      *int64   `json:"max_entries,omitempty"`      // Safety limit for maximum entries to return
}

// ============================================================================
// Module Metadata
// ============================================================================

// FulpackVersion is the module version for compatibility checks.
const FulpackVersion = "v1.0.0"
