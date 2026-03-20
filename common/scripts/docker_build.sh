#!/usr/bin/env bash

version=${DOCKER_VERSION:-$(git rev-parse HEAD)}

# DOCKER_REGISTRY: prefix for image names (e.g. "ghcr.io/" for GHCR).
# Empty by default for local builds. Always include trailing slash if set.
registry="${DOCKER_REGISTRY:-}"

# Check for cleanup flag from environment
cleanup=false
if [ "$DOCKER_BUILD_CLEANUP" = "true" ]; then
  cleanup=true
fi

echo "Building version: $version (registry: ${registry:-local})"

docker build -t "${registry}$1" -t "${registry}$1:$version" ${DOCKER_EXTRA} .

if [ "$cleanup" = true ]; then
  echo "Cleaning up build artifacts..."

  if [ -d "bundle" ]; then
    echo "  Removing bundle/"
    rm -rf bundle
  fi

  if [ -d "dist" ]; then
    echo "  Removing dist/"
    rm -rf dist
  fi

  if [ -d ".rush" ]; then
    echo "  Removing .rush/"
    rm -rf .rush
  fi

  echo "  Size after cleanup: $(du -sh . 2>/dev/null | cut -f1)"
fi
