#!/bin/bash
# Supports minified mode for resource-constrained dev machines:
#   rush docker --minified   or   rush docker:min

MINIFIED=false
for arg in "$@"; do
  if [ "$arg" = "--minified" ]; then
    MINIFIED=true
    break
  fi
done

if [ "$MINIFIED" = true ]; then
  echo "Building minified docker images (excluding optional services)..."
  rush docker:build -p 20 \
    --to @hanzo/pod-server \
    --to @hanzo/pod-front \
    --to @hanzo/prod \
    --to @hanzo/pod-account \
    --to @hanzo/pod-workspace \
    --to @hanzo/pod-collaborator \
    --to @hanzo/tool \
    --to @hanzo/pod-analytics-collector \
    --to @hanzo/rekoni-service \
    --to @hanzo/pod-datalake \
    --to @hanzo/pod-export \
    --to @hanzo/pod-media \
    --to @hanzo/pod-external
else
  rush docker:build -p 20 \
    --to @hanzo/pod-server \
    --to @hanzo/pod-front \
    --to @hanzo/prod \
    --to @hanzo/pod-account \
    --to @hanzo/pod-workspace \
    --to @hanzo/pod-collaborator \
    --to @hanzo/tool \
    --to @hanzo/pod-print \
    --to @hanzo/pod-sign \
    --to @hanzo/pod-analytics-collector \
    --to @hanzo/rekoni-service \
    --to @hanzo/pod-ai-bot \
    --to @hanzo/import-tool \
    --to @hanzo/pod-stats \
    --to @hanzo/pod-fulltext \
    --to @hanzo/pod-love \
    --to @hanzo/pod-mail \
    --to @hanzo/pod-datalake \
    --to @hanzo/pod-mail-worker \
    --to @hanzo/pod-export \
    --to @hanzo/pod-media \
    --to @hanzo/pod-preview \
    --to @hanzo/pod-link-preview \
    --to @hanzo/pod-external \
    --to @hanzo/pod-backup \
    --to @hanzo/backup-api-pod \
    --to @hanzo/pod-billing \
    --to @hanzo/pod-process \
    --to @hanzo/pod-rating \
    --to @hanzo/pod-payment
fi
