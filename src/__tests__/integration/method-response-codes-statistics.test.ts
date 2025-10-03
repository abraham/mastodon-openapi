import { MethodParser } from '../../parsers/MethodParser';

describe('Method Response Codes Statistics', () => {
  it('should report statistics on method-specific response codes', () => {
    const methodParser = new MethodParser();
    const methodFiles = methodParser.parseAllMethods();

    let totalMethods = 0;
    let methodsWithCodes = 0;
    let methodsWith429 = 0;
    let methodsWithout429 = 0;

    for (const file of methodFiles) {
      for (const method of file.methods) {
        totalMethods++;
        if (method.responseCodes) {
          methodsWithCodes++;
          const codes = method.responseCodes.map((rc) => rc.code);
          if (codes.includes('429')) {
            methodsWith429++;
          } else {
            methodsWithout429++;
          }
        }
      }
    }

    console.log(`Total methods: ${totalMethods}`);
    console.log(`Methods with specific response codes: ${methodsWithCodes}`);
    console.log(`Methods with 429 in specific codes: ${methodsWith429}`);
    console.log(`Methods with specific codes but no 429: ${methodsWithout429}`);
    console.log(
      `Methods using global codes: ${totalMethods - methodsWithCodes}`
    );

    // This test is just for statistics
    expect(totalMethods).toBeGreaterThan(0);
  });
});
