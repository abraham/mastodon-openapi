import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { ApiMethodsFile } from '../../interfaces/ApiMethodsFile';

describe('OpenAPIGenerator Timeline OperationId Tests', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  describe('timeline operationId generation', () => {
    it('should generate correct operationIds for timeline endpoints', () => {
      const testMethods: ApiMethodsFile[] = [
        {
          name: 'timelines',
          description: 'Timeline methods',
          methods: [
            {
              name: 'View public timeline',
              httpMethod: 'GET',
              endpoint: '/api/v1/timelines/public',
              description: 'View public statuses',
            },
            {
              name: 'View home timeline',
              httpMethod: 'GET',
              endpoint: '/api/v1/timelines/home',
              description: 'View home statuses',
            },
            {
              name: 'View direct timeline',
              httpMethod: 'GET',
              endpoint: '/api/v1/timelines/direct',
              description: 'View direct statuses',
            },
          ],
        },
      ];

      const spec = generator.generateSchema([], testMethods);

      // Check that timeline operationIds are correctly spelled (with 'e' in timeline)
      expect(spec.paths['/api/v1/timelines/public']?.get?.operationId).toBe(
        'getTimelinePublic'
      );
      expect(spec.paths['/api/v1/timelines/home']?.get?.operationId).toBe(
        'getTimelineHome'
      );
      expect(spec.paths['/api/v1/timelines/direct']?.get?.operationId).toBe(
        'getTimelineDirect'
      );

      // Verify they are NOT the misspelled versions
      expect(spec.paths['/api/v1/timelines/public']?.get?.operationId).not.toBe(
        'getTimelinPublic'
      );
      expect(spec.paths['/api/v1/timelines/home']?.get?.operationId).not.toBe(
        'getTimelinHome'
      );
      expect(spec.paths['/api/v1/timelines/direct']?.get?.operationId).not.toBe(
        'getTimelinDirect'
      );
    });
  });
});
