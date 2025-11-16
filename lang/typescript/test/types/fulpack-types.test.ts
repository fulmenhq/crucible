import { describe, expect, it } from "vitest";
import {
  ArchiveFormat,
  type CreateOptions,
  EntryType,
  type ExtractOptions,
  type ExtractResult,
  type FulpackError,
  Operation,
  type ValidateOptions,
  type ValidationResult,
} from "../../src/fulpack/types";

describe("Fulpack Type Definitions", () => {
  describe("ValidationResult", () => {
    it("should accept complete ValidationResult structure", () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: ["Missing checksum for entry 3"],
        entry_count: 10,
        checksums_verified: 9,
        checks_performed: [
          "structure_valid",
          "checksums_verified",
          "no_path_traversal",
          "no_decompression_bomb",
          "symlinks_safe",
        ],
      };

      expect(result.valid).toBe(true);
      expect(result.checks_performed).toHaveLength(5);
    });

    it("should accept partial checks_performed array", () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
        entry_count: 5,
        checks_performed: ["structure_valid", "no_path_traversal"],
      };

      expect(result.checks_performed).toContain("structure_valid");
    });

    it("should accept empty checks_performed array", () => {
      const result: ValidationResult = {
        valid: false,
        errors: [
          {
            code: "INVALID_ARCHIVE",
            message: "Not a valid tar.gz file",
            operation: Operation.VALIDATE,
          },
        ],
        warnings: [],
        entry_count: 0,
        checks_performed: [],
      };

      expect(result.checks_performed).toEqual([]);
    });

    it("should allow omitting optional fields", () => {
      const minimal: ValidationResult = {
        valid: false,
        errors: [
          {
            code: "PATH_TRAVERSAL",
            message: "Entry contains path traversal",
            operation: Operation.VALIDATE,
            path: "../../../etc/passwd",
          },
        ],
        warnings: [],
        entry_count: 1,
      };

      expect(minimal.valid).toBe(false);
      expect(minimal.checks_performed).toBeUndefined();
    });

    it("should accept FulpackError array for errors field", () => {
      const result: ValidationResult = {
        valid: false,
        errors: [
          {
            code: "PATH_TRAVERSAL",
            message: "Detected path traversal attempt",
            operation: Operation.VALIDATE,
            path: "../../../etc/passwd",
          },
          {
            code: "SYMLINK_ESCAPE",
            message: "Symlink points outside archive",
            operation: Operation.VALIDATE,
            path: "malicious-link",
            archive: "pathological.tar.gz",
          },
        ],
        warnings: [],
        entry_count: 2,
        checks_performed: ["structure_valid", "no_path_traversal"],
      };

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]?.code).toBe("PATH_TRAVERSAL");
    });
  });

  describe("ExtractResult", () => {
    it("should accept complete ExtractResult structure", () => {
      const result: ExtractResult = {
        extracted_count: 10,
        skipped_count: 2,
        error_count: 0,
        errors: [],
        warnings: ["Skipped 2 files that already exist"],
        checksums_verified: 10,
        total_bytes: 1024000,
      };

      expect(result.extracted_count).toBe(10);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept FulpackError array for errors field", () => {
      const result: ExtractResult = {
        extracted_count: 8,
        skipped_count: 0,
        error_count: 2,
        errors: [
          {
            code: "PERMISSION_DENIED",
            message: "Cannot write to /etc/protected",
            operation: Operation.EXTRACT,
            path: "protected/config.yaml",
          },
          {
            code: "DISK_FULL",
            message: "No space left on device",
            operation: Operation.EXTRACT,
            archive: "large-dataset.tar.gz",
          },
        ],
        warnings: [],
      };

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]?.code).toBe("PERMISSION_DENIED");
    });
  });

  describe("Enums", () => {
    it("should accept all ArchiveFormat enum values", () => {
      const formats: ArchiveFormat[] = [
        ArchiveFormat.TAR,
        ArchiveFormat.TAR_GZ,
        ArchiveFormat.TAR_BZ2,
        ArchiveFormat.ZIP,
        ArchiveFormat.GZIP,
      ];

      expect(formats).toHaveLength(5);
    });

    it("should accept all EntryType enum values", () => {
      const types: EntryType[] = [EntryType.FILE, EntryType.DIRECTORY, EntryType.SYMLINK];

      expect(types).toHaveLength(3);
    });

    it("should accept all Operation enum values", () => {
      const ops: Operation[] = [
        Operation.CREATE,
        Operation.EXTRACT,
        Operation.SCAN,
        Operation.VERIFY,
        Operation.INFO,
        Operation.VALIDATE,
      ];

      expect(ops).toHaveLength(6);
    });
  });

  describe("Options Interfaces", () => {
    it("should accept complete CreateOptions", () => {
      const opts: CreateOptions = {
        format: ArchiveFormat.TAR_GZ,
        compression_level: 6,
        base_dir: "/source",
        include_patterns: ["**/*.ts", "**/*.json"],
        exclude_patterns: ["**/node_modules/**", "**/*.test.ts"],
        follow_symlinks: false,
        preserve_permissions: true,
        calculate_checksums: true,
      };

      expect(opts.format).toBe(ArchiveFormat.TAR_GZ);
    });

    it("should accept minimal CreateOptions", () => {
      const opts: CreateOptions = {};
      expect(opts).toBeDefined();
    });

    it("should accept complete ValidateOptions", () => {
      const opts: ValidateOptions = {
        verify_checksums: true,
        check_path_traversal: true,
        max_decompressed_size: 10000000,
        max_entries: 1000,
        allowed_entry_types: [EntryType.FILE, EntryType.DIRECTORY],
      };

      expect(opts.verify_checksums).toBe(true);
      expect(opts.allowed_entry_types).toHaveLength(2);
    });

    it("should accept complete ExtractOptions", () => {
      const opts: ExtractOptions = {
        output_dir: "/output",
        overwrite: false,
        preserve_permissions: true,
        verify_checksums: true,
        include_patterns: ["docs/**"],
        exclude_patterns: ["**/test/**"],
      };

      expect(opts.output_dir).toBe("/output");
      expect(opts.overwrite).toBe(false);
    });
  });

  describe("FulpackError Interface", () => {
    it("should accept complete FulpackError structure", () => {
      const error: FulpackError = {
        code: "PATH_TRAVERSAL",
        message: "Detected path traversal in entry",
        operation: Operation.VALIDATE,
        path: "../../../etc/passwd",
        archive: "malicious.tar.gz",
        source: "validation",
        details: {
          entry_index: 5,
          attempted_path: "/etc/passwd",
        },
      };

      expect(error.code).toBe("PATH_TRAVERSAL");
      expect(error.operation).toBe(Operation.VALIDATE);
    });

    it("should accept minimal FulpackError structure", () => {
      const error: FulpackError = {
        code: "UNKNOWN_ERROR",
        message: "An unknown error occurred",
        operation: Operation.CREATE,
      };

      expect(error.code).toBe("UNKNOWN_ERROR");
      expect(error.path).toBeUndefined();
    });

    it("should accept FulpackError with compression details", () => {
      const error: FulpackError = {
        code: "DECOMPRESSION_BOMB",
        message: "Archive exceeds decompression size limit",
        operation: Operation.VALIDATE,
        archive: "bomb.tar.gz",
        details: {
          compression_ratio: 1000,
          compressed_size: 1024,
          decompressed_size: 1024000,
        },
      };

      expect(error.details?.compression_ratio).toBe(1000);
    });
  });

  describe("Type Safety Regression Tests", () => {
    it("should correctly type checks_performed as array of all check types", () => {
      // This test specifically validates the array-of-union bugfix
      // Before fix: type was "a" | "b" | "c"[] (only last member is array)
      // After fix: type is ("a" | "b" | "c")[] (entire union is array)

      const allChecks: ValidationResult["checks_performed"] = [
        "structure_valid",
        "checksums_verified",
        "no_path_traversal",
        "no_decompression_bomb",
        "symlinks_safe",
      ];

      expect(allChecks).toHaveLength(5);

      // Each individual check type should be assignable to array element
      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
        entry_count: 1,
        checks_performed: ["structure_valid"], // Should NOT require "as any"
      };

      expect(result.checks_performed?.[0]).toBe("structure_valid");
    });

    it("should allow any subset of check types in array", () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
        entry_count: 5,
        checks_performed: ["checksums_verified", "symlinks_safe"],
      };

      expect(result.checks_performed).toContain("checksums_verified");
      expect(result.checks_performed).toContain("symlinks_safe");
    });

    it("should correctly type allowed_entry_types as array of entry types", () => {
      // Similar regression test for ValidateOptions.allowed_entry_types
      const opts: ValidateOptions = {
        allowed_entry_types: [EntryType.FILE, EntryType.DIRECTORY],
      };

      expect(opts.allowed_entry_types).toHaveLength(2);
    });
  });
});
