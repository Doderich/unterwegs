const mockConfigure = jest.fn();
const mockLogEvent = jest.fn();
const mockDispatch = jest.fn();
let mockEndpoint: string | undefined;

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra: { eas: { observe: { endpointUrl: mockEndpoint } } } };
    },
  },
}));
jest.mock('expo-sqlite/kv-store', () => ({ Storage: { getItemSync: jest.fn(), setItemSync: jest.fn() } }));
jest.mock('expo-observe', () => ({
  Observe: { configure: mockConfigure, logEvent: mockLogEvent, dispatchEvents: mockDispatch },
}));

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  mockEndpoint = 'https://updates.example.org/observe/example-app';
  mockDispatch.mockResolvedValue(undefined);
});

it('sends a single payload-free startup signal and flushes pending crash reports', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- isolate the per-launch state
  const { reportAppStarted } = require('../telemetry/health');
  reportAppStarted();
  reportAppStarted();
  expect(mockLogEvent.mock.calls).toEqual([['app_started']]);
  expect(mockDispatch).toHaveBeenCalledTimes(1);
  expect(mockConfigure).toHaveBeenCalledWith({
    dispatchingEnabled: true,
    dispatchInDebug: false,
    networkTraces: false,
    integrations: {},
  });
});

it('does not dispatch to a hosted default when no self-hosted endpoint is configured', () => {
  mockEndpoint = undefined;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { reportAppStarted } = require('../telemetry/health');
  reportAppStarted();
  expect(mockConfigure).toHaveBeenCalledWith(expect.objectContaining({ dispatchingEnabled: false }));
  expect(mockLogEvent).not.toHaveBeenCalled();
  expect(mockDispatch).not.toHaveBeenCalled();
});

it('keeps startup usable when offline dispatch fails', async () => {
  mockDispatch.mockRejectedValueOnce(new Error('offline'));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { reportAppStarted } = require('../telemetry/health');
  expect(() => reportAppStarted()).not.toThrow();
  await Promise.resolve();
});

it('stops reporting when the user turns health reports off, and resumes when turned on', () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { updateSettings } = require('../settings/store');
  const { reportAppStarted } = require('../telemetry/health');
  /* eslint-enable @typescript-eslint/no-require-imports */
  updateSettings({ healthReports: false });
  expect(mockConfigure).toHaveBeenLastCalledWith(expect.objectContaining({ dispatchingEnabled: false }));
  reportAppStarted();
  expect(mockLogEvent).not.toHaveBeenCalled();
  updateSettings({ healthReports: true });
  expect(mockConfigure).toHaveBeenLastCalledWith(expect.objectContaining({ dispatchingEnabled: true }));
});
