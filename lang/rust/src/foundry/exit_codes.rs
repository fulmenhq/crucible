//! Standardized exit codes for Fulmen ecosystem.
//!
//! This file is AUTO-GENERATED from the Foundry exit codes catalog.
//! Source: config/library/foundry/exit-codes.yaml
//! Version: v1.0.0
//! Last Reviewed: 2025-10-31

/// Standardized exit codes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
#[non_exhaustive]
#[repr(i32)]
pub enum ExitCode {
    // Standard Exit Codes (0-1)
    // POSIX standard success and generic failure codes
    /// Successful execution
    ///
    /// Context: Command completed without errors
    Success = 0,
    /// Generic failure (unspecified error)
    ///
    /// Context: Use when no more specific exit code applies
    Failure = 1,

    // Networking & Port Management (10-19)
    // Network-related failures (ports, connectivity, etc.)
    /// Specified port is already in use
    ///
    /// Context: Server startup when port unavailable and fail_if_unavailable strategy
    PortInUse = 10,
    /// No available ports in configured range
    ///
    /// Context: Server startup when all ports in environment range occupied
    PortRangeExhausted = 11,
    /// Another instance already running on target port
    ///
    /// Context: Server startup when PID registry shows active process on port
    InstanceAlreadyRunning = 12,
    /// Network destination unreachable
    ///
    /// Context: Client connections, health checks, external service validation
    NetworkUnreachable = 13,
    /// Connection refused by remote host
    ///
    /// Context: Database connections, API endpoints, upstream services
    ConnectionRefused = 14,
    /// Connection attempt timed out
    ///
    /// Context: Slow networks, unresponsive services, firewall blocks
    ConnectionTimeout = 15,

    // Configuration & Validation (20-29)
    // Configuration errors, validation failures, version mismatches
    /// Configuration file failed validation
    ///
    /// Context: Startup validation, schema mismatches, invalid YAML/JSON
    ConfigInvalid = 20,
    /// Required dependency not found
    ///
    /// Context: Missing binaries, libraries, or runtime requirements
    MissingDependency = 21,
    /// SSOT (Crucible) version incompatible
    ///
    /// Context: Helper library detects unsupported Crucible version
    SsotVersionMismatch = 22,
    /// Required configuration file not found
    ///
    /// Context: Explicitly specified config path doesn't exist
    ConfigFileNotFound = 23,
    /// Invalid or unsupported environment specification
    ///
    /// Context: Unknown environment name, missing environment config
    EnvironmentInvalid = 24,

    // Runtime Errors (30-39)
    // Errors during normal operation (health checks, database, etc.)
    /// Health check endpoint returned non-healthy status
    ///
    /// Context: Startup health validation, readiness probes
    HealthCheckFailed = 30,
    /// Database connection failed or unavailable
    ///
    /// Context: Startup connection checks, critical query failures
    DatabaseUnavailable = 31,
    /// Required external service unavailable
    ///
    /// Context: API dependencies, message queues, cache servers
    ExternalServiceUnavailable = 32,
    /// System resources exhausted (memory, disk, file descriptors)
    ///
    /// Context: Out-of-memory, disk full, too many open files
    ResourceExhausted = 33,
    /// Operation exceeded timeout threshold
    ///
    /// Context: Long-running tasks, async operations, batch processing
    OperationTimeout = 34,

    // Command-Line Usage Errors (40-49)
    // Invalid arguments, missing required flags, usage errors
    /// Invalid command-line argument or flag value
    ///
    /// Context: Type errors, out-of-range values, malformed input
    InvalidArgument = 40,
    /// Required command-line argument not provided
    ///
    /// Context: Missing --config, --port, or other required flags
    MissingRequiredArgument = 41,
    /// Command-line usage error
    ///
    /// Context: BSD sysexits.h EX_USAGE - wrong number of arguments, bad syntax
    Usage = 64,

    // Permissions & File Access (50-59)
    // Permission denied, file not found, access errors
    /// Insufficient permissions for operation
    ///
    /// Context: File access, port binding (<1024), privileged operations
    PermissionDenied = 50,
    /// Required file not found
    ///
    /// Context: Assets, templates, data files (not config - use 23)
    FileNotFound = 51,
    /// Required directory not found
    ///
    /// Context: State directories, log paths, data directories
    DirectoryNotFound = 52,
    /// Error reading file
    ///
    /// Context: Corrupt files, I/O errors, encoding issues
    FileReadError = 53,
    /// Error writing file
    ///
    /// Context: Disk full, read-only filesystem, permission errors
    FileWriteError = 54,

