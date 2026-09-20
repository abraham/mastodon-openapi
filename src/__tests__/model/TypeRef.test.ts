import { UtilityHelpers } from '../../generators/UtilityHelpers';
import { parseTypeRef } from '../../model/parseTypeRef';
import { typeRefToProperty } from '../../model/typeRefToProperty';
import { unknownLeaves } from '../../model/TypeRef';
import corpus from '../fixtures/type-corpus.json';
import expectations from '../fixtures/type-expectations.json';

/**
 * Every distinct type string the pipeline sees on a real run, harvested by
 * instrumenting TypeParser.parseType, with the property each one rendered to
 * before TypeParser was reduced to a delegate. Comparing against recorded
 * values rather than against the live implementation keeps this a real check.
 */
describe('TypeRef', () => {
  const utilityHelpers = new UtilityHelpers();

  const render = (value: string) =>
    typeRefToProperty(parseTypeRef(value), utilityHelpers);

  it('covers the documented corpus', () => {
    expect(corpus.length).toBeGreaterThan(150);
    expect(Object.keys(expectations)).toHaveLength(corpus.length);
  });

  it.each(corpus)('renders %j as recorded', (value: string) => {
    expect(render(value)).toEqual(
      (expectations as Record<string, unknown>)[value]
    );
  });

  describe('resolution', () => {
    it('resolves arrays of entities', () => {
      expect(parseTypeRef('Array of [Account]')).toEqual({
        kind: 'array',
        items: { kind: 'entity', name: 'Account' },
      });
    });

    it('resolves multiple entity references as a union', () => {
      expect(parseTypeRef('[Account] or [Status]')).toEqual({
        kind: 'union',
        options: [
          { kind: 'entity', name: 'Account' },
          { kind: 'entity', name: 'Status' },
        ],
      });
    });

    it('ignores documentation links that are not entities', () => {
      expect(parseTypeRef('String (ISO 8601 [Datetime])')).toEqual({
        kind: 'primitive',
        type: 'string',
        format: 'date-time',
      });
    });

    it('keeps namespaced entity names unsanitized', () => {
      expect(parseTypeRef('[Admin::Ip]')).toEqual({
        kind: 'entity',
        name: 'Admin::Ip',
      });
    });

    it('marks HTML strings', () => {
      expect(parseTypeRef('String (HTML)')).toEqual({
        kind: 'primitive',
        type: 'string',
        html: true,
      });
    });

    it('reports unresolved prose as unknown', () => {
      const ref = parseTypeRef('Something entirely undocumented');
      expect(ref).toEqual({
        kind: 'unknown',
        raw: 'Something entirely undocumented',
      });
      expect(unknownLeaves(ref)).toHaveLength(1);
    });
  });

  describe('unknown budget', () => {
    it('does not grow', () => {
      const unresolved = corpus.filter(
        (value: string) => unknownLeaves(parseTypeRef(value)).length > 0
      );

      expect(unresolved.sort()).toEqual([]);
    });
  });
});
