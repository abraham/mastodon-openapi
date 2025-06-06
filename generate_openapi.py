#!/usr/bin/env python3
"""
Mastodon OpenAPI Generator

This script fetches the Mastodon documentation from the mastodon/documentation repository
and generates an OpenAPI 3.0 specification.
"""

import json
import re
import yaml
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from pathlib import Path
import requests

# Constants
MASTODON_DOCS_BASE_URL = "https://api.github.com/repos/mastodon/documentation/contents"
METHODS_PATH = "content/en/methods"
ENTITIES_PATH = "content/en/entities"

@dataclass
class ParameterInfo:
    name: str
    type: str
    description: str
    required: bool = False
    location: str = "query"  # query, path, header, body

@dataclass
class ResponseInfo:
    status_code: str
    description: str
    schema_ref: Optional[str] = None

@dataclass
class EndpointInfo:
    path: str
    method: str
    summary: str
    description: str
    parameters: List[ParameterInfo] = field(default_factory=list)
    responses: List[ResponseInfo] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)

@dataclass
class PropertyInfo:
    name: str
    type: str
    description: str
    required: bool = True
    nullable: bool = False
    format: Optional[str] = None

@dataclass
class EntityInfo:
    name: str
    description: str
    properties: List[PropertyInfo] = field(default_factory=list)

