#!/usr/bin/env python3
"""
OpenAPI Validator

Simple validation tool for the generated OpenAPI specification.
"""

import yaml
import json
from pathlib import Path

def validate_openapi_spec(file_path: str):
    """Validate OpenAPI specification file"""
    path = Path(file_path)
    
    if not path.exists():
        print(f"❌ File not found: {file_path}")
        return False
    
    try:
        # Load and parse the file
        if path.suffix.lower() == '.yaml' or path.suffix.lower() == '.yml':
            with open(path, 'r') as f:
                spec = yaml.safe_load(f)
        elif path.suffix.lower() == '.json':
            with open(path, 'r') as f:
                spec = json.load(f)
        else:
            print(f"❌ Unsupported file format: {path.suffix}")
            return False
        
        # Basic OpenAPI validation
        required_fields = ['openapi', 'info', 'paths']
        for field in required_fields:
            if field not in spec:
                print(f"❌ Missing required field: {field}")
                return False
        
        # Check OpenAPI version
        if not spec['openapi'].startswith('3.'):
            print(f"❌ Unsupported OpenAPI version: {spec['openapi']}")
            return False
        
        # Validate info section
        info_required = ['title', 'version']
        for field in info_required:
            if field not in spec['info']:
                print(f"❌ Missing required info field: {field}")
                return False
        
        # Count components
        paths_count = len(spec.get('paths', {}))
        schemas_count = len(spec.get('components', {}).get('schemas', {}))
        
        print(f"✅ OpenAPI specification is valid")
        print(f"   Version: {spec['openapi']}")
        print(f"   Title: {spec['info']['title']}")
        print(f"   API Version: {spec['info']['version']}")
        print(f"   Paths: {paths_count}")
        print(f"   Schemas: {schemas_count}")
        
        # List all tags
        tags = set()
        for path_obj in spec['paths'].values():
            for operation in path_obj.values():
                if isinstance(operation, dict) and 'tags' in operation:
                    tags.update(operation['tags'])
        
        print(f"   Tags: {', '.join(sorted(tags))}")
        
        return True
        
    except yaml.YAMLError as e:
        print(f"❌ YAML parsing error: {e}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing error: {e}")
        return False
    except Exception as e:
        print(f"❌ Validation error: {e}")
        return False

def main():
    print("Mastodon OpenAPI Specification Validator")
    print("=" * 50)
    
    # Validate both files
    files = ['mastodon-openapi.yaml', 'mastodon-openapi.json']
    
    for file_path in files:
        print(f"\nValidating {file_path}:")
        validate_openapi_spec(file_path)

if __name__ == "__main__":
    main()