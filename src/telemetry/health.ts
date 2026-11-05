import Constants from 'expo-constants';
import { Observe } from 'expo-observe';

const enabled = !!Constants.expoConfig?.extra?.eas?.observe?.endpointUrl;

// No navigation parameters, network requests, custom attributes or user/account identifiers.
// Without ClickHouse, xprem only keeps installation metadata and current update-health state.
Observe.configure({
  dispatchingEnabled: enabled,
  dispatchInDebug: false,
  networkTraces: false,
  integrations: {},
});

let started = false;

/** Call after session/cache restoration and the first usable frame, never wait for telemetry. */
export function reportAppStarted(): void {
  if (!enabled || started) return;
  started = true;
  try {
    Observe.logEvent('app_started');
    // Also flush any fatal report persisted by the previous launch. Offline dispatch is best effort.
    void Observe.dispatchEvents().catch(() => {});
  } catch {
    // Reporting must never prevent reading the offline copy.
  }
}
