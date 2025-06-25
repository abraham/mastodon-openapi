import * as fs from 'fs';
import * as path from 'path';
import { OpenAPILicense } from '../interfaces/OpenAPISchema';

/**
 * Parser for LICENSE file to extract license information for OpenAPI spec
 */
class LicenseParser {
  private licensePath: string;

  constructor() {
    this.licensePath = path.join(__dirname, '../../LICENSE');
  }

  /**
   * Parse LICENSE file and return OpenAPI license object
   */
  public parseLicense(): OpenAPILicense | undefined {
    if (!fs.existsSync(this.licensePath)) {
      console.warn(`LICENSE file does not exist: ${this.licensePath}`);
      return undefined;
    }

    try {
      const content = fs.readFileSync(this.licensePath, 'utf-8');
      return this.extractLicenseFromContent(content);
    } catch (error) {
      console.error('Error reading LICENSE file:', error);
      return undefined;
    }
  }

  /**
   * Extract license information from LICENSE file content
   */
  private extractLicenseFromContent(
    content: string
  ): OpenAPILicense | undefined {
    const firstLine = content.split('\n')[0]?.trim();

    if (!firstLine) {
      return undefined;
    }

    // Check for MIT License
    if (firstLine.toLowerCase().includes('mit license')) {
      return {
        name: 'MIT',
        identifier: 'MIT',
      };
    }

    // Check for Apache License
    if (firstLine.toLowerCase().includes('apache license')) {
      return {
        name: 'Apache 2.0',
        identifier: 'Apache-2.0',
      };
    }

    // Check for BSD License
    if (firstLine.toLowerCase().includes('bsd license')) {
      return {
        name: 'BSD',
        identifier: 'BSD-3-Clause',
      };
    }

    // Check for GPL License
    if (
      firstLine.toLowerCase().includes('gpl') ||
      firstLine.toLowerCase().includes('general public license')
    ) {
      return {
        name: 'GPL',
        identifier: 'GPL-3.0',
      };
    }

    // If we can't identify the license type, return a generic license with the first line as name
    return {
      name: firstLine,
    };
  }
}

export { LicenseParser };
