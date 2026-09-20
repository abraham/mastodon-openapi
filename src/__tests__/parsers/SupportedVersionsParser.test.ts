import { SupportedVersionsParser } from '../../parsers/SupportedVersionsParser';

const SECURITY_MD = `# Security Policy

## Scope

A "vulnerability in Mastodon" is a vulnerability in the code.

## Supported Versions

| Version | Supported        |
| ------- | ---------------- |
| 4.7.0   | Yes              |
| 4.6.0   | Yes              |
| 4.5.x   | Until 2027-02-20 |
| 4.4.x   | Until 2026-12-17 |
| < 4.4   | No               |
`;

describe('SupportedVersionsParser', () => {
  describe('parseContent', () => {
    it('should derive the supported version window', () => {
      expect(SupportedVersionsParser.parseContent(SECURITY_MD)).toEqual({
        minimum: '4.4.0',
        maximum: '4.7.0',
      });
    });

    it('should normalize x patch versions to 0', () => {
      const content = `## Supported Versions

| Version | Supported |
| ------- | --------- |
| 4.5.x   | Yes       |
`;
      expect(SupportedVersionsParser.parseContent(content)).toEqual({
        minimum: '4.5.0',
        maximum: '4.5.0',
      });
    });

    it('should ignore rows marked as unsupported', () => {
      const content = `## Supported Versions

| Version | Supported |
| ------- | --------- |
| 4.7.0   | Yes       |
| 4.0.0   | No        |
`;
      expect(SupportedVersionsParser.parseContent(content).minimum).toBe(
        '4.7.0'
      );
    });

    it('should treat "Until <date>" rows as supported regardless of the date', () => {
      const content = `## Supported Versions

| Version | Supported        |
| ------- | ---------------- |
| 4.7.0   | Yes              |
| 4.4.x   | Until 2000-01-01 |
`;
      expect(SupportedVersionsParser.parseContent(content).minimum).toBe(
        '4.4.0'
      );
    });

    it('should ignore comparison rows such as "< 4.4"', () => {
      expect(
        SupportedVersionsParser.parseContent(SECURITY_MD).minimum
      ).not.toContain('<');
    });

    it('should stop at the next section heading', () => {
      const content = `## Supported Versions

| Version | Supported |
| ------- | --------- |
| 4.7.0   | Yes       |

## Something Else

| Version | Supported |
| ------- | --------- |
| 1.0.0   | Yes       |
`;
      expect(SupportedVersionsParser.parseContent(content)).toEqual({
        minimum: '4.7.0',
        maximum: '4.7.0',
      });
    });

    it('should throw when the section is missing', () => {
      expect(() => SupportedVersionsParser.parseContent('# Nothing')).toThrow(
        /no "## Supported Versions" section/
      );
    });

    it('should throw when no version is supported', () => {
      const content = `## Supported Versions

| Version | Supported |
| ------- | --------- |
| < 4.4   | No        |
`;
      expect(() => SupportedVersionsParser.parseContent(content)).toThrow(
        /lists no supported versions/
      );
    });
  });

  describe('parse', () => {
    it('should read the vendored SECURITY.md', () => {
      SupportedVersionsParser.reset();
      const versions = SupportedVersionsParser.parse();

      expect(versions.minimum).toMatch(/^\d+\.\d+\.\d+$/);
      expect(versions.maximum).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});