    // Data & Processing Errors (60-69)
    // Data validation, parsing, transformation failures
    /// Input data failed validation
    ///
    /// Context: Schema validation, business rule violations
    DataInvalid = 60,
    /// Error parsing input data
    ///
    /// Context: Malformed JSON/YAML/XML, syntax errors
    ParseError = 61,
    /// Data transformation or conversion failed
    ///
    /// Context: Type conversions, format transformations, encoding changes
    TransformationFailed = 62,
    /// Data corruption detected
    ///
    /// Context: Checksum failures, integrity violations
    DataCorrupt = 63,

    // Security & Authentication (70-79)
    // Authentication failures, authorization errors, security violations
    /// Authentication failed
    ///
    /// Context: Invalid credentials, expired tokens, auth service unavailable
    AuthenticationFailed = 70,
    /// Authorization failed (authenticated but insufficient permissions)
    ///
    /// Context: RBAC failures, scope violations, resource access denied
    AuthorizationFailed = 71,
    /// Security policy violation detected
    ///
    /// Context: Suspicious activity, rate limit exceeded, IP blocklist
    SecurityViolation = 72,
    /// TLS/SSL certificate validation failed
    ///
    /// Context: Expired certs, untrusted CAs, hostname mismatches
    CertificateInvalid = 73,

    // Observability & Monitoring (80-89)
    // Observability infrastructure failures. Use when observability is CRITICAL to operation (e.g., monitoring agents, telemetry exporters). For workhorses where observability is auxiliary: - Log warning and continue (don't exit) - Emit degraded health status - Only exit if explicitly configured (fail_on_observability_error: true)
    /// Metrics endpoint or collection system unavailable
    ///
    /// Context: Use for observability-focused tools (Prometheus exporters, StatsD agents). Workhorses SHOULD log warning and continue unless configured to fail-fast.
    MetricsUnavailable = 80,
    /// Distributed tracing system unavailable
    ///
    /// Context: OTLP exporter failed, Jaeger collector unreachable
    TracingFailed = 81,
    /// Logging system unavailable or misconfigured
    ///
    /// Context: Log aggregator unreachable, log file unwritable
    LoggingFailed = 82,
    /// Alerting system unavailable
    ///
    /// Context: PagerDuty API failed, Slack webhook unreachable
    AlertSystemFailed = 83,
    /// Structured logging system unavailable
    ///
    /// Context: JSON log aggregator unreachable, log schema validation failed
    StructuredLoggingFailed = 84,

    // Testing & Validation (91-99)
    // Test execution outcomes and validation failures. NOTE: Test harnesses MUST use EXIT_SUCCESS (0) for successful test runs per ecosystem conventions (pytest, Go testing, Jest all use 0 for success). Codes in this category are for FAILURES and exceptional conditions only.
    /// One or more tests failed
    ///
    /// Context: Test assertions failed, expected behavior not met. Maps to pytest exit code 1, Go test failure, Jest failure.
    TestFailure = 91,
    /// Test execution error (not test failure)
    ///
    /// Context: Test setup failed, fixture unavailable, test harness error. Maps to pytest exit code 3 (internal error).
    TestError = 92,
    /// Test run interrupted by user or system
    ///
    /// Context: Ctrl+C during tests, system signal, user cancellation. Maps to pytest exit code 2.
    TestInterrupted = 93,
    /// Test command usage error
    ///
    /// Context: Invalid test arguments, bad configuration. Maps to pytest exit code 4.
    TestUsageError = 94,
    /// No tests found or all tests skipped
    ///
    /// Context: Empty test suite, all tests deselected or skipped. Maps to pytest exit code 5.
    TestNoTestsCollected = 95,
    /// Test coverage below required threshold
    ///
    /// Context: Code coverage validation, quality gate failure
    CoverageThresholdNotMet = 96,

