import { EntityClass } from '../interfaces/EntityClass';
import { ApiMethodsFile } from '../interfaces/ApiMethodsFile';
import { ApiParameter } from '../interfaces/ApiParameter';
import { OpenAPIProperty, OpenAPISpec } from '../interfaces/OpenAPISchema';
import { SpecBuilder } from './SpecBuilder';
import { EntityConverter } from './EntityConverter';
import { MethodConverter } from './MethodConverter';
import { TypeParser } from './TypeParser';
import { UtilityHelpers } from './UtilityHelpers';
import { ErrorExampleRegistry } from './ErrorExampleRegistry';
import {
  PipelineContext,
  createPipelineContext,
} from '../pipeline/PipelineContext';
import { PassInput, SpecPass } from '../passes/SpecPass';
import { GenerateLinksPass } from '../passes/GenerateLinksPass';
import { ExtractEnumsPass } from '../passes/ExtractEnumsPass';

/** One ordered mutation of the spec under construction. */
interface GenerationStage {
  readonly name: string;
  readonly run: (spec: OpenAPISpec, input: PassInput) => void;
}

class OpenAPIGenerator {
  private spec: OpenAPISpec;
  private specBuilder: SpecBuilder;
  private entityConverter: EntityConverter;
  private methodConverter: MethodConverter;
  private typeParser: TypeParser;
  private utilityHelpers: UtilityHelpers;
  private errorExampleRegistry: ErrorExampleRegistry;

  /** Whole-document transforms, applied after conversion. */
  private passes: SpecPass[];

  constructor(context: PipelineContext = createPipelineContext()) {
    // Initialize helper modules
    this.utilityHelpers = new UtilityHelpers();
    this.typeParser = new TypeParser(this.utilityHelpers);
    this.errorExampleRegistry = new ErrorExampleRegistry();
    this.entityConverter = new EntityConverter(
      this.typeParser,
      this.utilityHelpers
    );
    this.methodConverter = new MethodConverter(
      this.typeParser,
      this.utilityHelpers,
      this.errorExampleRegistry,
      context
    );
    this.specBuilder = new SpecBuilder(context);
    this.passes = [new GenerateLinksPass(), new ExtractEnumsPass()];

    // Build initial OpenAPI spec
    this.spec = this.specBuilder.buildInitialSpec();
  }

  /**
   * The generation stages, in the order they must run. Each depends on the
   * mutations of the ones before it.
   */
  private stages(): GenerationStage[] {
    return [
      {
        name: 'collect-error-examples',
        run: (_spec, { methodFiles }) =>
          this.errorExampleRegistry.collectErrorExamples(methodFiles),
      },
      {
        name: 'narrow-client-credentials-scopes',
        run: (spec, { methodFiles }) =>
          this.updateClientCredentialsScopes(spec, methodFiles),
      },
      {
        name: 'convert-entities',
        run: (spec, { entities }) =>
          this.entityConverter.convertEntities(entities, spec),
      },
      {
        name: 'convert-methods',
        run: (spec, { methodFiles }) =>
          this.methodConverter.convertMethods(methodFiles, spec),
      },
      ...this.passes.map((pass) => ({
        name: pass.name,
        run: (spec: OpenAPISpec, input: PassInput) => pass.run(spec, input),
      })),
    ];
  }

  /** Stage names in execution order. */
  public stageNames(): string[] {
    return this.stages().map((stage) => stage.name);
  }

  public generateSchema(
    entities: EntityClass[],
    methodFiles: ApiMethodsFile[]
  ): OpenAPISpec {
    const input: PassInput = { entities, methodFiles };

    for (const stage of this.stages()) {
      stage.run(this.spec, input);
    }

    return this.spec;
  }

  /**
   * Update the clientCredentials OAuth flow scopes based on app token usage in methods
   * Only scopes that are explicitly used with App token authentication should be available
   */
  private updateClientCredentialsScopes(
    spec: OpenAPISpec,
    methodFiles: ApiMethodsFile[]
  ): void {
    // Collect all scopes used with App token authentication
    const appTokenScopes =
      this.methodConverter.collectAppTokenScopes(methodFiles);

    // Get the OAuth scopes from the existing security scheme for descriptions
    const existingScopes =
      spec.components?.securitySchemes?.OAuth2?.flows?.authorizationCode
        ?.scopes || {};

    // Build the new clientCredentials scopes object
    const clientCredentialsScopes: Record<string, string> = {};
    for (const scopeName of appTokenScopes) {
      // Use existing description if available, otherwise generate a default one
      const description =
        existingScopes[scopeName] || `Access scope: ${scopeName}`;
      clientCredentialsScopes[scopeName] = description;
    }

    // Update the spec's clientCredentials scopes
    if (spec.components?.securitySchemes?.OAuth2?.flows?.clientCredentials) {
      spec.components.securitySchemes.OAuth2.flows.clientCredentials.scopes =
        clientCredentialsScopes;
    }
  }

  public toJSON(): string {
    return JSON.stringify(this.spec, null, 2);
  }

  // Public for testing - delegates to the appropriate module
  public convertParameterToSchema(param: ApiParameter): OpenAPIProperty {
    return this.typeParser.convertParameterToSchema(param);
  }
}

export { OpenAPIGenerator };
