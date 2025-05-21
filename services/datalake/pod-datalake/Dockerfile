# FROM hanzoai/team:latest
# WORKDIR /usr/src/app

# # Install system dependencies for sharp
# RUN apt-get update && \
#     apt-get install -y libvips-dev && \
#     rm -rf /var/lib/apt/lists/*

# RUN npm install --ignore-scripts=false --verbose sharp@v0.32.6 --unsafe-perm

# COPY bundle/bundle.js ./
# COPY bundle/bundle.js.map ./

# CMD [ "dumb-init", "node", "bundle.js" ]


FROM hanzoai/team:latest
WORKDIR /usr/src/app

# Copy only package files first for caching purposes
COPY package.json package-lock.json* ./

# Install dependencies (sharp@0.32.6 already exists in package.json)
RUN npm install --ignore-scripts=false --verbose --unsafe-perm

# Now copy the rest of the files
COPY bundle/bundle.js ./
COPY bundle/bundle.js.map ./

CMD ["dumb-init", "node", "bundle.js"]