    // Signal-Induced Exits (128-165)
    // Process terminated by Unix signals (128+N pattern per POSIX). Signal codes follow Linux numbering; macOS/FreeBSD differ for SIGUSR1/SIGUSR2. For full signal semantics, see config/library/foundry/signals.yaml. For signal handling patterns, see docs/standards/library/modules/signal-handling.md.
    /// Hangup signal (SIGHUP) - config reload via restart
    ///
    /// Context: Config reload via restart-based pattern (mandatory schema validation). Process exits with 129, supervisor restarts with new config. See signals.yaml for reload behavior definition.
    SignalHup = 129,
    /// Interrupt signal (SIGINT) - user interrupt with Ctrl+C double-tap
    ///
    /// Context: Ctrl+C pressed. First tap initiates graceful shutdown, second within 2s forces immediate exit. Same exit code (130) for both graceful and force modes. See signals.yaml for double-tap behavior definition.
    SignalInt = 130,
    /// Quit signal (SIGQUIT) - immediate exit
    ///
    /// Context: Ctrl+\ on Unix, Ctrl+Break on Windows. Immediate termination without cleanup. Use for emergency shutdown or debugging (core dumps).
    SignalQuit = 131,
    /// Kill signal (SIGKILL)
    ///
    /// Context: Forceful termination, non-graceful shutdown (not catchable)
    SignalKill = 137,
    /// Broken pipe (SIGPIPE) - observe only
    ///
    /// Context: Writing to closed pipe/socket. Fulmen default is observe_only (log + graceful exit). Applications may override to ignore for network services. See signals.yaml for SIGPIPE handling guidance.
    SignalPipe = 141,
    /// Alarm signal (SIGALRM) - watchdog timeout
    ///
    /// Context: Watchdog timer expired. Treat as timeout-induced exit. Watchdog pattern out of scope for v1.0.0 module implementations.
    SignalAlrm = 142,
    /// Termination signal (SIGTERM) - graceful shutdown
    ///
    /// Context: Graceful shutdown requested by container orchestrator or process supervisor. Standard 30-second timeout for cleanup. Applications run cleanup handlers before exit. See signals.yaml for graceful shutdown behavior definition.
    SignalTerm = 143,
    /// User-defined signal 1 (SIGUSR1) - custom handler
    ///
    /// Context: Application-specific signal (e.g., reopen logs, dump stats, trigger profiling). Applications register custom handlers. Exit code 138 on Linux (128+10). Platform differences: macOS/FreeBSD use signal 30 (exit 158), not 10.
    SignalUsr1 = 138,
    /// User-defined signal 2 (SIGUSR2) - custom handler
    ///
    /// Context: Application-specific signal (e.g., toggle debug mode, rotate credentials). Applications register custom handlers. Exit code 140 on Linux (128+12). Platform differences: macOS/FreeBSD use signal 31 (exit 159), not 12.
    SignalUsr2 = 140,
}

impl ExitCode {
    /// Returns the numeric exit code value.
    #[must_use]
    pub const fn code(self) -> i32 {
        self as i32
    }

    /// Returns the category ID for this exit code.
    #[must_use]
    pub const fn category(&self) -> &'static str {
        match self {
            Self::Success => "standard",
            Self::Failure => "standard",
            Self::PortInUse => "networking",
            Self::PortRangeExhausted => "networking",
            Self::InstanceAlreadyRunning => "networking",
            Self::NetworkUnreachable => "networking",
            Self::ConnectionRefused => "networking",
            Self::ConnectionTimeout => "networking",
            Self::ConfigInvalid => "configuration",
            Self::MissingDependency => "configuration",
            Self::SsotVersionMismatch => "configuration",
            Self::ConfigFileNotFound => "configuration",
            Self::EnvironmentInvalid => "configuration",
            Self::HealthCheckFailed => "runtime",
            Self::DatabaseUnavailable => "runtime",
            Self::ExternalServiceUnavailable => "runtime",
            Self::ResourceExhausted => "runtime",
            Self::OperationTimeout => "runtime",
            Self::InvalidArgument => "usage",
            Self::MissingRequiredArgument => "usage",
            Self::Usage => "usage",
            Self::PermissionDenied => "permissions",
            Self::FileNotFound => "permissions",
            Self::DirectoryNotFound => "permissions",
            Self::FileReadError => "permissions",
            Self::FileWriteError => "permissions",
            Self::DataInvalid => "data",
            Self::ParseError => "data",
            Self::TransformationFailed => "data",
            Self::DataCorrupt => "data",
            Self::AuthenticationFailed => "security",
            Self::AuthorizationFailed => "security",
            Self::SecurityViolation => "security",
            Self::CertificateInvalid => "security",
            Self::MetricsUnavailable => "observability",
            Self::TracingFailed => "observability",
            Self::LoggingFailed => "observability",
            Self::AlertSystemFailed => "observability",
            Self::StructuredLoggingFailed => "observability",
            Self::TestFailure => "testing",
            Self::TestError => "testing",
            Self::TestInterrupted => "testing",
            Self::TestUsageError => "testing",
            Self::TestNoTestsCollected => "testing",
            Self::CoverageThresholdNotMet => "testing",
            Self::SignalHup => "signals",
            Self::SignalInt => "signals",
            Self::SignalQuit => "signals",
            Self::SignalKill => "signals",
            Self::SignalPipe => "signals",
            Self::SignalAlrm => "signals",
            Self::SignalTerm => "signals",
            Self::SignalUsr1 => "signals",
            Self::SignalUsr2 => "signals",
        }
    }
}

