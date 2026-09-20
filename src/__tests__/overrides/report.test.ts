import {
  appliedOverrides,
  reportOverride,
  resetOverrideReports,
} from '../../overrides/report';

describe('reportOverride', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    resetOverrideReports();
    warn = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    warn.mockRestore();
    resetOverrideReports();
  });

  it('warns once per distinct override', () => {
    reportOverride('version-conflict', '/statuses');
    reportOverride('version-conflict', '/statuses');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(appliedOverrides()).toEqual([
      '[override:version-conflict] /statuses',
    ]);
  });

  it('keeps distinct details apart', () => {
    reportOverride('version-conflict', '/statuses');
    reportOverride('version-conflict', '/filters');

    expect(warn).toHaveBeenCalledTimes(2);
    expect(appliedOverrides()).toHaveLength(2);
  });

  it('includes the reason when given', () => {
    reportOverride('workaround', 'something skipped', 'because of X');

    expect(warn).toHaveBeenCalledWith(
      '[override:workaround] something skipped — because of X'
    );
  });
});
