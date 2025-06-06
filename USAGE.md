# Usage Examples

## OpenAPI Specification Usage

The generated `mastodon-openapi.yaml` and `mastodon-openapi.json` files can be used with various tools and frameworks:

### 1. API Documentation

Use with [Swagger UI](https://swagger.io/tools/swagger-ui/) to generate interactive documentation:

```bash
# Using Docker
docker run -p 8080:8080 -e SWAGGER_JSON=/mastodon-openapi.json -v $(pwd):/usr/share/nginx/html swaggerapi/swagger-ui

# Using online editor
# Upload mastodon-openapi.yaml to https://editor.swagger.io/
```

### 2. Code Generation

Generate client libraries for various programming languages:

```bash
# Install OpenAPI Generator
npm install @openapitools/openapi-generator-cli -g

# Generate Python client
openapi-generator-cli generate -i mastodon-openapi.yaml -g python -o ./python-client

# Generate JavaScript client
openapi-generator-cli generate -i mastodon-openapi.yaml -g javascript -o ./js-client

# Generate Java client
openapi-generator-cli generate -i mastodon-openapi.yaml -g java -o ./java-client
```

### 3. API Testing

Use with testing tools like [Postman](https://www.postman.com/) or [Insomnia](https://insomnia.rest/):

1. Import `mastodon-openapi.json` into your testing tool
2. Configure the server variable `instance` to your Mastodon instance
3. Set up authentication (OAuth2 or Bearer token)
4. Start testing API endpoints

### 4. Validation

Validate API requests and responses:

```python
# Python example using openapi-core
from openapi_core import create_spec
from openapi_core.validation.request.validators import RequestValidator
from openapi_core.validation.response.validators import ResponseValidator

# Load the spec
spec = create_spec('mastodon-openapi.yaml')

# Create validators
request_validator = RequestValidator(spec)
response_validator = ResponseValidator(spec)

# Validate your API calls
```

### 5. Mock Servers

Create mock servers for development:

```bash
# Using Prism
npm install -g @stoplight/prism-cli
prism mock mastodon-openapi.yaml

# Using Docker
docker run --init --rm -p 4010:4010 stoplight/prism:4 mock -h 0.0.0.0 mastodon-openapi.yaml
```

## Example API Usage

Here are some common API patterns defined in the specification:

### Authentication

```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&client_id=CLIENT_ID&client_secret=CLIENT_SECRET&code=CODE&redirect_uri=REDIRECT_URI
```

### Get Account Information

```http
GET /api/v1/accounts/verify_credentials
Authorization: Bearer ACCESS_TOKEN
```

### Post a Status

```http
POST /api/v1/statuses
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "status": "Hello, Mastodon! 🐘",
  "visibility": "public"
}
```

### Get Home Timeline

```http
GET /api/v1/timelines/home?limit=20
Authorization: Bearer ACCESS_TOKEN
```

## Server Configuration

The specification uses server variables for different Mastodon instances:

```yaml
servers:
  - url: https://{instance}
    variables:
      instance:
        default: mastodon.social
        description: The domain of your Mastodon instance
```

Common instances:
- `mastodon.social` (default)
- `mastodon.online`
- `fosstodon.org`
- `mas.to`
- Or your own instance URL