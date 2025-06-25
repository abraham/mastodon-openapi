# Special Handling Cases - Override Documentation

This document lists all special cases where the code overrides parsed documentation to ensure correct OpenAPI schema generation.

## Entity Attribute Special Cases

### Nullable Field Overrides

- **Account#hide_collections**: Always marked as nullable due to servers returning null values
  - Location: `src/parsers/AttributeParser.ts:110-113, 229-232`
  - Reason: Mastodon servers inconsistently return null for this field

- **Rule#translations**: Always marked as nullable
  - Location: `src/parsers/AttributeParser.ts:115-118`
  - Reason: Special exception for translation field handling

- **Relationship#languages**: Always marked as nullable
  - Location: `src/parsers/AttributeParser.ts:120-123, 235-238`
  - Reason: Language preferences can be null

### Entity Exclusions

- **Suggestion#source**: Completely excluded from Suggestion entity
  - Location: `src/parsers/AttributeParser.ts:47-50`
  - Reason: Special exception to prevent parsing issues

### Hugo Shortcode Handling

- **{{%nullable%}}**: Detected in type strings to mark fields as nullable
  - Location: `src/parsers/AttributeParser.ts:79, 198`
  - Reason: Parse Hugo shortcode annotations

- **{{%optional%}}**: Detected in headers to mark fields as optional
  - Location: `src/parsers/AttributeParser.ts:167`
  - Reason: Parse Hugo shortcode annotations

- **{{%deprecated%}}**: Detected to mark fields as deprecated
  - Location: `src/parsers/AttributeParser.ts:99, 218`
  - Reason: Parse Hugo shortcode annotations

- **{{%removed%}}**: Skip parsing attributes marked as removed
  - Location: `src/parsers/AttributeParser.ts:42-45, 187-190`
  - Reason: Don't include removed attributes in schema

## Method Parsing Special Cases

### Method Filtering

- **Draft Files**: Skip parsing files marked as draft
  - Location: `src/parsers/MethodParser.ts:57-60, EntityFileParser.ts:21-24, MethodEntityParser.ts:19-22`
  - Reason: Don't include draft content in schema

- **{{%removed%}} Methods**: Skip methods marked as removed
  - Location: `src/parsers/MethodParser.ts:118-121`
  - Reason: Don't include removed methods in schema

- **{{%deprecated%}} Methods**: Mark methods as deprecated but still include them
  - Location: `src/parsers/MethodParser.ts:123-124, 175, 200`
  - Reason: Include deprecated methods with proper marking

### Method-Specific Handling

- **POST /api/v1/statuses**: Special request body handling
  - Location: `src/generators/MethodConverter.ts:318+`
  - Reason: Complex parameter structure for status creation

- **POST /api/v1/apps**: Override redirect_uris to always be array
  - Location: `src/generators/MethodConverter.ts:351-360`
  - Reason: API expects array format, not oneOf

- **Media Upload Endpoints**: Use multipart/form-data content type
  - Location: `src/generators/MethodConverter.ts:67, 391+`
  - Reason: File uploads require multipart encoding

### Media Upload Content Type

- **Multipart Form Data Detection**: Detect media upload parameters
  - Location: `src/generators/MethodConverter.ts:62`
  - Pattern: Parameters with descriptions containing "multipart form data"
  - Reason: Switch content type from application/json to multipart/form-data

- **Media Upload Content Type**: Use multipart/form-data for file uploads
  - Location: `src/generators/MethodConverter.ts:392+`
  - Reason: File uploads require multipart encoding for proper handling

### Array Item Enum Handling

- **Enum on Array Items**: Place enum values on array items, not array itself
  - Location: `src/generators/EntityConverter.ts:440-442, 449-451`
  - Reason: Correct OpenAPI schema structure for array enums

### Nested Property Handling

- **Bracket Notation**: Handle "alerts[admin.sign_up]" bracket patterns
  - Location: `src/generators/EntityConverter.ts:574, 726`
  - Example: "alerts[admin.sign_up]" creates nested property structure
  - Reason: Support complex nested parameter names

- **Required Parent Fields**: Add parent to required if it has required children
  - Location: `src/generators/EntityConverter.ts:784, 792-794`
  - Reason: Ensure parent objects exist when children are required

### Response Example Handling

- **JSON Parsing Failures**: Skip examples that fail to parse, don't break build
  - Location: `src/parsers/ExampleParser.ts:136-140`
  - Reason: Graceful degradation for invalid JSON

- **Comment Stripping**: Remove // comments from JSON examples
  - Location: `src/parsers/ExampleParser.ts:11-77`
  - Reason: Clean up documentation comments in examples

- **Trailing Comma Handling**: Remove trailing commas after comment removal
  - Location: `src/parsers/ExampleParser.ts:62`
  - Reason: Fix JSON syntax after comment processing

## Type Inference Special Cases

### Format Overrides

- **client_secret_expires_at**: Always integer type (not date-time)
  - Location: `src/generators/EntityConverter.ts:369-374`
  - Reason: Field always returns 0, not a real timestamp

- **\_at Properties**: Apply date-time format to timestamp fields
  - Location: `src/generators/EntityConverter.ts:376-385`
  - Exception: client_secret_expires_at excluded
  - Reason: Standardize timestamp field formats

- **Email Fields**: Apply email format to email-related fields
  - Location: `src/generators/EntityConverter.ts:387-411`
  - Reason: Improve validation for email addresses
  - Exclusions: hash fields, IDs, domains, counts, confirmation emails

### Type Pattern Handling

- **redirect_uris Parameter**: Special handling for "String or Array of Strings"
  - Location: `src/generators/TypeParser.ts:267-275`
  - Reason: Common pattern that needs specific handling

