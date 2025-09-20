import { EntityParser } from '../parsers/EntityParser';
import { OpenAPIGenerator } from '../generators/OpenAPIGenerator';

describe('Debug enum value truncation', () => {
  it('should trace where enum values get lost during conversion', () => {
    const parser = new EntityParser();
    const entities = parser.parseAllEntities();

    // Find both entities
    const notificationGroup = entities.find((e: any) => e.name === 'NotificationGroup');
    const notification = entities.find((e: any) => e.name === 'Notification');

    const ngTypeAttr = notificationGroup?.attributes.find((a: any) => a.name === 'type');
    const nTypeAttr = notification?.attributes.find((a: any) => a.name === 'type');

    console.log('1. Parsed entities:');
    console.log('NotificationGroup type enum:', ngTypeAttr?.enumValues?.length, 'values');
    console.log('Notification type enum:', nTypeAttr?.enumValues?.length, 'values');
    
    // Check if enum values are identical
    const ngEnums = [...(ngTypeAttr?.enumValues || [])].sort();
    const nEnums = [...(nTypeAttr?.enumValues || [])].sort();
    
    console.log('\\nEnum signature comparison:');
    console.log('NotificationGroup signature:', JSON.stringify(ngEnums));
    console.log('Notification signature:', JSON.stringify(nEnums));
    console.log('Signatures equal:', JSON.stringify(ngEnums) === JSON.stringify(nEnums));

    // Test full OpenAPIGenerator
    console.log('\\n2. Full OpenAPIGenerator:');
    const generator = new OpenAPIGenerator();
    const fullSchema = generator.generateSchema(entities, []);
    
    const ngEnum = (fullSchema.components?.schemas?.NotificationGroupTypeEnum as any);
    const nEnum = (fullSchema.components?.schemas?.NotificationTypeEnum as any);
    
    console.log('NotificationGroupTypeEnum:', ngEnum?.enum?.length, 'values');
    console.log('NotificationTypeEnum:', nEnum?.enum?.length, 'values');
    
    if (ngEnum?.enum) {
      console.log('NotificationGroupTypeEnum values:', ngEnum.enum);
    }
    
    if (nEnum?.enum) {
      console.log('NotificationTypeEnum values:', nEnum.enum);
    }
  });
});