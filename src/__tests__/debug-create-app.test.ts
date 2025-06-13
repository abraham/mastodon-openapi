import { MethodParser } from '../../src/parsers/MethodParser';
import { ParameterParser } from '../../src/parsers/ParameterParser';
import * as fs from 'fs';
import matter from 'gray-matter';

describe('Create App Method Debug', () => {
  test('should show current create app method parsing', () => {
    const methodParser = new MethodParser();
    const methodFiles = methodParser.parseAllMethods();

    // Find the apps method file
    const appsMethodFile = methodFiles.find(file => 
      file.name.toLowerCase().includes('apps')
    );

    expect(appsMethodFile).toBeDefined();
    console.log('Apps method file found:', appsMethodFile!.name);
    console.log('Methods count:', appsMethodFile!.methods.length);
    
    // Find the create method
    const createMethod = appsMethodFile!.methods.find(method =>
      method.name.toLowerCase().includes('create') &&
      method.endpoint.includes('/api/v1/apps')
    );
    
    expect(createMethod).toBeDefined();
    
    if (createMethod) {
      console.log('\n=== CREATE APP METHOD ===');
      console.log('Name:', createMethod.name);
      console.log('Endpoint:', createMethod.endpoint);
      console.log('HTTP Method:', createMethod.httpMethod);
      console.log('Parameters count:', createMethod.parameters?.length || 0);
      
      if (createMethod.parameters) {
        console.log('\nParameters:');
        createMethod.parameters.forEach(param => {
          console.log(`- ${param.name}: ${param.schema?.type} (${param.in}) - ${param.description}`);
        });
      } else {
        console.log('No parameters found!');
      }
      
      console.log('\nResponse type:', createMethod.returns);
    }
  });
  
  test('should test parameter parsing directly from apps.md section', () => {
    const sampleSection = `## Create an application {#create}

\`\`\`http
POST /api/v1/apps HTTP/1.1
\`\`\`

Create a new application to obtain OAuth2 credentials.

##### Form data parameters

client_name
: {{<required>}} String. A name for your application

redirect_uris
: {{<required>}} String or Array of Strings. Where the user should be redirected after authorization. To display the authorization code to the user instead of redirecting to a web page, use \`urn:ietf:wg:oauth:2.0:oob\` in this parameter.

scopes
: String. Space separated list of scopes. If none is provided, defaults to \`read\`. See [OAuth Scopes]({{< relref "api/oauth-scopes" >}}) for a list of possible scopes.

website
: String. A URL to the homepage of your app`;

    console.log('\n=== TESTING PARAMETER PARSER DIRECTLY ===');
    const parameters = ParameterParser.parseAllParameters(sampleSection);
    console.log('Parameters found:', parameters.length);
    
    parameters.forEach(param => {
      console.log(`- ${param.name}: ${param.schema?.type} (${param.in}) - required: ${param.required} - ${param.description}`);
    });
  });

  test('should debug actual apps.md content and section splitting', () => {
    const appsPath = '/home/runner/work/mastodon-openapi/mastodon-openapi/mastodon-documentation/content/en/methods/apps.md';
    const content = fs.readFileSync(appsPath, 'utf8');
    const parsed = matter(content);
    
    console.log('\n=== ACTUAL APPS.MD CONTENT DEBUG ===');
    
    // Split sections like MethodParser does
    const methodSections = parsed.content.split(/(?=^##+ [^{]*\{#[^}]+\})/m);
    console.log('Total sections found:', methodSections.length);
    
    // Show all sections
    methodSections.forEach((section, index) => {
      const firstLine = section.split('\n')[0];
      console.log(`Section ${index}: "${firstLine}" (length: ${section.length})`);
    });
    
    // Find the create section
    const createSection = methodSections.find(section => 
      section.includes('Create an application') && 
      section.includes('POST /api/v1/apps')
    );
    
    if (createSection) {
      console.log('\n=== CREATE SECTION CONTENT ===');
      console.log('Section length:', createSection.length);
      
      // Check if it contains the form data parameters
      const hasFormData = createSection.includes('##### Form data parameters');
      console.log('Has Form data parameters section:', hasFormData);
      
      if (hasFormData) {
        console.log('\nTesting ParameterParser on actual section:');
        const params = ParameterParser.parseAllParameters(createSection);
        console.log('Parameters found:', params.length);
        params.forEach(param => {
          console.log(`- ${param.name}: ${param.schema?.type} (${param.in}) - required: ${param.required}`);
        });
      }
      
      // Show where the section ends to see what's being cut off
      console.log('\nEnd of create section:');
      console.log(createSection.slice(-500));
      
      // Check if we can find the form data parameters anywhere in the content
      if (!hasFormData) {
        console.log('\nSearching for form data parameters in full content...');
        const formDataIndex = parsed.content.indexOf('##### Form data parameters');
        if (formDataIndex !== -1) {
          console.log('Found form data parameters at index:', formDataIndex);
          console.log('Context around form data parameters:');
          console.log(parsed.content.substring(formDataIndex - 100, formDataIndex + 400));
        } else {
          console.log('Form data parameters not found in content at all!');
        }
      }
    } else {
      console.log('Create section not found!');
    }
  });
});