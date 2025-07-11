// Re-export everything from the split files for backward compatibility
export { EntityAttribute } from './interfaces/EntityAttribute';
export { EntityClass } from './interfaces/EntityClass';
export { ApiParameter } from './interfaces/ApiParameter';
export { ApiMethod } from './interfaces/ApiMethod';
export { ApiMethodsFile } from './interfaces/ApiMethodsFile';
export { OpenAPISpec } from './interfaces/OpenAPISchema';
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
export { OpenAPIGenerator } from './generators/OpenAPIGenerator';
// Export new generator modules
export { UtilityHelpers } from './generators/UtilityHelpers';
export { TypeParser } from './generators/TypeParser';
export { EntityConverter } from './generators/EntityConverter';
export { MethodConverter } from './generators/MethodConverter';
export { SpecBuilder } from './generators/SpecBuilder';
export { main } from './index';

// If this module is run directly, call main
if (require.main === module) {
  const { main } = require('./index');
  main();
}
