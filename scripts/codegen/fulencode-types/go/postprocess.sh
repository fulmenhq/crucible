#!/bin/bash
# Postprocess Go fulencode types with gofmt
gofmt -w "$1" 2>/dev/null || true
