import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

interface EntityAttribute {
  name: string;
  type: string;
  description: string;
  optional?: boolean;
  deprecated?: boolean;
}

interface EntityClass {
  name: string;
  description: string;
  attributes: EntityAttribute[];
}

interface ApiParameter {
  name: string;
  description: string;
  required?: boolean;
  type?: string;
}

interface ApiMethod {
  name: string;
  httpMethod: string;
  endpoint: string;
  description: string;
  parameters?: ApiParameter[];
  returns?: string;
  oauth?: string;
  version?: string;
}

interface ApiMethodsFile {
  name: string;
  description: string;
  methods: ApiMethod[];
}

class EntityParser {
  private entitiesPath: string;

  constructor() {
    this.entitiesPath = path.join(__dirname, '../mastodon-documentation/content/en/entities');
  }

  public parseAllEntities(): EntityClass[] {
    const entities: EntityClass[] = [];
    
    if (!fs.existsSync(this.entitiesPath)) {
      console.error(`Entities path does not exist: ${this.entitiesPath}`);
      return entities;
    }

    const files = fs.readdirSync(this.entitiesPath).filter(file => file.endsWith('.md'));
    
    for (const file of files) {
      try {
        const entity = this.parseEntityFile(path.join(this.entitiesPath, file));
        if (entity) {
          entities.push(entity);
        }
      } catch (error) {
        console.error(`Error parsing file ${file}:`, error);
      }
    }

    return entities;
  }

  private parseEntityFile(filePath: string): EntityClass | null {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(content);
    
    // Extract class name from frontmatter title
    const className = parsed.data.title;
    if (!className) {
      console.warn(`No title found in ${filePath}`);
      return null;
    }

    // Extract description from frontmatter
    const description = parsed.data.description || '';

    // Parse attributes from markdown content
    const attributes = this.parseAttributes(parsed.content);

    return {
      name: className,
      description,
      attributes
    };
  }

  private parseAttributes(content: string): EntityAttribute[] {
    const attributes: EntityAttribute[] = [];
    
    // Find the "## Attributes" section
    const attributesMatch = content.match(/## Attributes\s*([\s\S]*?)(?=\n## |$)/);
    if (!attributesMatch) {
      return attributes;
    }

    const attributesSection = attributesMatch[1];
    
    // Match each attribute definition
    const attributeRegex = /### `([^`]+)`[^{]*(?:\{\{%([^%]+)%\}\})?\s*\{#[^}]+\}\s*\n\n\*\*Description:\*\*\s*([^\n]+).*?\n\*\*Type:\*\*\s*([^\n]+)/g;
    
    let match;
    while ((match = attributeRegex.exec(attributesSection)) !== null) {
      const [, name, modifiers, description, type] = match;
      
      const attribute: EntityAttribute = {
        name: name.trim(),
        type: this.cleanType(type.trim()),
        description: this.cleanDescription(description.trim())
      };

      // Check for optional/deprecated modifiers
      if (modifiers) {
        if (modifiers.includes('optional')) {
          attribute.optional = true;
        }
        if (modifiers.includes('deprecated')) {
          attribute.deprecated = true;
        }
      }

      attributes.push(attribute);
    }

    return attributes;
  }

  private cleanType(type: string): string {
    // Remove markdown formatting and extra text
    return type
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\{\{<[^>]+>\}\}/g, '') // Remove Hugo shortcodes
      .replace(/\\\s*$/, '') // Remove trailing backslashes
      .trim();
  }

  private cleanDescription(description: string): string {
    // Remove markdown formatting and trailing backslashes
    return description
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\\\s*$/, '') // Remove trailing backslashes
      .trim();
  }
}

class MethodParser {
  private methodsPath: string;

  constructor() {
    this.methodsPath = path.join(__dirname, '../mastodon-documentation/content/en/methods');
  }

  public parseAllMethods(): ApiMethodsFile[] {
    const methodFiles: ApiMethodsFile[] = [];
    
    if (!fs.existsSync(this.methodsPath)) {
      console.error(`Methods path does not exist: ${this.methodsPath}`);
      return methodFiles;
    }

    const files = fs.readdirSync(this.methodsPath).filter(file => 
      file.endsWith('.md') && fs.statSync(path.join(this.methodsPath, file)).isFile()
    );
    
    for (const file of files) {
      try {
        const methodFile = this.parseMethodFile(path.join(this.methodsPath, file));
        if (methodFile) {
          methodFiles.push(methodFile);
        }
      } catch (error) {
        console.error(`Error parsing method file ${file}:`, error);
      }
    }

    return methodFiles;
  }

  private parseMethodFile(filePath: string): ApiMethodsFile | null {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = matter(content);
    
    // Extract file name from frontmatter title
    const fileName = parsed.data.title || path.basename(filePath, '.md');
    if (!fileName) {
      console.warn(`No title found in ${filePath}`);
      return null;
    }

    // Extract description from frontmatter
    const description = parsed.data.description || '';

    // Parse methods from markdown content
    const methods = this.parseMethods(parsed.content);

    return {
      name: fileName,
      description,
      methods
    };
  }

