#!/bin/bash

# Lấy danh sách image hanzoai/*:latest
images=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep '^hanzoai/' | grep ':latest')

# Push từng image
for image in $images; do
  echo "🚀 Pushing $image"
  docker push "$image"
  echo "✅ Done: $image"
  echo "-----------------------------"
done
