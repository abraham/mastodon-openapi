# Enum Name Deduplication Strategy

## Problem

The current enum naming approach in the OpenAPI generator creates names like `FilterContextEnum`, `NotificationTypeEnum`, etc., which can lead to:

1. **Naming conflicts**: Different entities with the same property names could generate identical enum component names
2. **Unpredictable names**: The naming depends on which entity is processed first during deduplication
3. **Hard-coded cases**: Special logic needed to handle edge cases and avoid conflicts
4. **Non-descriptive names**: Names based on first occurrence may not represent all use cases

## Current Implementation Issues

The current implementation has two different naming approaches:
- `generateEntityEnumComponentName`: Creates `{Entity}{Property}Enum` 
- `generateSharedEnumComponentName`: Parses context strings and creates similar names

This dual approach can create inconsistent naming and doesn't guarantee uniqueness.

## Proposed Solution: Content-Based Naming

### Strategy: Generate enum names based on the actual enum values rather than their usage context

**Algorithm:**
1. **Generate a semantic name** from the enum values themselves
2. **Add a hash suffix** to guarantee uniqueness 
3. **Use consistent naming** regardless of where the enum appears first

### Implementation Approach

```typescript
private generateContentBasedEnumName(enumValues: any[]): string {
  // 1. Create a semantic name from the enum values
  const semanticName = this.generateSemanticEnumName(enumValues);
  
  // 2. Create a short hash from the sorted enum values for uniqueness
  const valueHash = this.createHashFromValues(enumValues);
  
  // 3. Combine semantic name with hash
  return `${semanticName}Enum_${valueHash}`;
}

private generateSemanticEnumName(enumValues: any[]): string {
  // Sort values for consistency
  const sortedValues = [...enumValues].sort();
  
  // Try to infer semantic meaning from common patterns
  if (this.isVisibilityEnum(sortedValues)) return 'Visibility';
  if (this.isNotificationEnum(sortedValues)) return 'NotificationType';  
  if (this.isStatusEnum(sortedValues)) return 'Status';
  if (this.isSeverityEnum(sortedValues)) return 'Severity';
  if (this.isActionEnum(sortedValues)) return 'Action';
  if (this.isTypeEnum(sortedValues)) return 'Type';
  if (this.isPolicyEnum(sortedValues)) return 'Policy';
  if (this.isCategoryEnum(sortedValues)) return 'Category';
  
  // Fallback: use first few values to create a descriptive name
  const prefix = sortedValues.slice(0, 2)
    .map(val => this.toPascalCase(String(val)))
    .join('');
  
  return prefix || 'Mixed';
}

private createHashFromValues(enumValues: any[]): string {
  const signature = JSON.stringify([...enumValues].sort());
  return this.createShortHash(signature);
}

// Pattern detection methods (simple heuristics)
private isVisibilityEnum(values: any[]): boolean {
  const visibilityKeywords = ['public', 'private', 'unlisted', 'direct'];
  return values.some(val => visibilityKeywords.includes(String(val).toLowerCase()));
}

private isNotificationEnum(values: any[]): boolean {
  const notificationKeywords = ['mention', 'follow', 'reblog', 'favourite'];
  return values.some(val => notificationKeywords.includes(String(val).toLowerCase()));
}

// ... additional pattern detection methods
```

### Example Results

**Current naming:**
- `FilterContextEnum` (based on first occurrence in Filter entity)
- `NotificationTypeEnum` (based on first occurrence in notification parameter)

**Proposed naming:**
- `ContextEnum_a1b2c3` (semantic name + unique hash)
- `NotificationTypeEnum_d4e5f6` (semantic name + unique hash)

### Benefits

1. **Predictable**: Same enum values always generate the same name
2. **Unique**: Hash suffix prevents naming conflicts
3. **Semantic**: Names reflect the actual content/purpose of the enum
4. **Simple**: No special cases or complex context parsing needed
5. **Maintainable**: Easy to understand and modify the naming logic

### Migration Strategy

1. **Phase 1**: Implement the new naming algorithm alongside the existing one
2. **Phase 2**: Use feature flag to switch between old and new naming
3. **Phase 3**: Update tests and validate generated schemas
4. **Phase 4**: Remove old naming code after validation

### Alternative Approaches Considered

1. **Hash-only naming** (`Enum_a1b2c3`): Simple but not human-readable
2. **Value-based naming** (`PublicPrivateDirectEnum`): Can create very long names
3. **Domain-specific naming** (`MastodonVisibilityEnum`): Requires domain knowledge hard-coding

The content-based approach with semantic detection provides the best balance of predictability, readability, and uniqueness.