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
    --to @hanzoteam/pod-server \
    --to @hanzoteam/pod-front \
    --to @hanzoteam/prod \
    --to @hanzoteam/pod-account \
    --to @hanzoteam/pod-workspace \
    --to @hanzoteam/pod-collaborator \
    --to @hanzoteam/tool \
    --to @hanzoteam/pod-analytics-collector \
    --to @hanzoteam/rekoni-service \
    --to @hanzoteam/pod-datalake \
    --to @hanzoteam/pod-export \
    --to @hanzoteam/pod-media \
    --to @hanzoteam/pod-external
else
  rush docker:build -p 20 \
    --to @hanzoteam/pod-server \
    --to @hanzoteam/pod-front \
    --to @hanzoteam/prod \
    --to @hanzoteam/pod-account \
    --to @hanzoteam/pod-workspace \
    --to @hanzoteam/pod-collaborator \
    --to @hanzoteam/tool \
    --to @hanzoteam/pod-print \
    --to @hanzoteam/pod-sign \
    --to @hanzoteam/pod-analytics-collector \
    --to @hanzoteam/rekoni-service \
    --to @hanzoteam/pod-ai-bot \
    --to @hanzoteam/import-tool \
    --to @hanzoteam/pod-stats \
    --to @hanzoteam/pod-fulltext \
    --to @hanzoteam/pod-love \
    --to @hanzoteam/pod-mail \
    --to @hanzoteam/pod-datalake \
    --to @hanzoteam/pod-mail-worker \
    --to @hanzoteam/pod-export \
    --to @hanzoteam/pod-media \
    --to @hanzoteam/pod-preview \
    --to @hanzoteam/pod-link-preview \
    --to @hanzoteam/pod-external \
    --to @hanzoteam/pod-backup \
    --to @hanzoteam/backup-api-pod \
    --to @hanzoteam/pod-billing \
    --to @hanzoteam/pod-process \
    --to @hanzoteam/pod-rating \
    --to @hanzoteam/pod-payment \
    --to @hanzoteam/pod-worker
fi
