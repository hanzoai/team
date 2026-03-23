#!/usr/bin/env bash

# Default version if not set
VERSION=${VERSION:-"latest"}

# DOCKER_REGISTRY: prefix for image names (e.g. "ghcr.io/" for GHCR).
# Empty by default for local builds. Always include trailing slash if set.
registry="${DOCKER_REGISTRY:-}"

docker push "${registry}hanzoai/base:${VERSION}"
docker push "${registry}hanzoai/base-slim:${VERSION}"
docker push "${registry}hanzoai/rekoni-base:${VERSION}"
docker push "${registry}hanzoai/print-base:${VERSION}"
docker push "${registry}hanzoai/front-base:${VERSION}"
docker push "${registry}hanzoai/preview-base:${VERSION}"
