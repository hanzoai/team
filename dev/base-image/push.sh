#!/usr/bin/env bash

# Default version if not set
VERSION=${VERSION:-"latest"}

docker push hanzoai/team:${VERSION}
docker push hardcoreeng/rekoni-base:${VERSION}
docker push hardcoreeng/print-base:${VERSION}
docker push hardcoreeng/front-base:${VERSION}