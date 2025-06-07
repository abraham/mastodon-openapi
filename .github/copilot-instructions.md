# GitHub Copilot Instructions

## Development Workflow

When working on this project, please follow these essential steps:

### Testing

Run the test suite to ensure all functionality works correctly:

```bash
npm test
```

### Code Formatting

Format the code to maintain consistent style across the project:

```bash
npm run format
```

### Additional Commands

- **Linting**: Check for code quality issues with `npm run lint`
- **Building**: Compile TypeScript with `npm run build`
- **Generate Schema**: Create OpenAPI schema with `npm run generate`
- **Validate Schema**: Verify OpenAPI schema with `npm run validate`

### Project Structure

This project generates OpenAPI schemas for the Mastodon API by parsing documentation files and entity definitions. The main source code is in the `src/` directory with TypeScript files, tests are in `src/__tests__/`, and the generated schema is output to `dist/schema.json`.
