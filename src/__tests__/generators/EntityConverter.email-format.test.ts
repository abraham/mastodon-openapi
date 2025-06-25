import { EntityConverter } from '../../generators/EntityConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { EntityAttribute } from '../../interfaces/EntityAttribute';
import { EntityClass } from '../../interfaces/EntityClass';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('EntityConverter - Email format detection', () => {
  let entityConverter: EntityConverter;
  let typeParser: TypeParser;
  let utilityHelpers: UtilityHelpers;

  beforeEach(() => {
    utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);
    entityConverter = new EntityConverter(typeParser, utilityHelpers);
  });

  describe('convertAttribute method', () => {
    test('should apply email format when attribute type contains "email"', () => {
      const attribute: EntityAttribute = {
        name: 'contact',
        type: 'String (email)',
        description: 'Contact email address',
      };

      const result = entityConverter.convertAttribute(attribute);
      expect(result).toEqual({
        type: 'string',
        format: 'email',
        description: 'Contact email address',
      });
    });

    test('should apply email format when attribute type contains "Email"', () => {
      const attribute: EntityAttribute = {
        name: 'contact',
        type: 'String (Email address)',
        description: 'Contact email address',
      };

      const result = entityConverter.convertAttribute(attribute);
      expect(result).toEqual({
        type: 'string',
        format: 'email',
        description: 'Contact email address',
      });
    });

    test('should apply email format to array items when attribute type indicates emails', () => {
      const attribute: EntityAttribute = {
        name: 'contacts',
        type: 'Array of String (email)',
        description: 'List of contact email addresses',
      };

      const result = entityConverter.convertAttribute(attribute);
      expect(result).toEqual({
        type: 'array',
        items: {
          type: 'string',
          format: 'email',
        },
        description: 'List of contact email addresses',
      });
    });

    test('should not apply email format to regular string attributes', () => {
      const attribute: EntityAttribute = {
        name: 'name',
        type: 'String',
        description: 'User name',
      };

      const result = entityConverter.convertAttribute(attribute);
      expect(result).toEqual({
        type: 'string',
        description: 'User name',
      });
    });

    test('should preserve nullable when applying email format', () => {
      const attribute: EntityAttribute = {
        name: 'contact',
        type: 'String (email) or null',
        description: 'Contact email address',
        nullable: true,
      };

      const result = entityConverter.convertAttribute(attribute);
      expect(result).toEqual({
        type: ['string', 'null'],
        format: 'email',
        description: 'Contact email address',
      });
    });

    test('should preserve enum values when applying email format', () => {
      const attribute: EntityAttribute = {
        name: 'contact',
        type: 'String (email)',
        description: 'Contact email address',
        enumValues: ['admin@example.com', 'user@example.com'],
      };

      const result = entityConverter.convertAttribute(attribute);
      expect(result).toEqual({
        type: 'string',
        format: 'email',
        description: 'Contact email address',
        enum: ['admin@example.com', 'user@example.com'],
      });
    });
  });

  describe('email detection edge cases', () => {
    test('should apply email format when attribute name is "email" even if type does not mention email', () => {
      const attribute: EntityAttribute = {
        name: 'email',
        type: 'String',
        description: 'User email address',
      };

      const result = entityConverter.convertAttribute(attribute);
      // Current implementation might not detect this - let's see
      expect(result.type).toBe('string');
      // This might fail if email detection is not comprehensive
      expect(result.format).toBe('email');
    });

    test('should apply email format when attribute description contains "email address" even if type and name do not mention email', () => {
      const attribute: EntityAttribute = {
        name: 'contact_info',
        type: 'String',
        description: 'The user email address for notifications',
      };

      const result = entityConverter.convertAttribute(attribute);
      expect(result.type).toBe('string');
      // This might fail if email detection is not comprehensive
      expect(result.format).toBe('email');
    });

    test('should NOT apply email format when description mentions "confirmation email"', () => {
      const attribute: EntityAttribute = {
        name: 'send_notification',
        type: 'String',
        description: 'Whether to send a confirmation email',
      };

      const result = entityConverter.convertAttribute(attribute);
      expect(result.type).toBe('string');
      expect(result.format).toBeUndefined();
    });

    test('should apply email format when attribute name contains "email" with suffix', () => {
      const attribute: EntityAttribute = {
        name: 'backup_email',
        type: 'String',
        description: 'Backup contact information',
      };

      const result = entityConverter.convertAttribute(attribute);
      expect(result.type).toBe('string');
      expect(result.format).toBe('email');
    });

    test('should apply email format when attribute name contains "email" with prefix', () => {
      const attribute: EntityAttribute = {
        name: 'email_address',
        type: 'String',
        description: 'Contact information',
      };

      const result = entityConverter.convertAttribute(attribute);
      expect(result.type).toBe('string');
      expect(result.format).toBe('email');
    });

    test('should apply email format when attribute description contains "e-mail address"', () => {
      const attribute: EntityAttribute = {
        name: 'contact_info',
        type: 'String',
        description: 'The user e-mail address for notifications',
      };

      const result = entityConverter.convertAttribute(attribute);
      expect(result.type).toBe('string');
      expect(result.format).toBe('email');
    });

    test('should apply email format when description contains "email" but not exclusion patterns', () => {
      const attribute: EntityAttribute = {
        name: 'contact_method',
        type: 'String',
        description: 'Primary email for user contact',
      };

      const result = entityConverter.convertAttribute(attribute);
      expect(result.type).toBe('string');
      expect(result.format).toBe('email');
    });

    test('should NOT apply email format when description mentions "email that will be sent"', () => {
      const attribute: EntityAttribute = {
        name: 'notification_type',
        type: 'String',
        description: 'The email that will be sent to users',
      };

      const result = entityConverter.convertAttribute(attribute);
      expect(result.type).toBe('string');
      expect(result.format).toBeUndefined();
    });

    test('should NOT override existing format from type parsing', () => {
      const attribute: EntityAttribute = {
        name: 'email_timestamp',
        type: 'String (ISO8601)',
        description: 'Email sent timestamp',
      };

      const result = entityConverter.convertAttribute(attribute);
      expect(result.type).toBe('string');
      expect(result.format).toBe('date-time'); // Should keep date-time format, not change to email
    });

    test('should NOT apply email format to non-string types', () => {
      const attribute: EntityAttribute = {
        name: 'emails_count',
        type: 'Integer',
        description: 'Number of email addresses',
      };

      const result = entityConverter.convertAttribute(attribute);
      expect(result.type).toBe('integer');
      expect(result.format).toBeUndefined();
    });
  });

  describe('convertEntities method', () => {
    test('should handle entity with email attributes correctly', () => {
      const entities: EntityClass[] = [
        {
          name: 'TestEntity',
          description: 'Test entity with email fields',
          attributes: [
            {
              name: 'id',
              type: 'String',
              description: 'Entity ID',
            },
            {
              name: 'email',
              type: 'String (email)',
              description: 'Primary email address',
            },
            {
              name: 'backup_emails',
              type: 'Array of String (email)',
              description: 'Backup email addresses',
            },
            {
              name: 'contact_email',
              type: 'String (Email address) or null',
              description: 'Contact email address',
              nullable: true,
            },
          ],
        },
      ];

      const spec: OpenAPISpec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        components: { schemas: {} },
      };

      entityConverter.convertEntities(entities, spec);

      const schema = spec.components?.schemas?.TestEntity;
      expect(schema).toBeDefined();

      // Check regular string field
      expect(schema?.properties?.id).toEqual({
        type: 'string',
        description: 'Entity ID',
      });

      // Check email field
      expect(schema?.properties?.email).toEqual({
        type: 'string',
        format: 'email',
        description: 'Primary email address',
      });

      // Check array of emails
      expect(schema?.properties?.backup_emails).toEqual({
        type: 'array',
        items: {
          type: 'string',
          format: 'email',
        },
        description: 'Backup email addresses',
      });

      // Check nullable email field
      expect(schema?.properties?.contact_email).toEqual({
        type: ['string', 'null'],
        format: 'email',
        description: 'Contact email address',
      });
    });
  });
});
