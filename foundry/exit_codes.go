// Package foundry provides standardized exit codes for Fulmen ecosystem tools and libraries.
//
// This file is AUTO-GENERATED from the Foundry exit codes catalog.
// DO NOT EDIT MANUALLY - changes will be overwritten.
//
// Catalog Version: v1.0.0
// Last Reviewed: 2025-10-31
// Source: config/library/foundry/exit-codes.yaml
//
// See: https://github.com/fulmenhq/crucible/blob/main/docs/standards/library/foundry/README.md#exit-codes
package foundry

// Exit code constants
const (
	// Standard Exit Codes (0-1)
	// POSIX standard success and generic failure codes
	ExitSuccess = 0
	ExitFailure = 1

	// Networking & Port Management (10-19)
	// Network-related failures (ports, connectivity, etc.)
	ExitPortInUse              = 10
	ExitPortRangeExhausted     = 11
	ExitInstanceAlreadyRunning = 12
	ExitNetworkUnreachable     = 13
	ExitConnectionRefused      = 14
	ExitConnectionTimeout      = 15

	// Configuration & Validation (20-29)
	// Configuration errors, validation failures, version mismatches
	ExitConfigInvalid       = 20
	ExitMissingDependency   = 21
	ExitSsotVersionMismatch = 22
	ExitConfigFileNotFound  = 23
	ExitEnvironmentInvalid  = 24

	// Runtime Errors (30-39)
	// Errors during normal operation (health checks, database, etc.)
	ExitHealthCheckFailed          = 30
	ExitDatabaseUnavailable        = 31
	ExitExternalServiceUnavailable = 32
	ExitResourceExhausted          = 33
	ExitOperationTimeout           = 34

	// Command-Line Usage Errors (40-49)
	// Invalid arguments, missing required flags, usage errors
	ExitInvalidArgument         = 40
	ExitMissingRequiredArgument = 41
	ExitUsage                   = 64

	// Permissions & File Access (50-59)
	// Permission denied, file not found, access errors
	ExitPermissionDenied  = 50
	ExitFileNotFound      = 51
	ExitDirectoryNotFound = 52
	ExitFileReadError     = 53
	ExitFileWriteError    = 54

	// Data & Processing Errors (60-69)
	// Data validation, parsing, transformation failures
	ExitDataInvalid          = 60
	ExitParseError           = 61
	ExitTransformationFailed = 62
	ExitDataCorrupt          = 63

	// Security & Authentication (70-79)
	// Authentication failures, authorization errors, security violations
	ExitAuthenticationFailed = 70
	ExitAuthorizationFailed  = 71
	ExitSecurityViolation    = 72
	ExitCertificateInvalid   = 73

	// Observability & Monitoring (80-89)
	// Observability infrastructure failures. Use when observability is CRITICAL to operation (e.g., monitoring agents, telemetry exporters). For workhorses where observability is auxiliary: - Log warning and continue (don't exit) - Emit degraded health status - Only exit if explicitly configured (fail_on_observability_error: true)
	ExitMetricsUnavailable      = 80
	ExitTracingFailed           = 81
	ExitLoggingFailed           = 82
	ExitAlertSystemFailed       = 83
	ExitStructuredLoggingFailed = 84

	// Testing & Validation (91-99)
	// Test execution outcomes and validation failures. NOTE: Test harnesses MUST use EXIT_SUCCESS (0) for successful test runs per ecosystem conventions (pytest, Go testing, Jest all use 0 for success). Codes in this category are for FAILURES and exceptional conditions only.
	ExitTestFailure             = 91
	ExitTestError               = 92
	ExitTestInterrupted         = 93
	ExitTestUsageError          = 94
	ExitTestNoTestsCollected    = 95
	ExitCoverageThresholdNotMet = 96

	// Signal-Induced Exits (128-165)
	// Process terminated by Unix signals (128+N pattern)
	ExitSignalHup  = 129
	ExitSignalInt  = 130
	ExitSignalQuit = 131
	ExitSignalKill = 137
	ExitSignalPipe = 141
	ExitSignalAlrm = 142
	ExitSignalTerm = 143
	ExitSignalUsr1 = 159
	ExitSignalUsr2 = 160
)

// ExitCodeInfo contains metadata about an exit code
type ExitCodeInfo struct {
	Code          int
	Name          string
	Description   string
	Context       string
	Category      string
	RetryHint     string // "retry", "no_retry", "investigate", or empty
	BSDEquivalent string // BSD sysexits.h equivalent, or empty
	PythonNote    string // Python-specific compatibility guidance, or empty
}

