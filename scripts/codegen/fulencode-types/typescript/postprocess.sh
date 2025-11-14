#!/bin/bash
# Postprocess TypeScript fulencode types with biome
cd lang/typescript && bun run format "$1" 2>/dev/null || true
