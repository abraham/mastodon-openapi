import { ApiMethodsFile } from '../interfaces/ApiMethodsFile';
import { ApiMethod } from '../interfaces/ApiMethod';
import { OpenAPISpec, OpenAPILink } from '../interfaces/OpenAPISchema';

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
  private extractOperations(methodFiles: ApiMethodsFile[], spec: OpenAPISpec): Array<{
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
        const normalizedEndpoint = this.normalizeEndpoint(method.endpoint);
        const pathInSpec = spec.paths[normalizedEndpoint];
        
        if (pathInSpec) {
          const httpMethod = method.httpMethod.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';
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
  private identifyLinkRelationships(operations: Array<{
    method: ApiMethod;
    operationId: string;
    endpoint: string;
    httpMethod: string;
  }>): void {
    this.linkMappings = [];

    for (const sourceOp of operations) {
      // Look for operations that create resources (POST) that return entities with IDs
      if (sourceOp.httpMethod === 'POST' && sourceOp.method.returns) {
        const returnType = sourceOp.method.returns;
        
        // Handle Status entity creation - check if return type mentions Status
        if (returnType.includes('Status')) {
          this.addStatusLinks(sourceOp, operations);
        }
        
        // Handle Account entity creation - check if return type mentions Account
        if (returnType.includes('Account')) {
          this.addAccountLinks(sourceOp, operations);
        }
        
        // Handle other entity types as needed
      }
    }
  }

  /**
   * Add links for Status entity operations
   */
  private addStatusLinks(sourceOp: any, operations: any[]): void {
    const statusIdPattern = /\/api\/v1\/statuses\/\{id\}/;
    const statusRelatedPattern = /\/api\/v1\/statuses\/\{id\}\//;

    for (const targetOp of operations) {
      // Link to individual status operations
      if (statusIdPattern.test(targetOp.endpoint)) {
        if (targetOp.httpMethod === 'GET') {
          this.linkMappings.push({
            sourceOperationId: sourceOp.operationId,
            sourceEndpoint: sourceOp.endpoint,
            sourceMethod: sourceOp.httpMethod,
            targetOperationId: targetOp.operationId,
            targetEndpoint: targetOp.endpoint,
            targetMethod: targetOp.httpMethod,
            linkName: 'getStatus',
            linkDescription: 'Get the created status',
            parameters: { id: '$response.body#/id' },
          });
        } else if (targetOp.httpMethod === 'DELETE') {
          this.linkMappings.push({
            sourceOperationId: sourceOp.operationId,
            sourceEndpoint: sourceOp.endpoint,
            sourceMethod: sourceOp.httpMethod,
            targetOperationId: targetOp.operationId,
            targetEndpoint: targetOp.endpoint,
            targetMethod: targetOp.httpMethod,
            linkName: 'deleteStatus',
            linkDescription: 'Delete the created status',
            parameters: { id: '$response.body#/id' },
          });
        }
      }
      
      // Link to status-related operations (reblogged_by, favourited_by, etc.)
      if (statusRelatedPattern.test(targetOp.endpoint) && targetOp.httpMethod === 'GET') {
        const endpointParts = targetOp.endpoint.split('/');
        const lastPart = endpointParts[endpointParts.length - 1];
        
        if (lastPart === 'reblogged_by') {
          this.linkMappings.push({
            sourceOperationId: sourceOp.operationId,
            sourceEndpoint: sourceOp.endpoint,
            sourceMethod: sourceOp.httpMethod,
            targetOperationId: targetOp.operationId,
            targetEndpoint: targetOp.endpoint,
            targetMethod: targetOp.httpMethod,
            linkName: 'getRebloggedBy',
            linkDescription: 'Get users who reblogged the created status',
            parameters: { id: '$response.body#/id' },
          });
        } else if (lastPart === 'favourited_by') {
          this.linkMappings.push({
            sourceOperationId: sourceOp.operationId,
            sourceEndpoint: sourceOp.endpoint,
            sourceMethod: sourceOp.httpMethod,
            targetOperationId: targetOp.operationId,
            targetEndpoint: targetOp.endpoint,
            targetMethod: targetOp.httpMethod,
            linkName: 'getFavouritedBy',
            linkDescription: 'Get users who favourited the created status',
            parameters: { id: '$response.body#/id' },
          });
        }
      }
    }
  }

  /**
   * Add links for Account entity operations
   */
  private addAccountLinks(sourceOp: any, operations: any[]): void {
    const accountIdPattern = /\/api\/v1\/accounts\/\{id\}/;

    for (const targetOp of operations) {
      if (accountIdPattern.test(targetOp.endpoint) && targetOp.httpMethod === 'GET') {
        this.linkMappings.push({
          sourceOperationId: sourceOp.operationId,
          sourceEndpoint: sourceOp.endpoint,
          sourceMethod: sourceOp.httpMethod,
          targetOperationId: targetOp.operationId,
          targetEndpoint: targetOp.endpoint,
          targetMethod: targetOp.httpMethod,
          linkName: 'getAccount',
          linkDescription: 'Get the created account',
          parameters: { id: '$response.body#/id' },
        });
      }
    }
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

    // Group links by source operation and add them to responses
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
          if (operation && typeof operation === 'object' && 'operationId' in operation && 
              operation.operationId === sourceOpId && 'responses' in operation) {
            
            // Add links to successful responses
            for (const [statusCode, response] of Object.entries(operation.responses)) {
              if (statusCode.startsWith('2') && response && typeof response === 'object' && 'description' in response) {
                // Type assertion to properly handle the response object
                const typedResponse = response as any;
                
                if (!typedResponse.links) {
                  typedResponse.links = {};
                }
                
                for (const link of links) {
                  // Create the link component
                  const linkComponentName = `${sourceOpId}To${link.targetOperationId}`;
                  spec.components.links[linkComponentName] = {
                    operationId: link.targetOperationId,
                    description: link.linkDescription,
                    parameters: link.parameters,
                  };
                  
                  // Reference the link component in the response
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

  /**
   * Normalize endpoint path for OpenAPI spec format
   */
  private normalizeEndpoint(endpoint: string): string {
    return endpoint.replace(/:(\w+)/g, '{$1}');
  }
}