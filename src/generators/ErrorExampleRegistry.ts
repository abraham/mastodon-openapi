import { ApiMethodsFile } from '../interfaces/ApiMethodsFile';

/**
 * Registry for collecting and managing error response examples across all API methods
 */
export class ErrorExampleRegistry {
  private errorExamples: Map<string, any> = new Map();

  /**
   * Collect error examples from all method files
   * Only collects examples for error status codes (4xx, 5xx)
   */
  public collectErrorExamples(methodFiles: ApiMethodsFile[]): void {
    for (const methodFile of methodFiles) {
      for (const method of methodFile.methods) {
        if (method.responseExamples) {
          for (const [statusCode, example] of Object.entries(
            method.responseExamples
          )) {
            // Only collect error status codes (4xx, 5xx)
            if (this.isErrorStatusCode(statusCode)) {
              // Store the first example we find for each status code
              // This prioritizes examples found in earlier files/methods
              if (!this.errorExamples.has(statusCode)) {
                this.errorExamples.set(statusCode, example);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Get the common error example for a status code
   */
  public getErrorExample(statusCode: string): any | null {
    return this.errorExamples.get(statusCode) || null;
  }

  /**
   * Get all collected error examples
   */
  public getAllErrorExamples(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [statusCode, example] of this.errorExamples.entries()) {
      result[statusCode] = example;
    }
    return result;
  }

  /**
   * Check if a status code represents an error (4xx or 5xx)
   */
  private isErrorStatusCode(statusCode: string): boolean {
    const code = parseInt(statusCode, 10);
    return code >= 400 && code < 600;
  }

  /**
   * Clear all collected examples (useful for testing)
   */
  public clear(): void {
    this.errorExamples.clear();
  }
}
