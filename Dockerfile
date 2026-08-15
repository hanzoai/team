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
COPY --from=server --chown=2000:2000 /out/ /hanzo/bin/
COPY --from=webapp --chown=2000:2000 /src/webapp/channels/dist /hanzo/client
COPY --chown=2000:2000 server/i18n /hanzo/i18n
COPY --chown=2000:2000 server/templates /hanzo/templates
COPY --chown=2000:2000 server/fonts /hanzo/fonts

# The Agents plugin is NOT in this image. It arrives through the file store,
# which app.hanzo.team seeds from an init container running
# ghcr.io/hanzoteam/agents, and the server installs it from there on boot.
#
# It cannot be carried here. A prepackaged bundle must be signed against
# Mattermost's key, which a fork cannot produce; and a bundle placed directly in
# the plugins directory does not survive startup, because initPlugins runs
# syncPlugins first and that removes every locally available plugin before
# installing from the file store. The file store is the one path that takes a
# plugin we built ourselves.

# NOT chowned: this is the account database, and the account it names must not be
# able to rewrite it.
COPY server/build/passwd /etc/passwd

USER 2000
WORKDIR /hanzo
EXPOSE 8065 8067 8074
VOLUME ["/hanzo/data", "/hanzo/logs", "/hanzo/config", "/hanzo/plugins", "/hanzo/client/plugins"]
HEALTHCHECK --interval=30s --timeout=10s CMD ["/hanzo/bin/mmctl", "system", "status", "--local"]
CMD ["/hanzo/bin/mattermost"]
