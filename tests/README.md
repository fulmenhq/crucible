# Crucible Test Fixtures

This directory contains test fixtures for validating Crucible schemas, taxonomies, and helper library implementations.

## Purpose

Test fixtures serve multiple purposes:

1. **Schema Validation**: Verify that schemas correctly accept valid data and reject invalid data
2. **Parity Testing**: Enable helper libraries to validate their implementations against canonical examples
3. **Documentation**: Provide concrete examples of schema-compliant data structures
4. **Cross-Language Consistency**: Ensure all helper libraries (gofulmen, pyfulmen, tsfulmen) produce identical outputs

## Directory Structure

```
tests/
├── fixtures/
│   └── metrics/
│       ├── prometheus/          # Prometheus exporter-specific metrics
│       │   ├── histogram-duration-valid.json
│       │   ├── counter-refresh-total-valid.json
│       │   ├── counter-errors-valid.json
│       │   ├── gauge-inflight-valid.json
│       │   ├── counter-http-requests-valid.json
│       │   ├── counter-http-errors-valid.json
│       │   ├── counter-restarts-valid.json
│       │   └── invalid-unknown-label.json  # Negative test case
│       └── general/             # General helper library metrics
│           ├── counter-simple.json
│           └── histogram-ms.json
└── README.md  # This file
```

## Metrics Fixtures

All metrics fixtures conform to `schemas/observability/metrics/v1.0.0/metrics-event.schema.json`.

### Prometheus Exporter Metrics (`prometheus/`)

These fixtures demonstrate the `prometheus_exporter_*` metrics added in Crucible v0.2.7:

- **histogram-duration-valid.json**: Histogram metric using seconds unit with ADR-0007 buckets converted (÷1000)
- **counter-refresh-total-valid.json**: Counter with required `result` label
- **counter-errors-valid.json**: Counter with detailed error classification labels
- **gauge-inflight-valid.json**: Gauge tracking concurrent operations
- **counter-http-requests-valid.json**: HTTP requests counter with status/path labels
- **counter-http-errors-valid.json**: HTTP errors counter with optional `client` label
- **counter-restarts-valid.json**: Restarts counter with `reason` label
- **invalid-unknown-label.json**: Negative test case with undefined label (for validation testing)

### General Metrics (`general/`)

Standard helper library module metrics:

- **counter-simple.json**: Simple counter metric (schema validations)
- **histogram-ms.json**: Histogram metric using milliseconds unit with ADR-0007 default buckets

## Using Fixtures in Helper Library Tests

### parity Testing Pattern

Helper libraries should use these fixtures to validate their telemetry implementations produce schema-compliant output:

**Python (pyfulmen)**:

```python
import json
from pathlib import Path

def test_prometheus_refresh_total_parity():
    # Load canonical fixture
    fixture_path = Path("tests/fixtures/metrics/prometheus/counter-refresh-total-valid.json")
    expected = json.loads(fixture_path.read_text())

    # Generate metric event from helper library
    metrics.counter("prometheus_exporter_refresh_total", tags={"result": "success"}).inc(1250)
    actual = metrics.export()[0]

    # Validate parity (allowing timestamp differences)
    assert actual["name"] == expected["name"]
    assert actual["value"] == expected["value"]
    assert actual["tags"] == expected["tags"]
    assert actual["unit"] == expected["unit"]
```

**TypeScript (tsfulmen)**:

```typescript
import { readFileSync } from "fs";
import { join } from "path";

describe("Prometheus exporter metrics parity", () => {
  it("should match canonical refresh_total fixture", () => {
    const fixturePath = join(
      __dirname,
      "../fixtures/metrics/prometheus/counter-refresh-total-valid.json",
    );
    const expected = JSON.parse(readFileSync(fixturePath, "utf-8"));

    metrics
      .counter("prometheus_exporter_refresh_total", { result: "success" })
      .inc(1250);
    const [actual] = metrics.export();

    expect(actual.name).toBe(expected.name);
    expect(actual.value).toBe(expected.value);
    expect(actual.tags).toEqual(expected.tags);
    expect(actual.unit).toBe(expected.unit);
  });
});
```

**Go (gofulmen)**:

```go
func TestPrometheusRefreshTotalParity(t *testing.T) {
    // Load canonical fixture
    fixtureData, _ := os.ReadFile("tests/fixtures/metrics/prometheus/counter-refresh-total-valid.json")
    var expected MetricsEvent
    json.Unmarshal(fixtureData, &expected)

    // Generate metric event
    metrics.Counter("prometheus_exporter_refresh_total").Inc(1250)
    actual := metrics.Export()[0]

    // Validate parity
    assert.Equal(t, expected.Name, actual.Name)
    assert.Equal(t, expected.Value, actual.Value)
    assert.Equal(t, expected.Tags, actual.Tags)
    assert.Equal(t, expected.Unit, actual.Unit)
}
```

### Schema Validation

Validate that helper library output conforms to the metrics schema:

```bash
# Using goneat (if available)
goneat schema validate --schema schemas/observability/metrics/v1.0.0/metrics-event.schema.json \
                       --data tests/fixtures/metrics/prometheus/histogram-duration-valid.json
```

### Negative Testing

Use `invalid-*.json` fixtures to verify validation logic correctly rejects malformed data:

```python
def test_rejects_unknown_label():
    fixture_path = Path("tests/fixtures/metrics/prometheus/invalid-unknown-label.json")
    invalid_data = json.loads(fixture_path.read_text())

    # Should reject unknown_label
    with pytest.raises(ValidationError):
        validate_metrics_event(invalid_data)
```

## Adding New Fixtures

When adding metrics to the taxonomy (`config/taxonomy/metrics.yaml`):

1. **Create fixture file** in appropriate directory (`prometheus/` or `general/`)
2. **Follow naming convention**: `{type}-{metric-name}-{valid|invalid}.json`
   - `{type}`: `counter`, `histogram`, `gauge`
   - `{metric-name}`: Short identifier from metric name
   - `{valid|invalid}`: Test case type
3. **Include all required fields**: `timestamp`, `name`, `value`, `tags`, `unit`
4. **Add required labels**: Per taxonomy metric description
5. **Use correct units**: Match taxonomy (ADR-0007 buckets for `ms`, converted for `s`)
6. **Document purpose**: Add comment for negative test cases

Example:

```json
{
  "timestamp": "2025-11-06T12:34:56.789Z",
  "name": "foundry_mime_detections_total",
  "value": 542,
  "tags": {
    "mime_type": "image/png",
    "result": "success"
  },
  "unit": "count"
}
```

## References

- **Metrics Schema**: `schemas/observability/metrics/v1.0.0/metrics-event.schema.json`
- **Taxonomy**: `config/taxonomy/metrics.yaml`
- **Telemetry Standard**: `docs/standards/library/modules/telemetry-metrics.md`
- **ADR-0007**: Default Histogram Buckets
- **ADR-0008**: Helper Library Instrumentation Patterns

## Maintenance

- **Update fixtures** when schemas change
- **Sync across repos**: Helper libraries should copy fixtures to their test suites
- **Version compatibility**: Document minimum Crucible version for each fixture set
- **Cross-language validation**: Ensure fixtures work with all language implementations
