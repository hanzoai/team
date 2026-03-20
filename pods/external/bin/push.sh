set -e

# DOCKER_REGISTRY: prefix for image names (e.g. "ghcr.io/" for GHCR).
docker_registry="${DOCKER_REGISTRY:-}"
registry=hanzoai
tag=$(git describe --tags --abbrev=0)

find services.d/ -type f -name "*.service" ! -name "-*" | sort | while read -r file; do
    line=$(cat $file | grep -v -e '^[[:space:]]*$' -e '^#' | head -n 1)

    target_repo=$(echo $line | cut -d ' ' -f1 | tr -d '[:space:]')
    source=$(echo $line | cut -d ' ' -f2 | tr -d '[:space:]')

    if [ ! -z $target_repo ] && [ ! -z $source ]; then
        target=${docker_registry}$registry/$target_repo:$tag

        docker buildx imagetools create --tag $target $source

        echo "Copy: $source -> $target"
    fi
done

exit 0