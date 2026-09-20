import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '../../config';
import {
  endpointOverrides,
  entityOverrides,
  responseEntityNameOverrides,
  versionConflictPathSegments,
} from '../../overrides/overrides';

/**
 * An override that no longer matches anything is dead weight that hides drift
 * in the upstream documentation, so each one must still apply.
 */
describe('overrides', () => {
  const schema = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'dist', 'schema.json'), 'utf-8')
  );
  const schemas: Record<string, any> = schema.components.schemas;

  function schemaName(entity: string): string {
    return entity.replace(/::/g, '');
  }

  it('documents a reason for every override', () => {
    const all = [
      ...entityOverrides,
      ...responseEntityNameOverrides,
      ...endpointOverrides,
    ];
    for (const override of all) {
      expect(override.reason.length).toBeGreaterThan(0);
    }
  });

  describe('entity overrides', () => {
    it.each(entityOverrides.map((o) => [o.entity, o] as const))(
      '%s still exists in the schema',
      (_name, override) => {
        expect(schemas[schemaName(override.entity)]).toBeDefined();
      }
    );

    it.each(
      entityOverrides
        .filter((o) => o.extendsEntity)
        .map((o) => [o.entity, o] as const)
    )('%s inherits attributes from its parent', (_name, override) => {
      const parent = schemas[schemaName(override.extendsEntity!)];
      const child = schemas[schemaName(override.entity)];

      expect(parent).toBeDefined();

      // Every parent property must be present on the child
      for (const property of Object.keys(parent.properties ?? {})) {
        expect(child.properties).toHaveProperty(property);
      }
    });

    it.each(
      entityOverrides
        .filter((o) => o.excludeAttributes?.length)
        .map((o) => [o.entity, o] as const)
    )('%s omits its excluded attributes', (_name, override) => {
      const target = schemas[schemaName(override.entity)];
      for (const attribute of override.excludeAttributes!) {
        expect(target.properties ?? {}).not.toHaveProperty(attribute);
      }
    });
  });

  describe('response entity name overrides', () => {
    it.each(responseEntityNameOverrides.map((o) => [o.name, o] as const))(
      '%s is present in the schema',
      (_name, override) => {
        expect(schemas[override.name]).toBeDefined();
      }
    );
  });

  describe('endpoint overrides', () => {
    it.each(
      endpointOverrides.map((o) => [`${o.httpMethod} ${o.path}`, o] as const)
    )('%s matches a generated operation', (_label, override) => {
      const operation =
        schema.paths[override.path]?.[override.httpMethod.toLowerCase()];
      expect(operation).toBeDefined();
    });

    it.each(
      endpointOverrides
        .filter((o) => o.extraResponseHeaders?.length)
        .map((o) => [`${o.httpMethod} ${o.path}`, o] as const)
    )('%s carries its extra response headers', (_label, override) => {
      const operation =
        schema.paths[override.path][override.httpMethod.toLowerCase()];
      const success = Object.entries(operation.responses).find(([code]) =>
        code.startsWith('2')
      );

      expect(success).toBeDefined();
      for (const header of override.extraResponseHeaders!) {
        expect((success![1] as any).headers).toHaveProperty(header);
      }
    });
  });

  describe('version conflict segments', () => {
    const segmentsInUse = new Set<string>();
    for (const apiPath of Object.keys(schema.paths)) {
      const match = apiPath.match(/^\/api\/v\d[^/]*\/([^/]+)/);
      if (match) {
        segmentsInUse.add(match[1]);
      }
    }

    it.each(versionConflictPathSegments)('%s is a real path segment', (seg) => {
      expect(segmentsInUse.has(seg)).toBe(true);
    });
  });
});
