# mastodon-openapi

A tool for generating OpenAPI schemas from the [Mastodon](https://joinmastodon.org/) [API documentation](https://github.com/mastodon/documentation).

## Goal

Generate the most accurate OpenAPI spec for the current stable release of Mastodon.

## Features

- Parses Mastodon entity files and API method documentation
- Generates OpenAPI 3.1.0 compliant schemas
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

### Start Development Server

```bash
npm start
```

## Automatic Updates

The repository includes a weekly GitHub Actions workflow that:

1. Automatically generates a new schema every Sunday at 8:00 AM UTC
2. Compares the new schema with the current one
3. Creates a pull request if changes are detected

The workflow can also be triggered manually from the GitHub Actions page.
