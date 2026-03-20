#!/usr/bin/env bash

version=${DOCKER_VERSION:-$(git describe --tags --abbrev=0)}
rev_version=$(git rev-parse HEAD)

# DOCKER_REGISTRY: prefix for image names (e.g. "ghcr.io/" for GHCR).
# Empty by default for Docker Hub. Always include trailing slash if set.
registry="${DOCKER_REGISTRY:-}"

if [ "x$2" = "xstaging" ]
then
  a=( ${version//./ } )
  c=( ${a[2]//[^0-9]*/ } )
  ((c++))
  version="${a[0]}.${a[1]}.${c}-staging"
  echo "Tagging staging ${registry}$1 with version ${version}"
  docker tag "${registry}$1:$rev_version" "${registry}$1:$version"
  for n in {1..25}; do
    docker push "${registry}$1:$version" && break

    if (( $n < 25 ))
    then
      echo 'Docker failed to push, wait 5 second'
      sleep 5
    else
      echo '25 push attempts failed, exiting with failure'
      exit 1
    fi
  done
else
  echo "Tagging release ${registry}$1 with version ${version}"
  docker tag "${registry}$1:$rev_version" "${registry}$1:$version"
  docker tag "${registry}$1:$rev_version" "${registry}$1:latest"
  for n in {1..25}; do
    docker push "${registry}$1:$version" && break

    if (( $n < 25 ))
    then
      echo 'Docker failed to push, wait 5 second'
      sleep 5
    else
      echo '25 push attempts failed, exiting with failure'
      exit 1
    fi
  done
  for n in {1..25}; do
    docker push "${registry}$1:latest" && break

    if (( $n < 25 ))
    then
      echo 'Docker failed to push, wait 5 second'
      sleep 5
    else
      echo '25 push attempts failed, exiting with failure'
      exit 1
    fi
  done
fi
