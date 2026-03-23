#!/usr/bin/env bash

# Default version if not set
VERSION=${VERSION:-"latest"}

# DOCKER_REGISTRY: prefix for image names (e.g. "ghcr.io/" for GHCR).
# Empty by default for local builds. Always include trailing slash if set.
registry="${DOCKER_REGISTRY:-}"

docker build -t "${registry}hanzoai/base:${VERSION}" -f base.Dockerfile ${DOCKER_EXTRA} .
docker build -t "${registry}hanzoai/base-slim:${VERSION}" -f slim.Dockerfile ${DOCKER_EXTRA} .
docker build -t "${registry}hanzoai/rekoni-base:${VERSION}" -f rekoni.Dockerfile ${DOCKER_EXTRA} .
docker build -t "${registry}hanzoai/print-base:${VERSION}" -f print.Dockerfile ${DOCKER_EXTRA} .
docker build -t "${registry}hanzoai/front-base:${VERSION}" -f front.Dockerfile ${DOCKER_EXTRA} .
docker build -t "${registry}hanzoai/preview-base:${VERSION}" -f preview.Dockerfile ${DOCKER_EXTRA} .
