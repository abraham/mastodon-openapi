# mastodon-openapi

This project provides a comprehensive tool for generating OpenAPI schemas from Mastodon's API documentation. Mastodon is a decentralized social networking platform that provides a rich REST API for client applications and integrations. This tool automatically parses Mastodon's entity definitions and API method documentation to produce OpenAPI 3.0.3 compliant schemas, making it easier for developers to build applications, generate client libraries, and maintain accurate API documentation for Mastodon integrations.

## Features

- Parses Mastodon entity files and API method documentation
- Generates OpenAPI 3.0.3 compliant schemas
- Automatic weekly schema updates via GitHub Actions

## Usage

### Generate Schema

```bash
npm run generate
```

This will generate an OpenAPI schema at `dist/schema.json` based on the latest Mastodon documentation.

### Validate Schema

```bash
npm run validate
```

### Run Tests

```bash
npm test
```

## Automatic Updates

The repository includes a weekly GitHub Actions workflow that:

1. Automatically generates a new schema every Sunday at 8:00 AM UTC
2. Compares the new schema with the current one
3. Creates a pull request if changes are detected

The workflow can also be triggered manually from the GitHub Actions page.
