export MODEL_VERSION=$(node ../common/scripts/show_version.js)
export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin
export MINIO_ENDPOINT=hanzoai.local:9000
export MONGO_URL=mongodb://hanzoai.local:27017
export DB_URL=mongodb://hanzoai.local:27017
export ACCOUNT_DB_URL=mongodb://hanzoai.local:27017
export ACCOUNTS_URL=http://hanzoai.local:3000
export TRANSACTOR_URL=ws://hanzoai.local:3333
export ELASTIC_URL=http://hanzoai.local:9200
export SERVER_SECRET=secret
export QUEUE_CONFIG=hanzoai.local:19093

# Restore workspace contents in mongo/elastic
node ../dev/tool/bundle/bundle.js $@
