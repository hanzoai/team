#!/usr/bin/env bash

# Default version if not set
VERSION=${VERSION:-"latest"}

docker build -t hanzoai/base:${VERSION} -f base.Dockerfile ${DOCKER_EXTRA} .
docker build -t hanzoai/base-slim:${VERSION} -f slim.Dockerfile ${DOCKER_EXTRA} .
docker build -t hanzoai/rekoni-base:${VERSION} -f rekoni.Dockerfile ${DOCKER_EXTRA} .
docker build -t hanzoai/print-base:${VERSION} -f print.Dockerfile ${DOCKER_EXTRA} .
docker build -t hanzoai/front-base:${VERSION} -f front.Dockerfile ${DOCKER_EXTRA} .
docker build -t hanzoai/preview-base:${VERSION} -f preview.Dockerfile ${DOCKER_EXTRA} .