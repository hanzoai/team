#!/bin/bash

# Danh sách các image cần đổi tag
images=(
  "stats"
  "account"
  "collaborator"
  "fulltext"
  "transactor"
  "rekoni-service"
  "front"
  "workspace"
)

# Gốc prefix cũ và mới
old_prefix="hardcoreeng"
new_prefix="hanzoai"

# Loop đổi tên và tag
for image in "${images[@]}"; do
  docker tag "${old_prefix}/${image}:v0.6.482" "${new_prefix}/${image}:latest"
  docker push "${new_prefix}/${image}:latest"
done
