import { EntityClass } from '../interfaces/EntityClass';
import { ApiMethodsFile } from '../interfaces/ApiMethodsFile';
import { OpenAPISpec } from '../interfaces/OpenAPISchema';
import { SchemaGenerator } from './SchemaGenerator';
import { PathGenerator } from './PathGenerator';
import { SpecBuilder } from './SpecBuilder';

class OpenAPIGenerator {
  private spec: OpenAPISpec;
  private schemaGenerator: SchemaGenerator;
  private pathGenerator: PathGenerator;
  private specBuilder: SpecBuilder;

  constructor() {
    this.specBuilder = new SpecBuilder();
    this.schemaGenerator = new SchemaGenerator();
    this.pathGenerator = new PathGenerator(this.schemaGenerator);
    this.spec = this.specBuilder.createSpec();
  }

  public generateSchema(
    entities: EntityClass[],
    methodFiles: ApiMethodsFile[]
  ): OpenAPISpec {
    // Convert entities to OpenAPI schemas
    this.schemaGenerator.convertEntities(entities, this.spec);

    // Convert methods to OpenAPI paths
    this.pathGenerator.convertMethods(methodFiles, this.spec);

    return this.spec;
  }

  public convertParameterToSchema(param: any): any {
    return this.pathGenerator.convertParameterToSchema(param);
  }

  public toJSON(): string {
    return JSON.stringify(this.spec, null, 2);
  }
}

export { OpenAPIGenerator };
