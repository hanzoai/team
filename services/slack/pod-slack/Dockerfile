FROM ghcr.io/hanzoai/base-slim:v20250916
WORKDIR /usr/src/app

COPY bundle/bundle.js ./

EXPOSE 4023
CMD [ "node", "bundle.js" ]
