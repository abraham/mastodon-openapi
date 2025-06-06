// Re-export everything from the split files for backward compatibility
export { EntityAttribute } from './interfaces/EntityAttribute';
export { EntityClass } from './interfaces/EntityClass';
export { ApiParameter } from './interfaces/ApiParameter';
export { ApiMethod } from './interfaces/ApiMethod';
export { ApiMethodsFile } from './interfaces/ApiMethodsFile';
export { EntityParser } from './parsers/EntityParser';
export { MethodParser } from './parsers/MethodParser';
export { main } from './main';

// If this module is run directly, call main
if (require.main === module) {
  const { main } = require('./main');
  main();
}