  private parseMethods(content: string): ApiMethod[] {
    const methods: ApiMethod[] = [];
    
    // Match method sections: ## Method Name {#anchor}
    const methodSections = content.split(/(?=^## [^{]*\{#[^}]+\})/m);
    
    for (const section of methodSections) {
      if (section.trim() === '') continue;
      
      const method = this.parseMethodSection(section);
      if (method) {
        methods.push(method);
      }
    }

    return methods;
  }

  private parseMethodSection(section: string): ApiMethod | null {
    // Extract method name from header: ## Method Name {#anchor}
    const nameMatch = section.match(/^## ([^{]+)\{#[^}]+\}/m);
    if (!nameMatch) return null;
    
    const name = nameMatch[1].trim();

    // Extract HTTP method and endpoint: ```http\nMETHOD /path\n```
    const httpMatch = section.match(/```http\s*\n([A-Z]+)\s+([^\s\n]+)[^\n]*\n```/);
    if (!httpMatch) return null;
    
    const httpMethod = httpMatch[1].trim();
    const endpoint = httpMatch[2].trim();

    // Extract description (first paragraph after the endpoint)
    const descriptionMatch = section.match(/```http[^`]*```\s*\n\n([^*\n][^\n]*)/);
    const description = descriptionMatch ? descriptionMatch[1].trim() : '';

    // Extract returns, oauth, version info
    const returnsMatch = section.match(/\*\*Returns:\*\*\s*([^\\\n]+)/);
    const returns = returnsMatch ? this.cleanMarkdown(returnsMatch[1].trim()) : undefined;
    
    const oauthMatch = section.match(/\*\*OAuth:\*\*\s*([^\\\n]+)/);
    const oauth = oauthMatch ? this.cleanMarkdown(oauthMatch[1].trim()) : undefined;
    
    const versionMatch = section.match(/\*\*Version history:\*\*\s*([^\n]*)/);
    const version = versionMatch ? this.cleanMarkdown(versionMatch[1].trim()) : undefined;

    // Parse parameters from Form data parameters section
    const parameters = this.parseParameters(section);

    return {
      name,
      httpMethod,
      endpoint,
      description,
      parameters: parameters.length > 0 ? parameters : undefined,
      returns,
      oauth,
      version
    };
  }

  private parseParameters(section: string): ApiParameter[] {
    const parameters: ApiParameter[] = [];
    
    // Find parameters section
    const paramMatch = section.match(/##### Form data parameters\s*([\s\S]*?)(?=\n#|$)/);
    if (!paramMatch) return parameters;

    const paramSection = paramMatch[1];
    
    // Match parameter definitions: parameter_name\n: description
    const paramRegex = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\n:\s*([^]*?)(?=\n[a-zA-Z_]|\n\n|$)/gm;
    
    let match;
    while ((match = paramRegex.exec(paramSection)) !== null) {
      const [, name, desc] = match;
      
      const cleanDesc = this.cleanMarkdown(desc.trim());
      const required = cleanDesc.includes('{{<required>}}') || cleanDesc.includes('required');
      
      parameters.push({
        name: name.trim(),
        description: cleanDesc.replace(/\{\{<required>\}\}\s*/g, ''),
        required: required ? true : undefined
      });
    }

    return parameters;
  }

  private cleanMarkdown(text: string): string {
    return text
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\{\{<[^>]+>\}\}/g, '') // Remove Hugo shortcodes
      .replace(/\[[^\]]*\]\([^)]*\)/g, '') // Remove markdown links
      .replace(/\\\s*$/, '') // Remove trailing backslashes
      .trim();
  }
}

function main() {
  console.log('Parsing Mastodon entity files...');
  
  const parser = new EntityParser();
  const entities = parser.parseAllEntities();
  
  console.log(`\nFound ${entities.length} entities:\n`);
  
  for (const entity of entities) {
    console.log(`Class: ${entity.name}`);
    console.log(`Description: ${entity.description}`);
    console.log(`Attributes (${entity.attributes.length}):`);
    
    for (const attr of entity.attributes) {
      const modifiers = [];
      if (attr.optional) modifiers.push('optional');
      if (attr.deprecated) modifiers.push('deprecated');
      const modifierText = modifiers.length > 0 ? ` [${modifiers.join(', ')}]` : '';
      
      console.log(`  - ${attr.name}: ${attr.type}${modifierText}`);
    }
    console.log('');
  }
  
  console.log(`Total entities parsed: ${entities.length}`);

  console.log('\nParsing Mastodon API method files...');
  
  const methodParser = new MethodParser();
  const methodFiles = methodParser.parseAllMethods();
  
  console.log(`\nFound ${methodFiles.length} method files:\n`);
  
  for (const methodFile of methodFiles) {
    console.log(`File: ${methodFile.name}`);
    console.log(`Description: ${methodFile.description}`);
    console.log(`Methods (${methodFile.methods.length}):`);
    
    for (const method of methodFile.methods) {
      console.log(`  - ${method.httpMethod} ${method.endpoint}`);
      console.log(`    Name: ${method.name}`);
      console.log(`    Description: ${method.description}`);
      if (method.returns) console.log(`    Returns: ${method.returns}`);
      if (method.oauth) console.log(`    OAuth: ${method.oauth}`);
      if (method.parameters && method.parameters.length > 0) {
        console.log(`    Parameters (${method.parameters.length}):`);
        for (const param of method.parameters) {
          const reqText = param.required ? ' [required]' : '';
          console.log(`      - ${param.name}: ${param.description}${reqText}`);
        }
      }
    }
    console.log('');
  }
  
  console.log(`Total method files parsed: ${methodFiles.length}`);
  const totalMethods = methodFiles.reduce((sum, file) => sum + file.methods.length, 0);
  console.log(`Total API methods parsed: ${totalMethods}`);
}

if (require.main === module) {
  main();
}

export { EntityParser, EntityClass, EntityAttribute, MethodParser, ApiMethodsFile, ApiMethod, ApiParameter };