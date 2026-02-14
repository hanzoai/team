# Hanzo Team Core

[![GitHub License](https://img.shields.io/github/license/hcengineering/hanzo.core?style=for-the-badge)](LICENSE)

⭐️ Your star shines on us. Star us on GitHub!

## About

Hanzo Team Core is a collection of core packages extracted from the [Hanzo Team](https://github.com/hcengineering/platform). This repository contains fundamental building blocks and libraries that power the Hanzo Team ecosystem, including core data models, client libraries, text processing engines, and platform utilities.

These packages are designed to be reusable, modular, and framework-agnostic, making them suitable for building custom applications on top of the Hanzo Team or integrating Hanzo functionality into existing projects.

## Packages

This repository includes the following core packages:

### Core Packages

- **[@hanzo/core](packages/core)** - Core data models, types, and fundamental platform abstractions
- **[@hanzo/platform](packages/platform)** - Platform runtime, plugin system, and dependency injection
- **[@hanzo/model](packages/model)** - Data model definitions and schema management

### Client Libraries

- **[@hanzo/client](packages/client)** - Client-side data access and synchronization layer
- **[@hanzo/client-resources](packages/client-resources)** - Shared client resources and utilities
- **[@hanzo/api-client](packages/api-client)** - API client for programmatic access to Hanzo Team (WebSocket and REST)
- **[@hanzo/account-client](packages/account-client)** - Account management client
- **[@hanzo/collaborator-client](packages/collaborator-client)** - Real-time collaboration client
- **[@hanzo/hanzolake-client](packages/hanzolake-client)** - HanzoLake data warehouse client
- **[@hanzo/analytics](packages/analytics)** - Analytics and tracking
- **[@hanzo/analytics-service](packages/analytics-service)** - Analytics service implementation

### Text Processing

- **[@hanzo/text](packages/text)** - High-level text processing utilities
- **[@hanzo/text-core](packages/text-core)** - Core text processing engine
- **[@hanzo/text-html](packages/text-html)** - HTML text rendering and parsing
- **[@hanzo/text-markdown](packages/text-markdown)** - Markdown support
- **[@hanzo/text-ydoc](packages/text-ydoc)** - Yjs document integration for collaborative editing

### Utilities

- **[@hanzo/query](packages/query)** - Query language and execution engine
- **[@hanzo/storage](packages/storage)** - Storage abstractions and implementations
- **[@hanzo/rank](packages/rank)** - Ranking and ordering utilities
- **[@hanzo/retry](packages/retry)** - Retry logic and resilience patterns
- **[@hanzo/rpc](packages/rpc)** - RPC communication layer
- **[@hanzo/token](packages/token)** - Token management and authentication utilities

## Pre-requisites

Before proceeding, ensure that your system meets the following requirements:

- [Node.js](https://nodejs.org/en/download/) (v20.11.0 or higher is required)
- [Rush](https://rushjs.io/) - Microsoft's scalable monorepo manager

## Installation

You need Microsoft's [rush](https://rushjs.io/) to install the application.

1. Install Rush globally using the command:

```bash
npm install -g @microsoft/rush
```

1. Navigate to the repository root and run the following commands:

```bash
rush install
rush build
```

## Build

To build all packages:

```bash
rush build
```

To rebuild (ignoring cache):

```bash
rush rebuild
```

## Build & Watch

For development purposes, `rush build:watch` action could be used:

```bash
rush build:watch
```

It includes build and validate phases in watch mode.

## Update project structure

If the project's structure is updated, it may be necessary to relink and rebuild the projects:

```bash
rush update
rush build
```

## Troubleshooting

If a build fails, but the code is correct, try to delete the [build cache](https://rushjs.io/pages/maintainer/build_cache/) and retry:

```bash
rm -rf common/temp/build-cache
rush rebuild
```

## Tests

To execute all tests:

```bash
rush test
```

For individual test execution inside a package directory:

```bash
rushx test
```

## Package Publishing

To bump a package version:

```bash
node ./common/scripts/bump.js -p projectName
```

## API Client Usage

If you want to interact with Hanzo Team programmatically, check out the [API Client](packages/api-client/README.md) documentation. The API client provides a typed interface for all Hanzo operations and can be used to build integrations and custom applications.

You can find API usage examples in the [Hanzo examples](https://github.com/hcengineering/hanzo-examples) repository.

## Related Projects

- **[Hanzo Team](https://github.com/hcengineering/platform)** - The main Hanzo Team repository
- **[Hanzo Self-Host](https://github.com/hcengineering/hanzo-selfhost)** - Self-hosting solution for Hanzo Team
- **[Hanzo Examples](https://github.com/hcengineering/hanzo-examples)** - API usage examples

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Licensed under the [EPL-2.0](LICENSE) license.

## Additional Links

- [Hanzo Website](https://hanzo.team/)
- [Documentation](https://docs.hanzo.team/)
- [Community](https://github.com/hcengineering/platform/discussions)

---

© 2025 [Hardcore Engineering Inc](https://hardcoreeng.com/).
