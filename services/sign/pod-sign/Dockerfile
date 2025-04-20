
FROM hanzoai/team:v20250310
WORKDIR /usr/src/app

COPY bundle/bundle.js ./

CMD [ "dumb-init", "node", "bundle.js" ]
