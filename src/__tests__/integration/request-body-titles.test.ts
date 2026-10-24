import { MethodParser } from '../../parsers/MethodParser';
import { EntityParser } from '../../parsers/EntityParser';
import { OpenAPIGenerator } from '../../generators/OpenAPIGenerator';
import { requestBodyTitle } from '../../generators/RequestBodyEmitter';

describe('Request body titles', () => {
  const generator = new OpenAPIGenerator();
  const spec = generator.generateSchema(
    new EntityParser().parseAllEntities(),
    new MethodParser().parseAllMethods()
  );

  const inlineBodies = Object.values(spec.paths).flatMap((path) =>
    Object.values(path).flatMap((operation: any) =>
      Object.values(operation?.requestBody?.content ?? {}).map(
        (media: any) => ({
          operationId: operation.operationId as string,
          schema: media.schema,
        })
      )
    )
  );

  test('derives the title from the operationId', () => {
    expect(requestBodyTitle('createApp')).toBe('CreateAppRequest');
  });

  test('titles every inline object body after its operation', () => {
    const objects = inlineBodies.filter((b) => b.schema.type === 'object');
    expect(objects.length).toBeGreaterThan(0);

    for (const { operationId, schema } of objects) {
      expect(schema.title).toBe(requestBodyTitle(operationId));
    }
  });

  test('names the createApp and token bodies', () => {
    const titleOf = (path: string) =>
      (spec.paths[path].post!.requestBody as any).content['application/json']
        .schema.title;

    expect(titleOf('/api/v1/apps')).toBe('CreateAppRequest');
    expect(titleOf('/oauth/token')).toBe('PostOauthTokenRequest');
  });

  test('leaves the status variants oneOf untitled', () => {
    const schema = (spec.paths['/api/v1/statuses'].post!.requestBody as any)
      .content['application/json'].schema;

    expect(schema.oneOf).toBeDefined();
    expect(schema.title).toBeUndefined();
  });

  test('titles are unique and do not collide with component schemas', () => {
    const titles = inlineBodies
      .map((b) => b.schema.title)
      .filter((t): t is string => !!t);
    const components = new Set(Object.keys(spec.components?.schemas ?? {}));

    expect(new Set(titles).size).toBe(titles.length);
    expect(titles.filter((t) => components.has(t))).toEqual([]);
  });
});
