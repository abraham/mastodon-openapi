# mastodon-openapi

A tool for generating OpenAPI schemas from the [Mastodon](https://joinmastodon.org/) [API documentation](https://github.com/mastodon/documentation). Created for for the [mastodon](https://github.com/abraham/mastodon-dart) dart package.

## Goal

Generate the most accurate OpenAPI spec for the current stable release of Mastodon.

## Features

- Parses Mastodon entity files and API method documentation
- Generates OpenAPI 3.1.0 compliant schemas
- Automatic weekly schema updates via GitHub Actions

## Usage

### Update documentation version

```bash
npm run update-docs
```

Updates `mastodonDocsCommit` and `mastodonSecurityCommit` in `config.json`, then re-applies
the documentation overrides and re-downloads the pinned `SECURITY.md`.

### Supported versions

The Mastodon version range targeted by the schema is read from
[mastodon/mastodon `SECURITY.md`](https://github.com/mastodon/mastodon/blob/main/SECURITY.md),
pinned by `config.json#mastodonSecurityCommit` and vendored into `mastodon-security/` by
`npm run setup-security-policy` (also run on `postinstall`). Rows marked with an expiry date
count as supported regardless of the date, so generation depends only on the pinned commit
and never on the current date.

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