- **OAuth Scopes**: Use shared OAuthScopes component
  - Location: `src/generators/EntityConverter.ts:413-433`
  - Reason: Standardize OAuth scope representation

### Entity Reference Overrides

- **OEmbed**: Use simplified "OEmbedResponse" name
  - Location: `src/generators/TypeParser.ts:546-549, MethodEntityParser.ts:166`
  - Reason: Cleaner schema component naming

## Enum Handling Special Cases

### Well-known Enums

- **FilterContext**: Special name for 'context' property enums
  - Location: `src/generators/OpenAPIGenerator.ts:288-290, EntityConverter.ts:330-332`
  - Reason: More descriptive enum name

- **NotificationTypeEnum**: Special name for notification type enums
  - Location: `src/generators/OpenAPIGenerator.ts:302`
  - Reason: Context-specific enum naming

### Enum Deduplication

- **Shared Enum Components**: Override individual enums with shared components
  - Location: `src/generators/OpenAPIGenerator.ts:445`
  - Reason: Reduce schema duplication

## Text Processing Special Cases

### Markdown Cleaning

- **Bold Markup Removal**: Strip \*\* formatting
  - Location: `src/parsers/TextUtils.ts:11, EntityParsingUtils.ts`
  - Reason: Clean text for schema descriptions

- **Hugo Shortcode Removal**: Strip {{<shortcode>}} patterns
  - Location: `src/parsers/TextUtils.ts:12`
  - Reason: Remove Hugo-specific markup

- **Entity Link Preservation**: Convert [Entity](link) to [Entity]
  - Location: `src/parsers/TextUtils.ts:14`
  - Reason: Keep type information, remove links

- **Trailing Backslash Removal**: Strip trailing backslashes
  - Location: `src/parsers/TextUtils.ts:15`
  - Reason: Clean up line continuation markup

### Description Prefix Removal

- **Type Prefixes**: Remove "String.", "Boolean.", "Array of String.", etc.
  - Location: `src/parsers/EntityParsingUtils.ts:11-15`
  - Reason: Redundant with OpenAPI type information

- **Complex Type Patterns**: Remove "String or Array of..." patterns
  - Location: `src/parsers/EntityParsingUtils.ts`
  - Reason: Handled by oneOf schema structures

## OAuth Scope Special Cases

### Deprecated Scopes

- **follow Scope**: Marked as deprecated
  - Location: `src/parsers/OAuthScopeParser.ts:54`
  - Reason: Scope has been deprecated in favor of granular scopes

### Scope Filtering

- **High-level Scopes**: Skip processing scopes without colons
  - Location: `src/parsers/OAuthScopeParser.ts:118-119`
  - Reason: Focus on granular scopes only

- **Empty Lines**: Skip table separators and empty lines
  - Location: `src/parsers/OAuthScopeParser.ts:103-106`
  - Reason: Clean table parsing

## Operation ID Generation

### Endpoint-Specific Cases

- **familiar_followers**: Special operation ID handling
  - Location: `src/generators/LinkGenerator.ts:468, 510, MethodConverter.ts:704-706`
  - Reason: Avoid naming conflicts for unique endpoint

## Version Handling

### Version Fallbacks

- **Default Version**: Fallback to "4.2.0" when no version found
  - Location: `src/parsers/VersionParser.ts:73`
  - Reason: Ensure all operations have a version

### Version-based Nullability

- **Newer Version Attributes**: Mark as nullable if added in unsupported version
  - Location: `src/parsers/AttributeParser.ts:260-265`
  - Reason: Handle version compatibility gracefully

## Parameter Parsing Special Cases

### Section Filtering

- **Empty Sections**: Skip sections without parameter definitions
  - Location: `src/parsers/ParameterParser.ts:266-270`
  - Reason: Avoid processing non-parameter content

- **Header Conflicts**: Skip sections containing other headers
  - Location: `src/parsers/ParameterParser.ts:272-274`
  - Reason: Prevent over-capturing content

## Hash Attribute Type Cleaning

### Type Information Removal

- **Cast Information**: Remove type casting info from hash attribute types
  - Location: `src/parsers/MethodParser.ts:244-246`
  - Example: "String (cast from an integer)" → "String"
  - Reason: Simplify type information for OpenAPI schema

- **UNIX Timestamp Info**: Remove timestamp format info from hash attribute types
  - Location: `src/parsers/MethodParser.ts:244-246`
  - Example: "String (UNIX Timestamp)" → "String"
  - Reason: Type format is handled separately in OpenAPI

## Entity Duplication Prevention

### Entity Processing

- **Duplicate Prevention**: Skip entities already processed
  - Location: `src/parsers/EntityFileParser.ts:153-156`
  - Reason: Avoid duplicate schema components

## Schema Component Naming

### Component Name Rules

- **Schema Name Validation**: Must match pattern `^[a-zA-Z0-9\.\-_]+$`
  - Location: `src/generators/UtilityHelpers.ts:48`
  - Reason: OpenAPI specification requirement

### Metadata Entity Handling

- **Metadata Suffix Detection**: Detect entities ending with "metadata"
  - Location: `src/parsers/MethodEntityParser.ts:146`
  - Example: "OEmbed metadata", "Server metadata"
  - Reason: Consistent entity naming patterns

## OAuth Configuration

### Scope Selection

- **Client Credentials**: Include high-level and non-user-specific scopes
  - Location: `src/generators/SpecBuilder.ts:26`
  - Reason: Different OAuth flows require different scope sets

---

_Note: This document should be updated when new special cases are added to maintain accuracy._