impl std::fmt::Display for ExitCode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Success => write!(f, "Successful execution"),
            Self::Failure => write!(f, "Generic failure (unspecified error)"),
            Self::PortInUse => write!(f, "Specified port is already in use"),
            Self::PortRangeExhausted => write!(f, "No available ports in configured range"),
            Self::InstanceAlreadyRunning => {
                write!(f, "Another instance already running on target port")
            }
            Self::NetworkUnreachable => write!(f, "Network destination unreachable"),
            Self::ConnectionRefused => write!(f, "Connection refused by remote host"),
            Self::ConnectionTimeout => write!(f, "Connection attempt timed out"),
            Self::ConfigInvalid => write!(f, "Configuration file failed validation"),
            Self::MissingDependency => write!(f, "Required dependency not found"),
            Self::SsotVersionMismatch => write!(f, "SSOT (Crucible) version incompatible"),
            Self::ConfigFileNotFound => write!(f, "Required configuration file not found"),
            Self::EnvironmentInvalid => {
                write!(f, "Invalid or unsupported environment specification")
            }
            Self::HealthCheckFailed => {
                write!(f, "Health check endpoint returned non-healthy status")
            }
            Self::DatabaseUnavailable => write!(f, "Database connection failed or unavailable"),
            Self::ExternalServiceUnavailable => write!(f, "Required external service unavailable"),
            Self::ResourceExhausted => write!(
                f,
                "System resources exhausted (memory, disk, file descriptors)"
            ),
            Self::OperationTimeout => write!(f, "Operation exceeded timeout threshold"),
            Self::InvalidArgument => write!(f, "Invalid command-line argument or flag value"),
            Self::MissingRequiredArgument => {
                write!(f, "Required command-line argument not provided")
            }
            Self::Usage => write!(f, "Command-line usage error"),
            Self::PermissionDenied => write!(f, "Insufficient permissions for operation"),
            Self::FileNotFound => write!(f, "Required file not found"),
            Self::DirectoryNotFound => write!(f, "Required directory not found"),
            Self::FileReadError => write!(f, "Error reading file"),
            Self::FileWriteError => write!(f, "Error writing file"),
            Self::DataInvalid => write!(f, "Input data failed validation"),
            Self::ParseError => write!(f, "Error parsing input data"),
            Self::TransformationFailed => write!(f, "Data transformation or conversion failed"),
            Self::DataCorrupt => write!(f, "Data corruption detected"),
            Self::AuthenticationFailed => write!(f, "Authentication failed"),
            Self::AuthorizationFailed => write!(
                f,
                "Authorization failed (authenticated but insufficient permissions)"
            ),
            Self::SecurityViolation => write!(f, "Security policy violation detected"),
            Self::CertificateInvalid => write!(f, "TLS/SSL certificate validation failed"),
            Self::MetricsUnavailable => {
                write!(f, "Metrics endpoint or collection system unavailable")
            }
            Self::TracingFailed => write!(f, "Distributed tracing system unavailable"),
            Self::LoggingFailed => write!(f, "Logging system unavailable or misconfigured"),
            Self::AlertSystemFailed => write!(f, "Alerting system unavailable"),
            Self::StructuredLoggingFailed => write!(f, "Structured logging system unavailable"),
            Self::TestFailure => write!(f, "One or more tests failed"),
            Self::TestError => write!(f, "Test execution error (not test failure)"),
            Self::TestInterrupted => write!(f, "Test run interrupted by user or system"),
            Self::TestUsageError => write!(f, "Test command usage error"),
            Self::TestNoTestsCollected => write!(f, "No tests found or all tests skipped"),
            Self::CoverageThresholdNotMet => write!(f, "Test coverage below required threshold"),
            Self::SignalHup => write!(f, "Hangup signal (SIGHUP) - config reload via restart"),
            Self::SignalInt => write!(
                f,
                "Interrupt signal (SIGINT) - user interrupt with Ctrl+C double-tap"
            ),
            Self::SignalQuit => write!(f, "Quit signal (SIGQUIT) - immediate exit"),
            Self::SignalKill => write!(f, "Kill signal (SIGKILL)"),
            Self::SignalPipe => write!(f, "Broken pipe (SIGPIPE) - observe only"),
            Self::SignalAlrm => write!(f, "Alarm signal (SIGALRM) - watchdog timeout"),
            Self::SignalTerm => write!(f, "Termination signal (SIGTERM) - graceful shutdown"),
            Self::SignalUsr1 => write!(f, "User-defined signal 1 (SIGUSR1) - custom handler"),
            Self::SignalUsr2 => write!(f, "User-defined signal 2 (SIGUSR2) - custom handler"),
        }
    }
}

impl std::error::Error for ExitCode {}
