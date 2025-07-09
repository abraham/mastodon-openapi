import { ParameterParser } from '../../parsers/ParameterParser';

describe('ParameterParser - Conditional Required Handling', () => {
  it('should not mark parameters as required when "required" is conditional', () => {
    const section = `
##### Form data parameters

date_of_birth
: String ([Date](/api/datetime-format#date)), required if the server has a minimum age requirement.

username
: String. The desired username for the account.

email
: String. The email address to be used for login. {{<required>}}

password
: String. The password to be used for login. {{<required>}}

optional_param
: String. This is optional and mentions required in the description but is not required itself.
`;

    const parameters = ParameterParser.parseAllParameters(section);
    
    // Debug: print all parameters found
    console.log('Parameters found:', parameters.map(p => ({ name: p.name, required: p.required })));
    
    // Find the specific parameters
    const dateOfBirth = parameters.find(p => p.name === 'date_of_birth');
    const username = parameters.find(p => p.name === 'username');
    const email = parameters.find(p => p.name === 'email');
    const password = parameters.find(p => p.name === 'password');
    const optionalParam = parameters.find(p => p.name === 'optional_param');
    
    expect(dateOfBirth).toBeDefined();
    expect(username).toBeDefined();
    expect(email).toBeDefined();
    expect(password).toBeDefined();
    expect(optionalParam).toBeDefined();
    
    // date_of_birth should NOT be required (conditional "required if...")
    expect(dateOfBirth?.required).toBeFalsy();
    
    // username should NOT be required (no required marker)
    expect(username?.required).toBeFalsy();
    
    // email should be required (has {{<required>}} marker)
    expect(email?.required).toBe(true);
    
    // password should be required (has {{<required>}} marker)
    expect(password?.required).toBe(true);
    
    // optional_param should NOT be required (just mentions "required" in description)
    expect(optionalParam?.required).toBeFalsy();
  });

  it('should handle various conditional required patterns', () => {
    const section = `
##### Form data parameters

param1
: String. This is required if certain conditions are met.

param2
: String. The parameter is required when the user chooses option A.

param3
: String. Required only if other_param is provided.

param4
: String. Must be provided if required by the server configuration.

definite_required
: String. This parameter is required. {{<required>}}
`;

    const parameters = ParameterParser.parseAllParameters(section);
    
    // Find the specific parameters
    const param1 = parameters.find(p => p.name === 'param1');
    const param2 = parameters.find(p => p.name === 'param2');
    const param3 = parameters.find(p => p.name === 'param3');
    const param4 = parameters.find(p => p.name === 'param4');
    const definiteRequired = parameters.find(p => p.name === 'definite_required');
    
    // All conditional parameters should NOT be required
    expect(param1?.required).toBeFalsy();
    expect(param2?.required).toBeFalsy();
    expect(param3?.required).toBeFalsy();
    expect(param4?.required).toBeFalsy();
    
    // Only the one with explicit marker should be required
    expect(definiteRequired?.required).toBe(true);
  });
});