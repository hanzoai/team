# Stage 1 — toolchain build (transpile .ts + go build).
FROM golang:1.26-alpine AS build

RUN apk add --no-cache git make bash nodejs npm

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

# Install goa CLI for .ts → .js transpilation. Falls back to bunx
# esbuild if goa isn't available (Makefile handles both).
RUN go install github.com/liquidityio/goa/cmd/goa@latest || true

COPY . .

# Build .fn.ts → .fn.js, then static go binary.
ENV CGO_ENABLED=0 GOOS=linux GOARCH=amd64
RUN make functions && go build -ldflags="-s -w" -o /team ./cmd/team

# Stage 2 — distroless runtime. Ships ONLY:
#   - /team             (~25–30 MB static binary)
#   - /functions/dist   (compiled JS hooks)
#   - /migrations       (JS migrations, run by `team migrate up`)
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app
COPY --from=build /team /app/team
COPY --from=build /src/functions/dist /app/functions/dist
COPY --from=build /src/migrations     /app/migrations

ENV TEAM_HOOKS_DIR=/app/functions/dist \
    TEAM_MIGRATIONS_DIR=/app/migrations \
    TEAM_HOOKS_WATCH=false

EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/app/team"]
CMD ["serve", "--http", "0.0.0.0:8080"]