class MastodonDocsParser:
    def __init__(self):
        self.entities: Dict[str, EntityInfo] = {}
        self.endpoints: List[EndpointInfo] = []
        
    def fetch_file_content(self, path: str) -> Optional[str]:
        """Fetch content of a file from GitHub API"""
        url = f"{MASTODON_DOCS_BASE_URL}/{path}"
        try:
            response = requests.get(url)
            response.raise_for_status()
            data = response.json()
            
            if data.get("encoding") == "base64":
                import base64
                content = base64.b64decode(data["content"]).decode("utf-8")
                return content
        except Exception as e:
            print(f"Error fetching {path}: {e}")
        return None
    
    def list_directory(self, path: str) -> List[Dict[str, Any]]:
        """List contents of a directory from GitHub API"""
        url = f"{MASTODON_DOCS_BASE_URL}/{path}"
        try:
            response = requests.get(url)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error listing {path}: {e}")
            return []
    
    def parse_frontmatter_and_content(self, content: str) -> tuple[Dict[str, Any], str]:
        """Parse YAML frontmatter and return metadata and content"""
        if not content.startswith("---"):
            return {}, content
        
        parts = content.split("---", 2)
        if len(parts) < 3:
            return {}, content
        
        try:
            frontmatter = yaml.safe_load(parts[1])
            content_body = parts[2].strip()
            return frontmatter or {}, content_body
        except yaml.YAMLError:
            return {}, content
    
    def parse_entity(self, entity_file: str) -> Optional[EntityInfo]:
        """Parse entity documentation from markdown file"""
        content = self.fetch_file_content(f"{ENTITIES_PATH}/{entity_file}")
        if not content:
            return None
        
        frontmatter, body = self.parse_frontmatter_and_content(content)
        
        entity_name = Path(entity_file).stem
        description = frontmatter.get("description", "")
        
        entity = EntityInfo(name=entity_name, description=description)
        
        # Parse attributes from markdown
        # Look for ### `attribute_name` patterns
        attr_pattern = r'### `([^`]+)`[^#]*?\*\*Description:\*\*\s*([^\n]*)\n.*?\*\*Type:\*\*\s*([^\n]*)\n'
        matches = re.finditer(attr_pattern, body, re.DOTALL | re.IGNORECASE)
        
        for match in matches:
            attr_name = match.group(1)
            description = match.group(2).strip()
            type_info = match.group(3).strip()
            
            # Parse type information
            nullable = "nullable" in type_info.lower() or "null" in type_info.lower()
            
            # Map Mastodon types to OpenAPI types
            if "String" in type_info:
                attr_type = "string"
                format_type = None
                if "URL" in type_info:
                    format_type = "uri"
                elif "Datetime" in type_info:
                    format_type = "date-time"
            elif "Integer" in type_info:
                attr_type = "integer"
                format_type = None
            elif "Boolean" in type_info:
                attr_type = "boolean"
                format_type = None
            elif "Array" in type_info:
                attr_type = "array"
                format_type = None
            elif "Hash" in type_info:
                attr_type = "object"
                format_type = None
            else:
                attr_type = "string"
                format_type = None
            
            entity.properties.append(PropertyInfo(
                name=attr_name,
                type=attr_type,
                description=description,
                nullable=nullable,
                format=format_type
            ))
        
        return entity
    
    def parse_method_file(self, method_path: str, http_method: str) -> Optional[EndpointInfo]:
        """Parse API method documentation from markdown file"""
        content = self.fetch_file_content(method_path)
        if not content:
            return None
        
        frontmatter, body = self.parse_frontmatter_and_content(content)
        
        # Extract path from the file structure
        # e.g., "content/en/methods/accounts/GET.md" -> "/api/v1/accounts"
        path_parts = method_path.split("/")
        if len(path_parts) >= 4 and path_parts[2] == "methods":
            api_section = path_parts[3]
            # Convert to API path
            api_path = f"/api/v1/{api_section}"
        else:
            api_path = "/api/v1/unknown"
        
        title = frontmatter.get("title", "")
        description = frontmatter.get("description", "")
        
        endpoint = EndpointInfo(
            path=api_path,
            method=http_method.lower(),
            summary=title,
            description=description,
            tags=[api_section] if 'api_section' in locals() else []
        )
        
        # Parse parameters from content
        # Look for parameter tables or descriptions
        param_pattern = r'\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]*)\s*\|'
        for match in re.finditer(param_pattern, body):
            param_name = match.group(1).strip()
            param_type = match.group(2).strip()
            param_desc = match.group(3).strip()
            param_required = match.group(4).strip().lower() == "required"
            
            if param_name and param_name != "Name":  # Skip table headers
                endpoint.parameters.append(ParameterInfo(
                    name=param_name,
                    type=param_type.lower() if param_type.lower() in ["string", "integer", "boolean"] else "string",
                    description=param_desc,
                    required=param_required
                ))
        
        # Add basic success response
        endpoint.responses.append(ResponseInfo(
            status_code="200",
            description="Success"
        ))
        
        return endpoint
    
    def parse_all_entities(self):
        """Parse all entity documentation"""
        entities = self.list_directory(ENTITIES_PATH)
        for entity in entities:
            if entity["type"] == "file" and entity["name"].endswith(".md"):
                parsed_entity = self.parse_entity(entity["name"])
                if parsed_entity:
                    self.entities[parsed_entity.name] = parsed_entity
                    print(f"Parsed entity: {parsed_entity.name}")
    
    def parse_all_methods(self):
        """Parse all API method documentation"""
        methods_dirs = self.list_directory(METHODS_PATH)
        
        for method_dir in methods_dirs:
            if method_dir["type"] == "dir":
                # List files in the method directory
                method_files = self.list_directory(f"{METHODS_PATH}/{method_dir['name']}")
                
                for method_file in method_files:
                    if method_file["type"] == "file" and method_file["name"].endswith(".md"):
                        http_method = Path(method_file["name"]).stem
                        if http_method.upper() in ["GET", "POST", "PUT", "PATCH", "DELETE"]:
                            method_path = f"{METHODS_PATH}/{method_dir['name']}/{method_file['name']}"
                            endpoint = self.parse_method_file(method_path, http_method)
                            if endpoint:
                                self.endpoints.append(endpoint)
                                print(f"Parsed endpoint: {endpoint.method.upper()} {endpoint.path}")
    
    def generate_openapi_spec(self) -> Dict[str, Any]:
        """Generate OpenAPI 3.0 specification"""
        spec = {
            "openapi": "3.0.3",
            "info": {
                "title": "Mastodon API",
                "description": "API for Mastodon, a decentralized social network",
                "version": "4.3.0",
                "contact": {
                    "name": "Mastodon Project",
                    "url": "https://joinmastodon.org"
                },
                "license": {
                    "name": "AGPL-3.0",
                    "url": "https://github.com/mastodon/mastodon/blob/main/LICENSE"
                }
            },
            "servers": [
                {
                    "url": "https://{instance}",
                    "description": "Mastodon instance",
                    "variables": {
                        "instance": {
                            "default": "mastodon.social",
                            "description": "The domain of your Mastodon instance"
                        }
                    }
                }
            ],
            "paths": {},
            "components": {
                "schemas": {},
                "securitySchemes": {
                    "OAuth2": {
                        "type": "oauth2",
                        "flows": {
                            "authorizationCode": {
                                "authorizationUrl": "https://{instance}/oauth/authorize",
                                "tokenUrl": "https://{instance}/oauth/token",
                                "scopes": {
                                    "read": "Read access",
                                    "write": "Write access",
                                    "follow": "Follow users",
                                    "push": "Push notifications"
                                }
                            }
                        }
                    },
                    "BearerAuth": {
                        "type": "http",
                        "scheme": "bearer"
                    }
                }
            }
        }
        
        # Add schemas for entities
        for entity_name, entity in self.entities.items():
            properties = {}
            required_props = []
            
            for prop in entity.properties:
                prop_schema = {
                    "type": prop.type,
                    "description": prop.description
                }
                
                if prop.format:
                    prop_schema["format"] = prop.format
                
                if prop.nullable:
                    prop_schema["nullable"] = True
                
                if prop.type == "array":
                    prop_schema["items"] = {"type": "string"}  # Default, should be more specific
                
                properties[prop.name] = prop_schema
                
                if prop.required:
                    required_props.append(prop.name)
            
            spec["components"]["schemas"][entity_name] = {
                "type": "object",
                "description": entity.description,
                "properties": properties
            }
            
            if required_props:
                spec["components"]["schemas"][entity_name]["required"] = required_props
        
        # Add paths for endpoints
        for endpoint in self.endpoints:
            if endpoint.path not in spec["paths"]:
                spec["paths"][endpoint.path] = {}
            
            parameters = []
            for param in endpoint.parameters:
                param_schema = {
                    "name": param.name,
                    "in": param.location,
                    "description": param.description,
                    "required": param.required,
                    "schema": {"type": param.type}
                }
                parameters.append(param_schema)
            
            responses = {}
            for response in endpoint.responses:
                resp_schema = {"description": response.description}
                if response.schema_ref:
                    resp_schema["content"] = {
                        "application/json": {
                            "schema": {"$ref": f"#/components/schemas/{response.schema_ref}"}
                        }
                    }
                responses[response.status_code] = resp_schema
            
            operation = {
                "summary": endpoint.summary,
                "description": endpoint.description,
                "tags": endpoint.tags,
                "parameters": parameters,
                "responses": responses,
                "security": [{"BearerAuth": []}]
            }
            
            spec["paths"][endpoint.path][endpoint.method] = operation
        
        return spec

def main():
    parser = MastodonDocsParser()
    
    print("Fetching and parsing Mastodon documentation...")
    print("Parsing entities...")
    parser.parse_all_entities()
    
    print("Parsing API methods...")
    parser.parse_all_methods()
    
    print("Generating OpenAPI specification...")
    spec = parser.generate_openapi_spec()
    
    # Write to file
    output_file = "mastodon-openapi.yaml"
    with open(output_file, "w") as f:
        yaml.dump(spec, f, default_flow_style=False, sort_keys=False)
    
    print(f"OpenAPI specification generated: {output_file}")
    print(f"Found {len(parser.entities)} entities and {len(parser.endpoints)} endpoints")

if __name__ == "__main__":
    main()