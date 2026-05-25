SHELL := /usr/bin/env bash
BIN   := team
PKG   := github.com/hanzoai/team-go/cmd/team

# Goa CLI provides the TS→JS transpiler. Install via:
#   go install github.com/<your-org>/goa/cmd/goa@latest
GOA   ?= goa

.PHONY: build dev run test fmt lint tidy functions clean docker

build: functions
	CGO_ENABLED=0 go build -ldflags="-s -w" -o $(BIN) $(PKG)

# Local dev: file-watcher reloads .fn.ts changes via jsvm HooksWatch.
dev: functions
	go run $(PKG) serve --dev --http :8080

run: build
	./$(BIN) serve --http :8080

# Transpile every functions/*.fn.ts → functions/dist/*.js for Goja.
functions:
	@mkdir -p functions/dist
	@if command -v $(GOA) >/dev/null; then \
		$(GOA) build --functions-dir ./functions --migrations-dir ./migrations; \
	else \
		echo "goa not installed; falling back to npx esbuild"; \
		npx --yes esbuild --bundle --format=cjs --target=es2015 --platform=neutral \
			--outdir=functions/dist --out-extension:.js=.js \
			functions/*.fn.ts; \
	fi

test:
	go test -race -cover ./...

fmt:
	gofmt -w .
	goimports -w . 2>/dev/null || true

lint:
	golangci-lint run ./...

tidy:
	go mod tidy

clean:
	rm -rf $(BIN) functions/dist

docker:
	docker build -t ghcr.io/hanzoai/team:dev .

.DEFAULT_GOAL := build
