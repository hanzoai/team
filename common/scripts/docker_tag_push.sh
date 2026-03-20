#!/usr/bin/env bash
registry="${DOCKER_REGISTRY:-}"
echo "Tagging release ${registry}$1 with version $2"
docker tag "${registry}$1" "${registry}$1:$2"
for n in {1..25}; do
  docker push "${registry}$1:$2" && break
  echo 'Docker failed to push, wait 5 seconds'
  sleep 5
done