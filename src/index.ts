import { REPO_ROOT } from './config';
import { Pipeline } from './pipeline/Pipeline';
import * as fs from 'fs';
import * as path from 'path';

function main(distDir: string = path.join(REPO_ROOT, 'dist')) {
  console.log('Parsing Mastodon documentation...');

  const result = new Pipeline().run();

  console.log(`Found ${result.entityCount} entities`);
  console.log(`Found ${result.methodFileCount} method files`);
  console.log(`Total API methods parsed: ${result.methodCount}`);
  console.log('OpenAPI schema generated successfully');

  const schemaPath = path.join(distDir, 'schema.json');

  // Ensure dist directory exists
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Write schema to file
  fs.writeFileSync(schemaPath, result.json);
  console.log(`Schema written to ${schemaPath}`);
}

if (require.main === module) {
  main();
}

export { main };

export { Config, getConfig, docsContentPath, REPO_ROOT } from './config';

export { EntityAttribute } from './interfaces/EntityAttribute';
export { EntityClass } from './interfaces/EntityClass';
export { ApiParameter } from './interfaces/ApiParameter';
export { ApiMethod } from './interfaces/ApiMethod';
export { ApiMethodsFile } from './interfaces/ApiMethodsFile';
export { OpenAPISpec } from './interfaces/OpenAPISchema';

export { DocumentKind, DocumentSource } from './source/DocumentSource';
export { FileSystemSource, defaultSource } from './source/FileSystemSource';
export { InMemorySource } from './source/InMemorySource';

export {
  MarkdownDocument,
  Heading,
  Section,
} from './document/MarkdownDocument';
export { fenceMask, splitOutsideFences } from './document/blocks';
export { parseCodeBlocks, firstCodeBlock } from './document/codeBlocks';
export { parseDefinitionList } from './document/definitionList';
export { parseTables } from './document/tables';

export { TypeRef, unknownLeaves } from './model/TypeRef';
export { parseTypeRef } from './model/parseTypeRef';
export { typeRefToProperty } from './model/typeRefToProperty';

export { Pipeline, PipelineResult } from './pipeline/Pipeline';
export {
  PipelineContext,
  createPipelineContext,
} from './pipeline/PipelineContext';

export { appliedOverrides, reportOverride } from './overrides/report';

export { EntityParser } from './parsers/EntityParser';
export { EntityFileParser } from './parsers/EntityFileParser';
export { MethodEntityParser } from './parsers/MethodEntityParser';
export { AttributeParser } from './parsers/AttributeParser';
export { EntityParsingUtils } from './parsers/EntityParsingUtils';
export { MethodParser } from './parsers/MethodParser';
export { ParameterParser } from './parsers/ParameterParser';
export { TextUtils } from './parsers/TextUtils';
export { TypeInference } from './parsers/TypeInference';
export { VersionParser } from './parsers/VersionParser';
export { SupportedVersionsParser } from './parsers/SupportedVersionsParser';

export { OpenAPIGenerator } from './generators/OpenAPIGenerator';
export { UtilityHelpers } from './generators/UtilityHelpers';
export { TypeParser } from './generators/TypeParser';
export { EntityConverter } from './generators/EntityConverter';
export { MethodConverter } from './generators/MethodConverter';
export { SpecBuilder } from './generators/SpecBuilder';
export { SecurityEmitter } from './generators/SecurityEmitter';
export { ComponentEmitter } from './generators/ComponentEmitter';
export { SchemaSorting } from './generators/SchemaSorting';

export { OperationIdBuilder } from './naming/OperationId';
export { SpecPass, PassInput } from './passes/SpecPass';
export { GenerateLinksPass } from './passes/GenerateLinksPass';
export { ExtractEnumsPass } from './passes/ExtractEnumsPass';
