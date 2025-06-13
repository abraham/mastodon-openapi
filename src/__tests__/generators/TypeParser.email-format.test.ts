import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { ApiParameter } from '../../interfaces/ApiParameter';

describe('TypeParser - Email format detection', () => {
  let typeParser: TypeParser;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    typeParser = new TypeParser(utilityHelpers);
  });

  describe('parseType method', () => {
    test('should apply email format when type contains "email"', () => {
      const result = typeParser.parseType('String (email)');
      expect(result).toEqual({
        type: 'string',
        format: 'email',
      });
    });

    test('should apply email format when type contains "Email"', () => {
      const result = typeParser.parseType('String (Email address)');
      expect(result).toEqual({
        type: 'string',
        format: 'email',
      });
    });

    test('should apply email format to array items when type indicates emails', () => {
      const result = typeParser.parseType('Array of String (email)');
      expect(result).toEqual({
        type: 'array',
        items: {
          type: 'string',
          format: 'email',
        },
      });
    });

    test('should not apply email format to regular strings', () => {
      const result = typeParser.parseType('String');
      expect(result).toEqual({
        type: 'string',
      });
    });
  });

  describe('convertParameterToSchema method', () => {
    test('should apply email format when parameter name contains "email"', () => {
      const param: ApiParameter = {
        name: 'email',
        description: 'User email',
        required: false,
        in: 'formData',
      };

      const result = typeParser.convertParameterToSchema(param);
      expect(result).toEqual({
        type: 'string',
        format: 'email',
        description: 'User email',
      });
    });

    test('should apply email format when parameter name contains "email" with suffix', () => {
      const param: ApiParameter = {
        name: 'email_address',
        description: 'User email address',
        required: false,
        in: 'formData',
      };

      const result = typeParser.convertParameterToSchema(param);
      expect(result).toEqual({
        type: 'string',
        format: 'email',
        description: 'User email address',
      });
    });

    test('should apply email format when description contains "email address"', () => {
      const param: ApiParameter = {
        name: 'user_contact',
        description: 'String. The user email address',
        required: false,
        in: 'formData',
      };

      const result = typeParser.convertParameterToSchema(param);
      expect(result).toEqual({
        type: 'string',
        format: 'email',
        description: 'String. The user email address',
      });
    });

    test('should apply email format when description contains "e-mail address"', () => {
      const param: ApiParameter = {
        name: 'contact',
        description: 'String. The user e-mail address',
        required: false,
        in: 'formData',
      };

      const result = typeParser.convertParameterToSchema(param);
      expect(result).toEqual({
        type: 'string',
        format: 'email',
        description: 'String. The user e-mail address',
      });
    });

    test('should NOT apply email format when description mentions "confirmation email"', () => {
      const param: ApiParameter = {
        name: 'send_confirmation',
        description: 'Boolean. Whether to send a confirmation email',
        required: false,
        in: 'formData',
      };

      const result = typeParser.convertParameterToSchema(param);
      expect(result).toEqual({
        type: 'string',
        description: 'Boolean. Whether to send a confirmation email',
      });
      expect(result.format).toBeUndefined();
    });

    test('should NOT apply email format when description mentions "email that will be sent"', () => {
      const param: ApiParameter = {
        name: 'notification_setting',
        description: 'String. The email that will be sent for notifications',
        required: false,
        in: 'formData',
      };

      const result = typeParser.convertParameterToSchema(param);
      expect(result).toEqual({
        type: 'string',
        description: 'String. The email that will be sent for notifications',
      });
      expect(result.format).toBeUndefined();
    });

    test('should apply email format when description contains "email" but not exclusion patterns', () => {
      const param: ApiParameter = {
        name: 'contact_info',
        description: 'String. The user email for contact',
        required: false,
        in: 'formData',
      };

      const result = typeParser.convertParameterToSchema(param);
      expect(result).toEqual({
        type: 'string',
        format: 'email',
        description: 'String. The user email for contact',
      });
    });

    test('should preserve enum values when applying email format', () => {
      const param: ApiParameter = {
        name: 'email',
        description: 'User email',
        required: false,
        in: 'formData',
        enumValues: ['test@example.com', 'admin@example.com'],
      };

      const result = typeParser.convertParameterToSchema(param);
      expect(result).toEqual({
        type: 'string',
        format: 'email',
        description: 'User email',
        enum: ['test@example.com', 'admin@example.com'],
      });
    });

    test('should preserve default value when applying email format', () => {
      const param: ApiParameter = {
        name: 'email',
        description: 'User email',
        required: false,
        in: 'formData',
        defaultValue: 'user@example.com',
      };

      const result = typeParser.convertParameterToSchema(param);
      expect(result).toEqual({
        type: 'string',
        format: 'email',
        description: 'User email',
        default: 'user@example.com',
      });
    });
  });
});