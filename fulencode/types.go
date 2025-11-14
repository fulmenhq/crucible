// Package fulencode provides type definitions for fulencode operations.
//
// This file is AUTO-GENERATED from the Fulencode module specification.
// DO NOT EDIT MANUALLY - changes will be overwritten.
//
// Schema Version: v1.0.0
// Last Reviewed: 2025-11-13
// Source: schemas/taxonomy/library/fulencode/
//
// See: https://github.com/fulmenhq/crucible/blob/main/docs/standards/library/modules/fulencode.md
package fulencode

import (
	"fmt"
)

// ============================================================================
// Enums (Typed String Constants)
// ============================================================================

// EncodingFormat represents encodingformat enum.
// See: schemas/taxonomy/library/fulencode/encoding-families/v1.0.0/families.yaml
type EncodingFormat string

const (
	EncodingFormatBase64    EncodingFormat = "base64"
	EncodingFormatBase64url EncodingFormat = "base64url"
	EncodingFormatBase64Raw EncodingFormat = "base64_raw"
	EncodingFormatBase32    EncodingFormat = "base32"
	EncodingFormatBase32hex EncodingFormat = "base32hex"
	EncodingFormatHex       EncodingFormat = "hex"
	EncodingFormatUtf8      EncodingFormat = "utf-8"
	EncodingFormatUtf16le   EncodingFormat = "utf-16le"
	EncodingFormatUtf16be   EncodingFormat = "utf-16be"
	EncodingFormatIso88591  EncodingFormat = "iso-8859-1"
	EncodingFormatCp1252    EncodingFormat = "cp1252"
	EncodingFormatAscii     EncodingFormat = "ascii"
)

// ValidateEncodingFormat checks if the value is valid.
func ValidateEncodingFormat(value EncodingFormat) error {
	switch value {
	case EncodingFormatBase64:
	case EncodingFormatBase64url:
	case EncodingFormatBase64Raw:
	case EncodingFormatBase32:
	case EncodingFormatBase32hex:
	case EncodingFormatHex:
	case EncodingFormatUtf8:
	case EncodingFormatUtf16le:
	case EncodingFormatUtf16be:
	case EncodingFormatIso88591:
	case EncodingFormatCp1252:
	case EncodingFormatAscii:
	default:
		return fmt.Errorf("invalid encodingformat: %s", value)
	}
	return nil
}

// NormalizationProfile represents normalizationprofile enum.
// See: schemas/taxonomy/library/fulencode/normalization-profiles/v1.0.0/profiles.yaml
type NormalizationProfile string

const (
	NormalizationProfileNfc              NormalizationProfile = "nfc"
	NormalizationProfileNfd              NormalizationProfile = "nfd"
	NormalizationProfileNfkc             NormalizationProfile = "nfkc"
	NormalizationProfileNfkd             NormalizationProfile = "nfkd"
	NormalizationProfileSafeIdentifiers  NormalizationProfile = "safe_identifiers"
	NormalizationProfileSearchOptimized  NormalizationProfile = "search_optimized"
	NormalizationProfileFilenameSafe     NormalizationProfile = "filename_safe"
	NormalizationProfileLegacyCompatible NormalizationProfile = "legacy_compatible"
)

// ValidateNormalizationProfile checks if the value is valid.
func ValidateNormalizationProfile(value NormalizationProfile) error {
	switch value {
	case NormalizationProfileNfc:
	case NormalizationProfileNfd:
	case NormalizationProfileNfkc:
	case NormalizationProfileNfkd:
	case NormalizationProfileSafeIdentifiers:
	case NormalizationProfileSearchOptimized:
	case NormalizationProfileFilenameSafe:
	case NormalizationProfileLegacyCompatible:
	default:
		return fmt.Errorf("invalid normalizationprofile: %s", value)
	}
	return nil
}

// ConfidenceLevel represents confidencelevel enum.
// See: schemas/taxonomy/library/fulencode/detection-confidence/v1.0.0/levels.yaml
type ConfidenceLevel string

const (
	ConfidenceLevelHigh   ConfidenceLevel = "high"
	ConfidenceLevelMedium ConfidenceLevel = "medium"
	ConfidenceLevelLow    ConfidenceLevel = "low"
)

// ValidateConfidenceLevel checks if the value is valid.
func ValidateConfidenceLevel(value ConfidenceLevel) error {
	switch value {
	case ConfidenceLevelHigh:
	case ConfidenceLevelMedium:
	case ConfidenceLevelLow:
	default:
		return fmt.Errorf("invalid confidencelevel: %s", value)
	}
	return nil
}

// ============================================================================
// Module Metadata
// ============================================================================

// FulencodeVersion is the module version for compatibility checks.
const FulencodeVersion = "v1.0.0"
