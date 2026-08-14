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
# its version as the fallback for the whole life of the image.
ARG BUILD_NUMBER=dev
WORKDIR /src/server
COPY server .
# The workspace makes ./public resolve to this tree rather than the published
# module. server/go.mod requires public v0.4.0 with no replace, and v0.4.0 has
# none of the Hanzo model — HanzoSettings, ServiceHanzo, UserAuthServiceHanzo —
# so without this the compile fails on symbols that are right here on disk.
# .dockerignore drops any go.work a working tree already has, so `init` never
# meets one it did not write.
RUN go work init . ./public && \
    CGO_ENABLED=0 go build -trimpath \
      -ldflags "-X github.com/mattermost/mattermost/server/public/model.BuildNumber=${BUILD_NUMBER}" \
      -o /out/ ./cmd/mattermost ./cmd/mmctl

# Document extraction needs these at runtime and the final image is distroless,
# so they are lifted out of a distro that has them. This stage also lays out the
# writable directories: distroless has no shell, so a later stage cannot mkdir,
# and the server will not start without config/ and data/.
FROM ubuntu:noble AS tools
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y \
      ca-certificates media-types mailcap unrtf wv poppler-utils tidy tzdata \
  && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /hanzo/data /hanzo/logs /hanzo/config /hanzo/plugins /hanzo/client/plugins /hanzo/.postgresql \
  && chmod 700 /hanzo/.postgresql \
  && chown -R 2000:2000 /hanzo

FROM gcr.io/distroless/base-debian12

ENV PATH="/hanzo/bin:${PATH}"
ENV MM_SERVICESETTINGS_ENABLELOCALMODE="true"

COPY --from=tools /etc/mime.types /etc/
COPY --from=tools --chown=2000:2000 /etc/ssl/certs /etc/ssl/certs
COPY --from=tools /usr/bin/pdftotext /usr/bin/pdftotext
COPY --from=tools /usr/bin/wvText /usr/bin/wvText
COPY --from=tools /usr/bin/wvWare /usr/bin/wvWare
COPY --from=tools /usr/bin/unrtf /usr/bin/unrtf
COPY --from=tools /usr/bin/tidy /usr/bin/tidy
COPY --from=tools /usr/share/wv /usr/share/wv
COPY --from=tools /usr/lib/libpoppler.so* /usr/lib/
COPY --from=tools /usr/lib/libfreetype.so* /usr/lib/
COPY --from=tools /usr/lib/libpng.so* /usr/lib/
COPY --from=tools /usr/lib/libwv.so* /usr/lib/
COPY --from=tools /usr/lib/libtidy.so* /usr/lib/
COPY --from=tools /usr/lib/libfontconfig.so* /usr/lib/

# The writable tree first, then the read-only content into it.
COPY --from=tools --chown=2000:2000 /hanzo /hanzo
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
