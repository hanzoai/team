# Hanzo Team — server + web app, built from this tree.
#
# Upstream's server/build/Dockerfile downloads a released tarball, which cannot
# work for a fork: the thing we changed is the source. This builds both halves
# and assembles the same runtime layout the binary looks for.

FROM node:24.11-bookworm AS webapp
WORKDIR /src/webapp
# The whole tree BEFORE the install, not the manifests alone. `npm ci` runs the
# root postinstall, which is `patch-package` followed by a BUILD of the platform
# workspaces — so an install staged on package.json files has nothing to compile
# and dies there. The dependency layer a manifests-only copy would have cached is
# not available at this shape, and a cache that breaks the build is not a cache.
COPY webapp .
# `npm run build` is the repo's own build (scripts/build.mjs): subpackages first,
# then channels. Naming the channels workspace directly would skip the first half.
RUN npm ci --no-audit --no-fund && npm run build

FROM golang:1.26.4-bookworm AS server
# Declared, or the expansion below is unset on every build and the server reports
# its version as the fallback for the life of the image.
ARG BUILD_NUMBER=dev
WORKDIR /src/server
# go.work comes with this copy and is tracked (see server/.gitignore), so ./public
# resolves to this tree rather than the published v0.4.0, which carries none of
# the Hanzo model. Nothing is arranged here — the tree already states it.
COPY server .
# `production` is not decoration: without the tag the !production file in
# server/public/model selects the DEV service environment, and a shipped binary
# then points at dev telemetry and licensing.
RUN CGO_ENABLED=0 go build -trimpath -tags production \
      -ldflags "-X github.com/mattermost/mattermost/server/public/model.BuildNumber=${BUILD_NUMBER}" \
      -o /out/ ./cmd/mattermost ./cmd/mmctl

# The writable tree and the mime table. Distroless has no shell, so directories
# the server creates files in cannot be made in the final stage — and unmade, the
# server has nowhere to write its config or its log and does not start.
FROM ubuntu:noble AS tools
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
      ca-certificates media-types tzdata \
  && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /hanzo/data /hanzo/logs /hanzo/config /hanzo/plugins /hanzo/client/plugins \
  && chown -R 2000:2000 /hanzo

# Agents, the plugin that makes this an AI workspace rather than a chat server.
#
# The config enables it (PluginStates["mattermost-ai"] in server/public/model/
# config.go) and points it at api.hanzo.ai. Without the bundle beside that
# config the server enables a plugin it does not have: /v1/workspace/plugins/
# webapp answers [] and there is no AI at all. Upstream fills this directory
# from `make prepackaged-plugins`; this image builds the binaries directly and
# never ran make, so the directory shipped empty.
#
# The server finds it by walking . .. ../.. from the working directory
# (utils.CommonBaseSearchPaths), and WORKDIR is /hanzo.
#
# Pinned by digest, not just by version: the URL is a third party's host, and a
# checksum is what makes fetching from one tamper-evident. It is still their
# availability we depend on at build time — mirroring the artifact to our own
# store is the follow-up, and this comment is here so that is a decision rather
# than something nobody noticed.
ARG AGENTS_VERSION=v2.5.1
ARG AGENTS_SHA256=d6431e17350d001a715220f038fa7e587d993bda621c2ad9385c9466455f880e
ADD --checksum=sha256:${AGENTS_SHA256} \
    https://plugins.releases.mattermost.com/release/mattermost-plugin-agents-${AGENTS_VERSION}.tar.gz \
    /tmp/agents.tar.gz
# The signature travels with the bundle. buildPrepackagedPlugin refuses a
# prepackaged plugin without one -- "Always require signature for prepackaged
# plugins" -- independently of RequirePluginSignature, which governs plugins an
# admin uploads. The server verifies it against the publisher key it already
# carries.
ARG AGENTS_SIG_SHA256=6ffdbb734f92a26522e62ec3cd7b58f431342935e74dd3c9e3b121cbdde44a18
ADD --checksum=sha256:${AGENTS_SIG_SHA256} \
    https://plugins.releases.mattermost.com/release/mattermost-plugin-agents-${AGENTS_VERSION}.tar.gz.sig \
    /tmp/agents.tar.gz.sig
RUN mkdir -p /hanzo/prepackaged_plugins \
  && cp /tmp/agents.tar.gz /hanzo/prepackaged_plugins/mattermost-plugin-agents-${AGENTS_VERSION}.tar.gz \
  && cp /tmp/agents.tar.gz.sig /hanzo/prepackaged_plugins/mattermost-plugin-agents-${AGENTS_VERSION}.tar.gz.sig \
  && rm /tmp/agents.tar.gz /tmp/agents.tar.gz.sig \
  && chown -R 2000:2000 /hanzo/prepackaged_plugins

# Upstream also lifts pdftotext, wvText, wvWare, unrtf and tidy in here for
# attachment text extraction. They are NOT carried, because on this base they
# cannot run and shipping a binary that cannot run is not a feature:
#   pdftotext  needs GLIBC_2.38 and libstdc++; debian12 is 2.36 and distroless
#              `base` has no libstdc++ at any version.
#   wvText     is a /bin/sh script, and there is no shell here.
# The library COPYs beside them read /usr/lib/libpoppler.so*, while Ubuntu puts
# every one of those under /usr/lib/x86_64-linux-gnu — and a --from glob that
# matches nothing is a silent no-op in BuildKit, so upstream's image has been
# carrying five binaries with no libraries and reporting success. Restoring
# extraction means a base that can run it, which is a different decision than
# this one and should be made on its own.

FROM gcr.io/distroless/base-debian12

ENV PATH="/hanzo/bin:${PATH}"
ENV MM_SERVICESETTINGS_ENABLELOCALMODE="true"

COPY --from=tools /etc/mime.types /etc/
COPY --from=tools --chown=2000:2000 /etc/ssl/certs /etc/ssl/certs
# The writable tree first, then the read-only content into it.
COPY --from=tools --chown=2000:2000 /hanzo /hanzo
# Its own layer, and its own instruction, deliberately. Carried inside the copy
# above it was invisible to the cache: that instruction's text does not mention
# the bundle, so a registry cache entry recorded before the bundle existed still
# matched, and three builds in a row published an image whose /hanzo layer was
# 32kB of empty directories. Naming the path here means the key changes when the
# path does.
COPY --from=tools --chown=2000:2000 /hanzo/prepackaged_plugins /hanzo/prepackaged_plugins
COPY --from=server --chown=2000:2000 /out/ /hanzo/bin/
COPY --from=webapp --chown=2000:2000 /src/webapp/channels/dist /hanzo/client
COPY --chown=2000:2000 server/i18n /hanzo/i18n
COPY --chown=2000:2000 server/templates /hanzo/templates
COPY --chown=2000:2000 server/fonts /hanzo/fonts
# NOT chowned: this is the account database, and the account it names must not be
# able to rewrite it.
COPY server/build/passwd /etc/passwd

USER 2000
WORKDIR /hanzo
EXPOSE 8065 8067 8074
VOLUME ["/hanzo/data", "/hanzo/logs", "/hanzo/config", "/hanzo/plugins", "/hanzo/client/plugins"]
HEALTHCHECK --interval=30s --timeout=10s CMD ["/hanzo/bin/mmctl", "system", "status", "--local"]
CMD ["/hanzo/bin/mattermost"]
