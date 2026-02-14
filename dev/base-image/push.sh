#!/usr/bin/env bash

# Default version if not set
VERSION=${VERSION:-"latest"}

docker push hanzoai/base:${VERSION}
docker push hanzoai/base-slim:${VERSION}
docker push hanzoai/rekoni-base:${VERSION}
docker push hanzoai/print-base:${VERSION}
docker push hanzoai/front-base:${VERSION}
docker push hanzoai/preview-base:${VERSION}
