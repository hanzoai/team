#!/usr/bin/env bash

export MODEL_VERSION=$(node ../common/scripts/show_version.js)
export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin
export MINIO_ENDPOINT=hanzo.local:9002
export ACCOUNTS_URL=http://hanzo.local:3003
export TRANSACTOR_URL=ws://hanzo.local:3334
export ACCOUNT_DB_URL=postgresql://root@hanzo.local:26258/defaultdb?sslmode=disable
export MONGO_URL=mongodb://hanzo.local:27018
export ELASTIC_URL=http://hanzo.local:9201
export SERVER_SECRET=secret
export DB_URL=$MONGO_URL
export QUEUE_CONFIG=hanzoai.local:19093

# Check if local bundle.js exists and use it if available
BUNDLE_PATH="../dev/tool/bundle/bundle.js"
if [ -f "./bundle.js" ]; then
  BUNDLE_PATH="./bundle.js"
fi

node ${TOOL_OPTIONS} --max-old-space-size=8096 $BUNDLE_PATH $@
