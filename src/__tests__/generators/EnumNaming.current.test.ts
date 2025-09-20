import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { EntityClass } from '../../interfaces/EntityClass';

describe('Enum naming current behavior', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  it('should demonstrate current PascalCase and enum naming behavior', () => {
    // Test the private toPascalCase method
    const pascalCaseMethod = (generator as any).toPascalCase.bind(generator);
    
    console.log('Testing PascalCase conversion:');
    console.log('account_warning ->', pascalCaseMethod('account_warning'));
    console.log('notification_group ->', pascalCaseMethod('notification_group'));
    console.log('preview_card ->', pascalCaseMethod('preview_card'));
    console.log('trends_link ->', pascalCaseMethod('trends_link'));

    // Test current enum naming for various entities
    const entities: EntityClass[] = [
      {
        name: 'AccountWarning',
        description: 'Account warning entity',
        attributes: [
          {
            name: 'action',
            type: 'String (Enumerable oneOf)',
            description: 'Action taken',
            enumValues: ['none', 'disable', 'mark_statuses_as_sensitive']
          }
        ]
      },
      {
        name: 'Filter',
        description: 'Filter entity',
        attributes: [
          {
            name: 'context',
            type: 'Array of String (Enumerable, anyOf)',
            description: 'Filter context',
            enumValues: ['home', 'notifications', 'public', 'thread', 'account']
          }
        ]
      },
      {
        name: 'Notification',
        description: 'Notification entity',
        attributes: [
          {
            name: 'type',
            type: 'String (Enumerable oneOf)',
            description: 'Type of notification',
            enumValues: ['mention', 'status', 'reblog']
          }
        ]
      }
    ];

    const spec = generator.generateSchema(entities, []);
    console.log('\nGenerated enum components:');
    Object.keys(spec.components?.schemas || {}).forEach(key => {
      if (key.includes('Enum') || key.includes('Context')) {
        console.log(`- ${key}`);
      }
    });

    // The test should pass regardless of current behavior - we just want to observe
    expect(spec.components?.schemas).toBeDefined();
  });
});