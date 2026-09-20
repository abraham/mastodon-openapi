import { relrefToUrl, resolveRelrefs } from '../../document/shortcodes';

describe('relrefToUrl', () => {
  it('builds a docs URL from a path', () => {
    expect(relrefToUrl('entities/Account')).toBe(
      'https://docs.joinmastodon.org/entities/Account/'
    );
  });

  it('keeps the anchor', () => {
    expect(relrefToUrl('methods/accounts#update_credentials')).toBe(
      'https://docs.joinmastodon.org/methods/accounts/#update_credentials'
    );
  });
});

describe('resolveRelrefs', () => {
  it('replaces the shortcode inside a markdown link', () => {
    expect(
      resolveRelrefs('See [Account]({{< relref "entities/Account" >}}).')
    ).toBe('See [Account](https://docs.joinmastodon.org/entities/Account/).');
  });

  it('replaces several shortcodes on one line', () => {
    const input =
      '[a]({{< relref "entities/Account#source-privacy" >}}) and [b]({{< relref "entities/Status" >}})';

    expect(resolveRelrefs(input)).toBe(
      '[a](https://docs.joinmastodon.org/entities/Account/#source-privacy) and ' +
        '[b](https://docs.joinmastodon.org/entities/Status/)'
    );
  });

  it('leaves shortcodes inside fenced samples alone', () => {
    const input =
      '```json\n{ "x": "{{< relref \\"entities/Account\\" >}}" }\n```';
    expect(resolveRelrefs(input)).toBe(input);
  });

  it('returns content without shortcodes unchanged', () => {
    expect(resolveRelrefs('plain text')).toBe('plain text');
  });
});