// exitCodeMetadata maps exit codes to their metadata
var exitCodeMetadata = map[int]ExitCodeInfo{
	0: {
		Code:        0,
		Name:        "EXIT_SUCCESS",
		Description: "Successful execution",
		Context:     "Command completed without errors",
		Category:    "standard",
	},
	1: {
		Code:        1,
		Name:        "EXIT_FAILURE",
		Description: "Generic failure (unspecified error)",
		Context:     "Use when no more specific exit code applies",
		Category:    "standard",
	},
	10: {
		Code:        10,
		Name:        "EXIT_PORT_IN_USE",
		Description: "Specified port is already in use",
		Context:     "Server startup when port unavailable and fail_if_unavailable strategy",
		Category:    "networking",
	},
	11: {
		Code:        11,
		Name:        "EXIT_PORT_RANGE_EXHAUSTED",
		Description: "No available ports in configured range",
		Context:     "Server startup when all ports in environment range occupied",
		Category:    "networking",
	},
	12: {
		Code:        12,
		Name:        "EXIT_INSTANCE_ALREADY_RUNNING",
		Description: "Another instance already running on target port",
		Context:     "Server startup when PID registry shows active process on port",
		Category:    "networking",
	},
	13: {
		Code:        13,
		Name:        "EXIT_NETWORK_UNREACHABLE",
		Description: "Network destination unreachable",
		Context:     "Client connections, health checks, external service validation",
		Category:    "networking",
	},
	14: {
		Code:        14,
		Name:        "EXIT_CONNECTION_REFUSED",
		Description: "Connection refused by remote host",
		Context:     "Database connections, API endpoints, upstream services",
		Category:    "networking",
	},
	15: {
		Code:        15,
		Name:        "EXIT_CONNECTION_TIMEOUT",
		Description: "Connection attempt timed out",
		Context:     "Slow networks, unresponsive services, firewall blocks",
		Category:    "networking",
	},
	20: {
		Code:        20,
		Name:        "EXIT_CONFIG_INVALID",
		Description: "Configuration file failed validation",
		Context:     "Startup validation, schema mismatches, invalid YAML/JSON",
		Category:    "configuration",
		RetryHint:   "no_retry",
	},
	21: {
		Code:        21,
		Name:        "EXIT_MISSING_DEPENDENCY",
		Description: "Required dependency not found",
		Context:     "Missing binaries, libraries, or runtime requirements",
		Category:    "configuration",
		RetryHint:   "investigate",
	},
	22: {
		Code:        22,
		Name:        "EXIT_SSOT_VERSION_MISMATCH",
		Description: "SSOT (Crucible) version incompatible",
		Context:     "Helper library detects unsupported Crucible version",
		Category:    "configuration",
		RetryHint:   "no_retry",
	},
	23: {
		Code:        23,
		Name:        "EXIT_CONFIG_FILE_NOT_FOUND",
		Description: "Required configuration file not found",
		Context:     "Explicitly specified config path doesn't exist",
		Category:    "configuration",
	},
	24: {
		Code:        24,
		Name:        "EXIT_ENVIRONMENT_INVALID",
		Description: "Invalid or unsupported environment specification",
		Context:     "Unknown environment name, missing environment config",
		Category:    "configuration",
	},
	30: {
		Code:        30,
		Name:        "EXIT_HEALTH_CHECK_FAILED",
		Description: "Health check endpoint returned non-healthy status",
		Context:     "Startup health validation, readiness probes",
		Category:    "runtime",
		RetryHint:   "retry",
	},
	31: {
		Code:        31,
		Name:        "EXIT_DATABASE_UNAVAILABLE",
		Description: "Database connection failed or unavailable",
		Context:     "Startup connection checks, critical query failures",
		Category:    "runtime",
		RetryHint:   "retry",
	},
	32: {
		Code:        32,
		Name:        "EXIT_EXTERNAL_SERVICE_UNAVAILABLE",
		Description: "Required external service unavailable",
		Context:     "API dependencies, message queues, cache servers",
		Category:    "runtime",
	},
	33: {
		Code:        33,
		Name:        "EXIT_RESOURCE_EXHAUSTED",
		Description: "System resources exhausted (memory, disk, file descriptors)",
		Context:     "Out-of-memory, disk full, too many open files",
		Category:    "runtime",
		RetryHint:   "investigate",
	},
	34: {
		Code:        34,
		Name:        "EXIT_OPERATION_TIMEOUT",
		Description: "Operation exceeded timeout threshold",
		Context:     "Long-running tasks, async operations, batch processing",
		Category:    "runtime",
		RetryHint:   "retry",
	},
	40: {
		Code:        40,
		Name:        "EXIT_INVALID_ARGUMENT",
		Description: "Invalid command-line argument or flag value",
		Context:     "Type errors, out-of-range values, malformed input",
		Category:    "usage",
	},
	41: {
		Code:        41,
		Name:        "EXIT_MISSING_REQUIRED_ARGUMENT",
		Description: "Required command-line argument not provided",
		Context:     "Missing --config, --port, or other required flags",
		Category:    "usage",
	},
	64: {
		Code:          64,
		Name:          "EXIT_USAGE",
		Description:   "Command-line usage error",
		Context:       "BSD sysexits.h EX_USAGE - wrong number of arguments, bad syntax",
		Category:      "usage",
		BSDEquivalent: "EX_USAGE",
	},
	50: {
		Code:        50,
		Name:        "EXIT_PERMISSION_DENIED",
		Description: "Insufficient permissions for operation",
		Context:     "File access, port binding (<1024), privileged operations",
		Category:    "permissions",
	},
	51: {
		Code:        51,
		Name:        "EXIT_FILE_NOT_FOUND",
		Description: "Required file not found",
		Context:     "Assets, templates, data files (not config - use 23)",
		Category:    "permissions",
	},
	52: {
		Code:        52,
		Name:        "EXIT_DIRECTORY_NOT_FOUND",
		Description: "Required directory not found",
		Context:     "State directories, log paths, data directories",
		Category:    "permissions",
	},
	53: {
		Code:        53,
		Name:        "EXIT_FILE_READ_ERROR",
		Description: "Error reading file",
		Context:     "Corrupt files, I/O errors, encoding issues",
		Category:    "permissions",
	},
	54: {
		Code:        54,
		Name:        "EXIT_FILE_WRITE_ERROR",
		Description: "Error writing file",
		Context:     "Disk full, read-only filesystem, permission errors",
		Category:    "permissions",
	},
	60: {
		Code:        60,
		Name:        "EXIT_DATA_INVALID",
		Description: "Input data failed validation",
		Context:     "Schema validation, business rule violations",
		Category:    "data",
	},
	61: {
		Code:        61,
		Name:        "EXIT_PARSE_ERROR",
		Description: "Error parsing input data",
		Context:     "Malformed JSON/YAML/XML, syntax errors",
		Category:    "data",
	},
	62: {
		Code:        62,
		Name:        "EXIT_TRANSFORMATION_FAILED",
		Description: "Data transformation or conversion failed",
		Context:     "Type conversions, format transformations, encoding changes",
		Category:    "data",
	},
	63: {
		Code:        63,
		Name:        "EXIT_DATA_CORRUPT",
		Description: "Data corruption detected",
		Context:     "Checksum failures, integrity violations",
		Category:    "data",
	},
	70: {
		Code:        70,
		Name:        "EXIT_AUTHENTICATION_FAILED",
		Description: "Authentication failed",
		Context:     "Invalid credentials, expired tokens, auth service unavailable",
		Category:    "security",
	},
	71: {
		Code:        71,
		Name:        "EXIT_AUTHORIZATION_FAILED",
		Description: "Authorization failed (authenticated but insufficient permissions)",
		Context:     "RBAC failures, scope violations, resource access denied",
		Category:    "security",
	},
	72: {
		Code:        72,
		Name:        "EXIT_SECURITY_VIOLATION",
		Description: "Security policy violation detected",
		Context:     "Suspicious activity, rate limit exceeded, IP blocklist",
		Category:    "security",
	},
	73: {
		Code:          73,
		Name:          "EXIT_CERTIFICATE_INVALID",
		Description:   "TLS/SSL certificate validation failed",
		Context:       "Expired certs, untrusted CAs, hostname mismatches",
		Category:      "security",
		BSDEquivalent: "EX_PROTOCOL",
	},
	80: {
		Code:        80,
		Name:        "EXIT_METRICS_UNAVAILABLE",
		Description: "Metrics endpoint or collection system unavailable",
		Context:     "Use for observability-focused tools (Prometheus exporters, StatsD agents).\nWorkhorses SHOULD log warning and continue unless configured to fail-fast.\n",
		Category:    "observability",
	},
	81: {
		Code:        81,
		Name:        "EXIT_TRACING_FAILED",
		Description: "Distributed tracing system unavailable",
		Context:     "OTLP exporter failed, Jaeger collector unreachable",
		Category:    "observability",
	},
	82: {
		Code:        82,
		Name:        "EXIT_LOGGING_FAILED",
		Description: "Logging system unavailable or misconfigured",
		Context:     "Log aggregator unreachable, log file unwritable",
		Category:    "observability",
	},
	83: {
		Code:        83,
		Name:        "EXIT_ALERT_SYSTEM_FAILED",
		Description: "Alerting system unavailable",
		Context:     "PagerDuty API failed, Slack webhook unreachable",
		Category:    "observability",
	},
	84: {
		Code:        84,
		Name:        "EXIT_STRUCTURED_LOGGING_FAILED",
		Description: "Structured logging system unavailable",
		Context:     "JSON log aggregator unreachable, log schema validation failed",
		Category:    "observability",
	},
	91: {
		Code:        91,
		Name:        "EXIT_TEST_FAILURE",
		Description: "One or more tests failed",
		Context:     "Test assertions failed, expected behavior not met.\nMaps to pytest exit code 1, Go test failure, Jest failure.\n",
		Category:    "testing",
	},
	92: {
		Code:        92,
		Name:        "EXIT_TEST_ERROR",
		Description: "Test execution error (not test failure)",
		Context:     "Test setup failed, fixture unavailable, test harness error.\nMaps to pytest exit code 3 (internal error).\n",
		Category:    "testing",
	},
	93: {
		Code:        93,
		Name:        "EXIT_TEST_INTERRUPTED",
		Description: "Test run interrupted by user or system",
		Context:     "Ctrl+C during tests, system signal, user cancellation.\nMaps to pytest exit code 2.\n",
		Category:    "testing",
	},
	94: {
		Code:        94,
		Name:        "EXIT_TEST_USAGE_ERROR",
		Description: "Test command usage error",
		Context:     "Invalid test arguments, bad configuration.\nMaps to pytest exit code 4.\n",
		Category:    "testing",
	},
	95: {
		Code:        95,
		Name:        "EXIT_TEST_NO_TESTS_COLLECTED",
		Description: "No tests found or all tests skipped",
		Context:     "Empty test suite, all tests deselected or skipped.\nMaps to pytest exit code 5.\n",
		Category:    "testing",
	},
	96: {
		Code:        96,
		Name:        "EXIT_COVERAGE_THRESHOLD_NOT_MET",
		Description: "Test coverage below required threshold",
		Context:     "Code coverage validation, quality gate failure",
		Category:    "testing",
	},
	129: {
		Code:          129,
		Name:          "EXIT_SIGNAL_HUP",
		Description:   "Hangup signal (SIGHUP)",
		Context:       "Terminal disconnected, config reload requested",
		Category:      "signals",
		BSDEquivalent: "128 + 1",
	},
	130: {
		Code:          130,
		Name:          "EXIT_SIGNAL_INT",
		Description:   "Interrupt signal (SIGINT)",
		Context:       "Ctrl+C pressed, user interrupt",
		Category:      "signals",
		BSDEquivalent: "128 + 2",
	},
	131: {
		Code:          131,
		Name:          "EXIT_SIGNAL_QUIT",
		Description:   "Quit signal (SIGQUIT)",
		Context:       "Ctrl+\\ pressed, core dump requested",
		Category:      "signals",
		BSDEquivalent: "128 + 3",
	},
	137: {
		Code:          137,
		Name:          "EXIT_SIGNAL_KILL",
		Description:   "Kill signal (SIGKILL)",
		Context:       "Forceful termination, non-graceful shutdown (not catchable)",
		Category:      "signals",
		BSDEquivalent: "128 + 9",
		PythonNote:    "Cannot be caught in Python (OS-level)",
	},
	141: {
		Code:          141,
		Name:          "EXIT_SIGNAL_PIPE",
		Description:   "Broken pipe (SIGPIPE)",
		Context:       "Writing to closed pipe/socket, reader terminated",
		Category:      "signals",
		BSDEquivalent: "128 + 13",
		PythonNote:    "Raised as BrokenPipeError exception",
	},
	142: {
		Code:          142,
		Name:          "EXIT_SIGNAL_ALRM",
		Description:   "Alarm signal (SIGALRM)",
		Context:       "Timer expiration, alarm clock",
		Category:      "signals",
		BSDEquivalent: "128 + 14",
		PythonNote:    "Supported by signal module, rarely used in practice",
	},
	143: {
		Code:          143,
		Name:          "EXIT_SIGNAL_TERM",
		Description:   "Termination signal (SIGTERM)",
		Context:       "Graceful shutdown requested, normal termination",
		Category:      "signals",
		BSDEquivalent: "128 + 15",
		PythonNote:    "Default signal for graceful shutdown",
	},
	159: {
		Code:          159,
		Name:          "EXIT_SIGNAL_USR1",
		Description:   "User-defined signal 1 (SIGUSR1)",
		Context:       "Application-specific signal handling (e.g., reopen logs, dump stats)",
		Category:      "signals",
		BSDEquivalent: "128 + 31",
	},
	160: {
		Code:          160,
		Name:          "EXIT_SIGNAL_USR2",
		Description:   "User-defined signal 2 (SIGUSR2)",
		Context:       "Application-specific signal handling (e.g., toggle debug mode)",
		Category:      "signals",
		BSDEquivalent: "128 + 32",
	},
}

// GetExitCodeInfo returns metadata for a specific exit code.
// Returns nil if the exit code is not found.
func GetExitCodeInfo(code int) *ExitCodeInfo {
	if info, ok := exitCodeMetadata[code]; ok {
		return &info
	}
	return nil
}

// ExitCodesVersion is the catalog version for telemetry and compatibility checks
const ExitCodesVersion = "v1.0.0"
