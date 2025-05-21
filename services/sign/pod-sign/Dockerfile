
FROM hanzoai/team:latest
WORKDIR /usr/src/app

COPY bundle/bundle.js ./

CMD [ "dumb-init", "node", "bundle.js" ]
