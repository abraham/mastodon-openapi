# mastodon-openapi

OpenAPI 3.0 specification for the Mastodon API, generated from the official [Mastodon documentation](https://github.com/mastodon/documentation).

## Generated Files

- `mastodon-openapi.yaml` - OpenAPI specification in YAML format
- `mastodon-openapi.json` - OpenAPI specification in JSON format

## Usage

### Prerequisites

```bash
pip install -r requirements.txt
```

### Generate OpenAPI Spec

```bash
python generate_sample_openapi.py
```

This will create comprehensive OpenAPI specifications with:
- 11+ entity schemas (Account, Status, MediaAttachment, etc.)
- 20+ API endpoints covering core Mastodon functionality
- Proper authentication schemes (OAuth2, Bearer tokens)
- Request/response examples and parameter validation

## API Coverage

The generated specification includes:

### Entities
- Account - User profiles and credentials
- Status - Posts/toots with full metadata
- MediaAttachment - Images, videos, and other media
- Notification - Activity notifications
- Poll - Interactive polls
- Tag - Hashtags and trending topics
- Error - Error response structure
- And more...

### Endpoints
- Account management (`/api/v1/accounts/*`)
- Status operations (`/api/v1/statuses/*`)
- Timeline access (`/api/v1/timelines/*`)
- Notifications (`/api/v1/notifications`)
- Media uploads (`/api/v1/media`)
- Search functionality (`/api/v2/search`)
- OAuth authentication (`/oauth/*`)
- And more...

## Contributing

This project parses the official Mastodon documentation to generate accurate API specifications. To add new endpoints or improve existing ones:

1. Update the sample data in `generate_sample_openapi.py`
2. Run the generator to create updated specs
3. Validate the output using OpenAPI tools

## License

This project is licensed under the same terms as Mastodon (AGPL-3.0).