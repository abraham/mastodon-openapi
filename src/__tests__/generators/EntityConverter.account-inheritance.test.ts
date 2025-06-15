import { EntityConverter } from '../../generators/EntityConverter';
import { TypeParser } from '../../generators/TypeParser';
import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { EntityClass } from '../../interfaces/EntityClass';
import { OpenAPISpec } from '../../interfaces/OpenAPISchema';

describe('Account Entity Inheritance', () => {
  let entityConverter: EntityConverter;

  beforeEach(() => {
    const utilityHelpers = new UtilityHelpers();
    const typeParser = new TypeParser(utilityHelpers);
    entityConverter = new EntityConverter(typeParser, utilityHelpers);
  });

  test('CredentialAccount should inherit all Account attributes plus its own', () => {
    // Mock Account entity with core attributes
    const accountEntity: EntityClass = {
      name: 'Account',
      description: 'Account entity',
      attributes: [
        { name: 'id', type: 'String', description: 'Account ID' },
        { name: 'username', type: 'String', description: 'Username' },
        { name: 'acct', type: 'String', description: 'Account URI' },
        { name: 'display_name', type: 'String', description: 'Display name' },
        { name: 'locked', type: 'Boolean', description: 'Locked status' },
      ],
    };

    // Mock CredentialAccount entity with specific attributes
    const credentialAccountEntity: EntityClass = {
      name: 'CredentialAccount',
      description: 'CredentialAccount entity',
      attributes: [
        { name: 'source', type: 'Hash', description: 'Source information' },
        { name: 'role', type: '[Role]', description: 'User role' },
      ],
    };

    const entities = [accountEntity, credentialAccountEntity];

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };

    entityConverter.convertEntities(entities, spec);

    // Verify CredentialAccount has all Account properties plus its own
    const credentialAccountSchema = spec.components?.schemas?.CredentialAccount;
    expect(credentialAccountSchema).toBeDefined();
    expect(credentialAccountSchema?.properties).toBeDefined();

    const properties = Object.keys(credentialAccountSchema!.properties!);

    // Should have Account properties
    expect(properties).toContain('id');
    expect(properties).toContain('username');
    expect(properties).toContain('acct');
    expect(properties).toContain('display_name');
    expect(properties).toContain('locked');

    // Should have CredentialAccount properties
    expect(properties).toContain('source');
    expect(properties).toContain('role');

    // Should have 7 total properties (5 from Account + 2 from CredentialAccount)
    expect(properties).toHaveLength(7);
  });

  test('MutedAccount should inherit all Account attributes plus its own', () => {
    // Mock Account entity with core attributes
    const accountEntity: EntityClass = {
      name: 'Account',
      description: 'Account entity',
      attributes: [
        { name: 'id', type: 'String', description: 'Account ID' },
        { name: 'username', type: 'String', description: 'Username' },
        { name: 'acct', type: 'String', description: 'Account URI' },
        { name: 'display_name', type: 'String', description: 'Display name' },
        { name: 'locked', type: 'Boolean', description: 'Locked status' },
      ],
    };

    // Mock MutedAccount entity with specific attributes
    const mutedAccountEntity: EntityClass = {
      name: 'MutedAccount',
      description: 'MutedAccount entity',
      attributes: [
        {
          name: 'mute_expires_at',
          type: 'String',
          description: 'Mute expiration time',
          nullable: true,
        },
      ],
    };

    const entities = [accountEntity, mutedAccountEntity];

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };

    entityConverter.convertEntities(entities, spec);

    // Verify MutedAccount has all Account properties plus its own
    const mutedAccountSchema = spec.components?.schemas?.MutedAccount;
    expect(mutedAccountSchema).toBeDefined();
    expect(mutedAccountSchema?.properties).toBeDefined();

    const properties = Object.keys(mutedAccountSchema!.properties!);

    // Should have Account properties
    expect(properties).toContain('id');
    expect(properties).toContain('username');
    expect(properties).toContain('acct');
    expect(properties).toContain('display_name');
    expect(properties).toContain('locked');

    // Should have MutedAccount properties
    expect(properties).toContain('mute_expires_at');

    // Should have 6 total properties (5 from Account + 1 from MutedAccount)
    expect(properties).toHaveLength(6);
  });

  test('Account entity should not be affected by inheritance logic', () => {
    // Mock Account entity
    const accountEntity: EntityClass = {
      name: 'Account',
      description: 'Account entity',
      attributes: [
        { name: 'id', type: 'String', description: 'Account ID' },
        { name: 'username', type: 'String', description: 'Username' },
        { name: 'locked', type: 'Boolean', description: 'Locked status' },
      ],
    };

    const entities = [accountEntity];

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: { schemas: {} },
    };

    entityConverter.convertEntities(entities, spec);

    // Verify Account has only its own properties
    const accountSchema = spec.components?.schemas?.Account;
    expect(accountSchema).toBeDefined();
    expect(accountSchema?.properties).toBeDefined();

    const properties = Object.keys(accountSchema!.properties!);

    // Should have only Account properties
    expect(properties).toContain('id');
    expect(properties).toContain('username');
    expect(properties).toContain('locked');

    // Should have exactly 3 properties
    expect(properties).toHaveLength(3);
  });
});
