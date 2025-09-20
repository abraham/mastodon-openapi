/**
 * Interface representing an enum occurrence
 */
interface EnumOccurrence {
  entityName?: string;
  propertyName?: string;
  methodPath?: string;
  parameterName?: string;
  enumValues: any[];
}

/**
 * Interface representing duplicate enum information
 */
interface DuplicateEnumInfo {
  enumSignature: string;
  enumValues: any[];
  occurrences: EnumOccurrence[];
  sharedComponentName?: string;
}

/**
 * Generator for tracking and reporting duplicate enums
 */
export class EnumTallyGenerator {
  private enumOccurrences = new Map<string, EnumOccurrence[]>();

  /**
   * Track an enum occurrence during schema generation
   */
  public trackEnum(
    enumValues: any[],
    entityName?: string,
    propertyName?: string,
    methodPath?: string,
    parameterName?: string
  ): void {
    const enumSignature = JSON.stringify([...enumValues].sort());

    if (!this.enumOccurrences.has(enumSignature)) {
      this.enumOccurrences.set(enumSignature, []);
    }

    this.enumOccurrences.get(enumSignature)!.push({
      entityName,
      propertyName,
      methodPath,
      parameterName,
      enumValues,
    });
  }

  /**
   * Get all duplicate enums (those that appear more than once)
   */
  public getDuplicateEnums(): DuplicateEnumInfo[] {
    const duplicates: DuplicateEnumInfo[] = [];

    for (const [enumSignature, occurrences] of this.enumOccurrences) {
      if (occurrences.length > 1) {
        duplicates.push({
          enumSignature,
          enumValues: occurrences[0].enumValues,
          occurrences,
        });
      }
    }

    // Sort by number of occurrences (descending)
    return duplicates.sort(
      (a, b) => b.occurrences.length - a.occurrences.length
    );
  }

  /**
   * Generate ENUMS.md content
   */
  public generateEnumsMarkdown(): string {
    const duplicates = this.getDuplicateEnums();

    if (duplicates.length === 0) {
      return '# Enum Duplicates\n\nNo duplicate enums found.\n';
    }

    let markdown = '# Enum Duplicates\n\n';
    markdown += `This document lists all enums that have the same values and appear in multiple places.\n\n`;
    markdown += `**Total duplicate enum patterns found:** ${duplicates.length}\n\n`;

    for (const duplicate of duplicates) {
      markdown += `## Enum: ${this.formatEnumValues(duplicate.enumValues)}\n\n`;
      markdown += `**Values:** \`${JSON.stringify(duplicate.enumValues)}\`\n\n`;
      markdown += `**Occurs in ${duplicate.occurrences.length} places:**\n\n`;

      for (const occurrence of duplicate.occurrences) {
        if (occurrence.entityName && occurrence.propertyName) {
          markdown += `- Entity: \`${occurrence.entityName}\` → Property: \`${occurrence.propertyName}\`\n`;
        } else if (occurrence.methodPath && occurrence.parameterName) {
          markdown += `- Method: \`${occurrence.methodPath}\` → Parameter: \`${occurrence.parameterName}\`\n`;
        } else {
          markdown += `- Unknown location\n`;
        }
      }

      markdown += '\n';
    }

    return markdown;
  }

  /**
   * Format enum values for display
   */
  private formatEnumValues(enumValues: any[]): string {
    if (enumValues.length <= 3) {
      return enumValues.join(', ');
    }
    return `${enumValues.slice(0, 3).join(', ')}, ... (${enumValues.length} values)`;
  }

  /**
   * Clear all tracked enums (useful for testing)
   */
  public clear(): void {
    this.enumOccurrences.clear();
  }
}
