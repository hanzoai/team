# syntax=docker/dockerfile:1
# Stage 1 — toolchain build (transpile .ts + go build).
FROM golang:1.26.4-alpine AS build

RUN apk add --no-cache git make bash nodejs npm ca-certificates tzdata
RUN npm install -g esbuild

# Create nonroot user/group records to copy into scratch runtime.
RUN addgroup -g 65532 -S nonroot && adduser -u 65532 -S nonroot -G nonroot

# Private Go modules (github.com/hanzoai/*) need auth for `go mod download`.
# Two delivery paths, both build-time-only (never copied into the scratch
# runtime):
#   - BuildKit secret id=gh_token  (docker/buildx CI — NOT baked into layers;
#     the reusable hanzoai/.github docker-build.yml mounts this)
#   - --build-arg GH_TOKEN=...      (kaniko, which has no --mount=type=secret)
# When neither is set (public-dep builds) the git rewrite is a no-op.
ARG GH_TOKEN=""
ENV GOPRIVATE=github.com/hanzoai/*,github.com/lux-private/*,github.com/zooai/*
WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=secret,id=gh_token,required=false \
    TOKEN="$(cat /run/secrets/gh_token 2>/dev/null || echo "$GH_TOKEN")"; \
    if [ -n "$TOKEN" ]; then \
      git config --global url."https://x-access-token:${TOKEN}@github.com/".insteadOf "https://github.com/"; \
    fi; \
    go mod download

COPY . .

# Build .fn.ts → .fn.js, then static go binary.
ENV CGO_ENABLED=0 GOOS=linux GOARCH=amd64
RUN make functions && go build -ldflags="-s -w" -o /team ./cmd/team

# Stage 2 — scratch runtime. Ships ONLY:
#   - /team             (~25–30 MB static binary)
#   - /functions/dist   (compiled JS hooks)
#   - /migrations       (JS migrations, run by `team migrate up`)
#   - CA certs, tzdata, passwd/group for nonroot user
FROM scratch

COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=build /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=build /etc/passwd /etc/passwd
COPY --from=build /etc/group /etc/group

WORKDIR /app
COPY --from=build /team /app/team
COPY --from=build /src/functions/dist /app/functions/dist
COPY --from=build /src/migrations     /app/migrations

ENV TEAM_HOOKS_DIR=/app/functions/dist \
    TEAM_MIGRATIONS_DIR=/app/migrations \
    TEAM_HOOKS_WATCH=false

EXPOSE 8080
USER 65532:65532
ENTRYPOINT ["/app/team"]
CMD ["serve", "--http", "0.0.0.0:8080"]
