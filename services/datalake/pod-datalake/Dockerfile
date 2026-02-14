FROM hardcoreeng/base-slim:v20250916
WORKDIR /app

# Install dependencies (sharp@0.32.6 already exists in package.json)
RUN npm install --ignore-scripts=false --verbose --unsafe-perm

# Now copy the rest of the files
COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./

CMD ["dumb-init", "node", "bundle.js"]
