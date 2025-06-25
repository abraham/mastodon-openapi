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
        const normalizedEndpoint = this.normalizeEndpoint(method.endpoint);
        const pathInSpec = spec.paths[normalizedEndpoint];

        if (pathInSpec) {
          const httpMethod = method.httpMethod.toLowerCase() as
            | 'get'
            | 'post'
            | 'put'
            | 'delete'
            | 'patch';
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
      // Look for operations that create resources (POST) that return entities with IDs
      if (sourceOp.httpMethod === 'POST' && sourceOp.method.returns) {
        const returnType = sourceOp.method.returns;

        // Handle Status entity creation - check if return type is exactly Status (not FilterStatus, etc.)
        if (this.isStatusEntity(returnType)) {
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
   * Check if the return type represents a Status entity (not other entities like FilterStatus)
   */
  private isStatusEntity(returnType: string): boolean {
    // Match exactly "[Status]" or text ending with " Status" or starting with "Status "
    // but exclude entities that contain "Status" but are not the Status entity itself
    return (
      returnType === '[Status]' ||
      returnType === 'Status' ||
      returnType.includes('[Status].') || // handles cases like "[Status]. When scheduled_at is present, [ScheduledStatus] is returned instead."
      (returnType.includes('Status]') &&
        !returnType.includes('FilterStatus') &&
        !returnType.includes('ScheduledStatus'))
    );
  }

  /**
   * Add links for Status entity operations
   */
  private addStatusLinks(sourceOp: any, operations: any[]): void {
    // Match /api/v1/statuses/{id} optionally followed by any path segment
    const statusPattern = /^\/api\/v1\/statuses\/\{id\}(?:\/.*)?$/;

    for (const targetOp of operations) {
      // Link to any status operations that follow the pattern /api/v1/statuses/{id}[/anything]
      if (statusPattern.test(targetOp.endpoint)) {
        const linkName = this.generateStatusLinkName(
          targetOp.endpoint,
          targetOp.httpMethod
        );
        const linkDescription = this.generateStatusLinkDescription(
          targetOp.endpoint,
          targetOp.httpMethod
        );

        this.linkMappings.push({
          sourceOperationId: sourceOp.operationId,
          sourceEndpoint: sourceOp.endpoint,
          sourceMethod: sourceOp.httpMethod,
          targetOperationId: targetOp.operationId,
          targetEndpoint: targetOp.endpoint,
          targetMethod: targetOp.httpMethod,
          linkName: linkName,
          linkDescription: linkDescription,
          parameters: { id: '$response.body#/id' },
        });
      }
    }
  }

  /**
   * Add links for Account entity operations
   */
  private addAccountLinks(sourceOp: any, operations: any[]): void {
    // Match /api/v1/accounts/{id} optionally followed by any path segment
    const accountPattern = /^\/api\/v1\/accounts\/\{id\}(?:\/.*)?$/;

    for (const targetOp of operations) {
      // Link to any account operations that follow the pattern /api/v1/accounts/{id}[/anything]
      if (accountPattern.test(targetOp.endpoint)) {
        const linkName = this.generateAccountLinkName(
          targetOp.endpoint,
          targetOp.httpMethod
        );
        const linkDescription = this.generateAccountLinkDescription(
          targetOp.endpoint,
          targetOp.httpMethod
        );

        this.linkMappings.push({
          sourceOperationId: sourceOp.operationId,
          sourceEndpoint: sourceOp.endpoint,
          sourceMethod: sourceOp.httpMethod,
          targetOperationId: targetOp.operationId,
          targetEndpoint: targetOp.endpoint,
          targetMethod: targetOp.httpMethod,
          linkName: linkName,
          linkDescription: linkDescription,
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

    // First pass: Create consolidated link components for unique operation+parameters combinations
    const uniqueLinks = new Map<string, OpenAPILink>();
    const uniqueLinkNames = new Map<string, string>();

    for (const mapping of this.linkMappings) {
      const linkKey = `${mapping.targetOperationId}_${JSON.stringify(mapping.parameters)}`;

      if (!uniqueLinks.has(linkKey)) {
        // Create a generic name for this link based on the target operation
        const linkComponentName = this.generateConsolidatedLinkName(
          mapping.targetOperationId,
          mapping.parameters
        );

        // Generate a generic description based on the target operation
        const genericDescription = this.generateGenericDescription(
          mapping.targetOperationId,
          mapping.parameters
        );

        uniqueLinks.set(linkKey, {
          operationId: mapping.targetOperationId,
          description: genericDescription,
          parameters: mapping.parameters,
        });

        uniqueLinkNames.set(linkKey, linkComponentName);

        // Add to components
        spec.components.links[linkComponentName] = uniqueLinks.get(linkKey)!;
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

  /**
   * Generate a consolidated name for a link based on the target operation and parameters
   */
  private generateConsolidatedLinkName(
    targetOperationId: string,
    parameters: Record<string, string>
  ): string {
    // For operations that use an ID parameter, append "ById"
    if (parameters.id === '$response.body#/id') {
      return `${targetOperationId}ById`;
    }

    // For other parameter patterns, we could add more logic here
    // For now, just use the operation ID with a generic suffix
    return `${targetOperationId}FromResponse`;
  }

  /**
   * Generate a generic description for a consolidated link
   */
  private generateGenericDescription(
    targetOperationId: string,
    parameters: Record<string, string>
  ): string {
    // Create descriptions based on the operation ID patterns
    if (targetOperationId.includes('delete')) {
      return 'Delete the status using the response ID';
    } else if (targetOperationId.includes('RebloggedBy')) {
      return 'Get users who reblogged the status using the response ID';
    } else if (targetOperationId.includes('FavouritedBy')) {
      return 'Get users who favourited the status using the response ID';
    } else if (targetOperationId.includes('Context')) {
      return 'Get the status context using the response ID';
    } else if (targetOperationId.includes('History')) {
      return 'Get the status edit history using the response ID';
    } else if (targetOperationId.includes('Source')) {
      return 'Get the status source using the response ID';
    } else if (targetOperationId.includes('Card')) {
      return 'Get the status preview card using the response ID';
    } else if (targetOperationId.includes('Account')) {
      return 'Get the account using the response ID';
    } else if (targetOperationId.startsWith('get')) {
      return 'Get the resource using the response ID';
    }

    return 'Access the related resource using the response ID';
  }

  /**
   * Generate link name for Status operations
   */
  private generateStatusLinkName(endpoint: string, httpMethod: string): string {
    // For exact /api/v1/statuses/{id} match
    if (endpoint === '/api/v1/statuses/{id}') {
      if (httpMethod === 'GET') return 'getStatus';
      if (httpMethod === 'DELETE') return 'deleteStatus';
      if (httpMethod === 'PUT' || httpMethod === 'PATCH') return 'updateStatus';
    }

    // For endpoints with additional path segments like /api/v1/statuses/{id}/reblogged_by
    const endpointParts = endpoint.split('/');
    const lastPart = endpointParts[endpointParts.length - 1];

    // Generate names based on the last path segment
    if (lastPart === 'reblogged_by') return 'getRebloggedBy';
    if (lastPart === 'favourited_by') return 'getFavouritedBy';
    if (lastPart === 'context') return 'getContext';
    if (lastPart === 'card') return 'getCard';
    if (lastPart === 'history') return 'getHistory';
    if (lastPart === 'source') return 'getSource';
    if (lastPart === 'favourite') return 'favouriteStatus';
    if (lastPart === 'unfavourite') return 'unfavouriteStatus';
    if (lastPart === 'reblog') return 'reblogStatus';
    if (lastPart === 'unreblog') return 'unreblogStatus';
    if (lastPart === 'bookmark') return 'bookmarkStatus';
    if (lastPart === 'unbookmark') return 'unbookmarkStatus';
    if (lastPart === 'mute') return 'muteStatus';
    if (lastPart === 'unmute') return 'unmuteStatus';
    if (lastPart === 'pin') return 'pinStatus';
    if (lastPart === 'unpin') return 'unpinStatus';

    // Default fallback
    return `${httpMethod.toLowerCase()}StatusAction`;
  }

  /**
   * Generate link description for Status operations
   */
  private generateStatusLinkDescription(
    endpoint: string,
    httpMethod: string
  ): string {
    // For exact /api/v1/statuses/{id} match
    if (endpoint === '/api/v1/statuses/{id}') {
      if (httpMethod === 'GET') return 'Get the created status';
      if (httpMethod === 'DELETE') return 'Delete the created status';
      if (httpMethod === 'PUT' || httpMethod === 'PATCH')
        return 'Update the created status';
    }

    // For endpoints with additional path segments
    const endpointParts = endpoint.split('/');
    const lastPart = endpointParts[endpointParts.length - 1];

    if (lastPart === 'reblogged_by')
      return 'Get users who reblogged the created status';
    if (lastPart === 'favourited_by')
      return 'Get users who favourited the created status';
    if (lastPart === 'context') return 'Get the context of the created status';
    if (lastPart === 'card')
      return 'Get the preview card of the created status';
    if (lastPart === 'history')
      return 'Get the edit history of the created status';
    if (lastPart === 'source') return 'Get the source of the created status';
    if (lastPart === 'favourite') return 'Favourite the created status';
    if (lastPart === 'unfavourite') return 'Unfavourite the created status';
    if (lastPart === 'reblog') return 'Reblog the created status';
    if (lastPart === 'unreblog') return 'Unreblog the created status';
    if (lastPart === 'bookmark') return 'Bookmark the created status';
    if (lastPart === 'unbookmark') return 'Unbookmark the created status';
    if (lastPart === 'mute') return 'Mute the created status';
    if (lastPart === 'unmute') return 'Unmute the created status';
    if (lastPart === 'pin') return 'Pin the created status';
    if (lastPart === 'unpin') return 'Unpin the created status';

    return `Perform ${httpMethod.toLowerCase()} action on the created status`;
  }

  /**
   * Generate link name for Account operations
   */
  private generateAccountLinkName(
    endpoint: string,
    httpMethod: string
  ): string {
    // For exact /api/v1/accounts/{id} match
    if (endpoint === '/api/v1/accounts/{id}') {
      if (httpMethod === 'GET') return 'getAccount';
      if (httpMethod === 'DELETE') return 'deleteAccount';
      if (httpMethod === 'PUT' || httpMethod === 'PATCH')
        return 'updateAccount';
    }

    // For endpoints with additional path segments like /api/v1/accounts/{id}/follow
    const endpointParts = endpoint.split('/');
    const lastPart = endpointParts[endpointParts.length - 1];

    // Generate names based on the last path segment
    if (lastPart === 'follow') return 'followAccount';
    if (lastPart === 'unfollow') return 'unfollowAccount';
    if (lastPart === 'block') return 'blockAccount';
    if (lastPart === 'unblock') return 'unblockAccount';
    if (lastPart === 'mute') return 'muteAccount';
    if (lastPart === 'unmute') return 'unmuteAccount';
    if (lastPart === 'statuses') return 'getAccountStatuses';
    if (lastPart === 'followers') return 'getAccountFollowers';
    if (lastPart === 'following') return 'getAccountFollowing';
    if (lastPart === 'lists') return 'getAccountLists';
    if (lastPart === 'identity_proofs') return 'getAccountIdentityProofs';
    if (lastPart === 'featured_tags') return 'getAccountFeaturedTags';
    if (lastPart === 'relationships') return 'getAccountRelationships';
    if (lastPart === 'familiar_followers') return 'getAccountFamiliarFollowers';

    // Default fallback
    return `${httpMethod.toLowerCase()}AccountAction`;
  }

  /**
   * Generate link description for Account operations
   */
  private generateAccountLinkDescription(
    endpoint: string,
    httpMethod: string
  ): string {
    // For exact /api/v1/accounts/{id} match
    if (endpoint === '/api/v1/accounts/{id}') {
      if (httpMethod === 'GET') return 'Get the created account';
      if (httpMethod === 'DELETE') return 'Delete the created account';
      if (httpMethod === 'PUT' || httpMethod === 'PATCH')
        return 'Update the created account';
    }

    // For endpoints with additional path segments
    const endpointParts = endpoint.split('/');
    const lastPart = endpointParts[endpointParts.length - 1];

    if (lastPart === 'follow') return 'Follow the created account';
    if (lastPart === 'unfollow') return 'Unfollow the created account';
    if (lastPart === 'block') return 'Block the created account';
    if (lastPart === 'unblock') return 'Unblock the created account';
    if (lastPart === 'mute') return 'Mute the created account';
    if (lastPart === 'unmute') return 'Unmute the created account';
    if (lastPart === 'statuses') return 'Get statuses of the created account';
    if (lastPart === 'followers') return 'Get followers of the created account';
    if (lastPart === 'following')
      return 'Get accounts followed by the created account';
    if (lastPart === 'lists') return 'Get lists of the created account';
    if (lastPart === 'identity_proofs')
      return 'Get identity proofs of the created account';
    if (lastPart === 'featured_tags')
      return 'Get featured tags of the created account';
    if (lastPart === 'relationships')
      return 'Get relationships with the created account';
    if (lastPart === 'familiar_followers')
      return 'Get familiar followers of the created account';

    return `Perform ${httpMethod.toLowerCase()} action on the created account`;
  }

  /**
   * Normalize endpoint path for OpenAPI spec format
   */
  private normalizeEndpoint(endpoint: string): string {
    return endpoint.replace(/:(\w+)/g, '{$1}');
  }
}
