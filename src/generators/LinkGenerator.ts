import { ApiMethodsFile } from '../interfaces/ApiMethodsFile';
import { ApiMethod } from '../interfaces/ApiMethod';
import { OpenAPISpec, OpenAPILink } from '../interfaces/OpenAPISchema';
import {
  linkComponentName,
  linkDescription,
  normalizeEndpoint,
} from './LinkNaming';

/**
 * Entities whose creation response carries an `id` that later operations take
 * as a path parameter.
 *
 * This is the only per-entity knowledge in the generator; everything about the
 * resulting links is derived from the target operations themselves.
 */
const LINKABLE_ENTITIES: Array<{ entity: string; collection: string }> = [
  { entity: 'Status', collection: '/api/v1/statuses' },
  { entity: 'Account', collection: '/api/v1/accounts' },
];

/**
 * Interface for operation link mapping
 */
interface OperationLinkMapping {
  sourceOperationId: string;
  sourceEndpoint: string;
  sourceMethod: string;
  targetOperationId: string;
  targetEndpoint: string;
  targetMethod: string;
  linkName: string;
  linkDescription: string;
  parameters: Record<string, string>;
}

/**
 * Generator for OpenAPI operation links
 */
export class LinkGenerator {
  private linkMappings: OperationLinkMapping[] = [];

  /**
   * Analyze methods and identify operation links
   */
  public generateLinks(methodFiles: ApiMethodsFile[], spec: OpenAPISpec): void {
    // First pass: identify all operations and their IDs
    const operations = this.extractOperations(methodFiles, spec);

    // Second pass: identify link relationships
    this.identifyLinkRelationships(operations);

    // Third pass: generate links in the spec
    this.addLinksToSpec(spec);
  }

  /**
   * Extract all operations from method files with their generated operation IDs
   */
  private extractOperations(
    methodFiles: ApiMethodsFile[],
    spec: OpenAPISpec
  ): Array<{
    method: ApiMethod;
    operationId: string;
    endpoint: string;
    httpMethod: string;
  }> {
    const operations: Array<{
      method: ApiMethod;
      operationId: string;
      endpoint: string;
      httpMethod: string;
    }> = [];

    for (const methodFile of methodFiles) {
      for (const method of methodFile.methods) {
        const normalizedEndpoint = normalizeEndpoint(method.endpoint);
        const pathInSpec = spec.paths[normalizedEndpoint];

        if (pathInSpec) {
          const httpMethod = method.httpMethod.toLowerCase() as
            'get' | 'post' | 'put' | 'delete' | 'patch';
          const operation = pathInSpec[httpMethod];

          if (operation?.operationId) {
            operations.push({
              method,
              operationId: operation.operationId,
              endpoint: normalizedEndpoint,
              httpMethod: method.httpMethod,
            });
          }
        }
      }
    }

    return operations;
  }

  /**
   * Identify link relationships between operations
   */
  private identifyLinkRelationships(
    operations: Array<{
      method: ApiMethod;
      operationId: string;
      endpoint: string;
      httpMethod: string;
    }>
  ): void {
    this.linkMappings = [];

    for (const sourceOp of operations) {
      // Only a creation response carries an id that later calls can consume.
      if (sourceOp.httpMethod !== 'POST' || !sourceOp.method.returns) {
        continue;
      }

      for (const { entity, collection } of LINKABLE_ENTITIES) {
        if (!this.returnsEntity(sourceOp.method.returns, entity)) {
          continue;
        }

        const itemPattern = new RegExp(
          `^${collection.replace(/\//g, '\\/')}\\/\\{id\\}(?:\\/.*)?$`
        );

        for (const targetOp of operations) {
          if (!itemPattern.test(targetOp.endpoint)) {
            continue;
          }

          this.linkMappings.push({
            sourceOperationId: sourceOp.operationId,
            sourceEndpoint: sourceOp.endpoint,
            sourceMethod: sourceOp.httpMethod,
            targetOperationId: targetOp.operationId,
            targetEndpoint: targetOp.endpoint,
            targetMethod: targetOp.httpMethod,
            // The operationId is unique per operation, so it is a safe key and
            // needs no separate naming scheme.
            linkName: targetOp.operationId,
            linkDescription: targetOp.method.name,
            parameters: { id: '$response.body#/id' },
          });
        }
      }
    }
  }

  /**
   * Whether a documented `**Returns:**` names this entity and not merely
   * something whose name contains it, such as `ScheduledStatus`.
   */
  private returnsEntity(returnType: string, entity: string): boolean {
    const mention = new RegExp(`(^|[^A-Za-z])${entity}(?![A-Za-z])`);
    return mention.test(returnType);
  }

  /**
   * Add generated links to the OpenAPI spec
   */
  private addLinksToSpec(spec: OpenAPISpec): void {
    // Initialize components.links if it doesn't exist
    if (!spec.components) {
      spec.components = {};
    }
    if (!spec.components.links) {
      spec.components.links = {};
    }

    // First pass: Create consolidated link components for unique operation+parameters combinations
    const uniqueLinks = new Map<string, OpenAPILink>();
    const uniqueLinkNames = new Map<string, string>();

    for (const mapping of this.linkMappings) {
      const linkKey = `${mapping.targetOperationId}_${JSON.stringify(mapping.parameters)}`;

      if (!uniqueLinks.has(linkKey)) {
        const componentName = linkComponentName(
          mapping.targetOperationId,
          mapping.parameters
        );

        uniqueLinks.set(linkKey, {
          operationId: mapping.targetOperationId,
          description: linkDescription(
            mapping.linkDescription,
            mapping.targetOperationId,
            mapping.parameters
          ),
          parameters: mapping.parameters,
        });

        uniqueLinkNames.set(linkKey, componentName);

        // Add to components
        spec.components.links[componentName] = uniqueLinks.get(linkKey)!;
      }
    }

    // Second pass: Group links by source operation and add them to responses
    const linksBySource = new Map<string, OperationLinkMapping[]>();

    for (const mapping of this.linkMappings) {
      const key = `${mapping.sourceOperationId}`;
      if (!linksBySource.has(key)) {
        linksBySource.set(key, []);
      }
      linksBySource.get(key)!.push(mapping);
    }

    // Add links to successful responses (200, 201) of source operations
    for (const [sourceOpId, links] of linksBySource) {
      // Find the source operation in the spec
      for (const [path, pathItem] of Object.entries(spec.paths)) {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (
            operation &&
            typeof operation === 'object' &&
            'operationId' in operation &&
            operation.operationId === sourceOpId &&
            'responses' in operation
          ) {
            // Add links to successful responses
            for (const [statusCode, response] of Object.entries(
              operation.responses
            )) {
              if (
                statusCode.startsWith('2') &&
                response &&
                typeof response === 'object' &&
                'description' in response
              ) {
                // Type assertion to properly handle the response object
                const typedResponse = response as any;

                if (!typedResponse.links) {
                  typedResponse.links = {};
                }

                for (const link of links) {
                  const linkKey = `${link.targetOperationId}_${JSON.stringify(link.parameters)}`;
                  const linkComponentName = uniqueLinkNames.get(linkKey)!;

                  // Reference the consolidated link component in the response
                  typedResponse.links[link.linkName] = {
                    $ref: `#/components/links/${linkComponentName}`,
                  };
                }
              }
            }
          }
        }
      }
    }
  }
}
