//! Foundry module - Core constants and types
//!
//! This module contains generated types from Crucible's foundry catalogs:
//!
//! - Exit codes for CLI applications
//! - (Future) Fulpack types
//! - (Future) Fulencode types
//! - (Future) Fulhash types
//!
//! All types in this module are generated from YAML catalogs in the
//! Crucible SSOT repository.

pub mod exit_codes;
pub use exit_codes::ExitCode;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exit_code_values_are_correct() {
        assert_eq!(ExitCode::Success.code(), 0);
        assert_eq!(ExitCode::Failure.code(), 1);
        assert_eq!(ExitCode::PortInUse.code(), 10);
        assert_eq!(ExitCode::ConfigInvalid.code(), 20);
    }

    #[test]
    fn exit_code_display_is_meaningful() {
        let msg = format!("{}", ExitCode::Success);
        assert!(!msg.is_empty());
        assert!(msg.contains("Successful execution"));
    }

    #[test]
    fn exit_code_category() {
        assert_eq!(ExitCode::Success.category(), "standard");
        assert_eq!(ExitCode::PortInUse.category(), "networking");
    }

    #[test]
    fn exit_code_serialization() {
        let code = ExitCode::Success;
        let json = serde_json::to_string(&code).expect("should serialize");
        // It serializes to the enum variant name by default with serde, unless renamed.
        // My template uses #[derive(..., serde::Serialize, ...)] without rename.
        // So it should be "Success".
        assert_eq!(json, "\"Success\"");

        let deserialized: ExitCode = serde_json::from_str(&json).expect("should deserialize");
        assert_eq!(deserialized, ExitCode::Success);
    }
}
