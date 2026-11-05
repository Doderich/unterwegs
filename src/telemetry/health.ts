import Constants from 'expo-constants';
import { Observe } from 'expo-observe';

import { getSettings, subscribeSettings } from '@/settings/store';

/** Builds with an update server report health to it; the settings switch can turn that off. */
export const healthReportsAvailable = !!Constants.expoConfig?.extra?.eas?.observe?.endpointUrl;

function dispatching(): boolean {
  return healthReportsAvailable && getSettings().healthReports;
}

// No navigation parameters, network requests, custom attributes or user/account identifiers.
// Without ClickHouse, xprem only keeps installation metadata and current update-health state.
// With dispatching off, Observe marks pending reports as sent without sending them.
function configure() {
  Observe.configure({
    dispatchingEnabled: dispatching(),
    dispatchInDebug: false,
    networkTraces: false,
    integrations: {},
  });
}
configure();

let reporting = dispatching();
subscribeSettings(() => {
  if (dispatching() === reporting) return;
  reporting = dispatching();
  configure();
});

let started = false;

/** Call after session/cache restoration and the first usable frame, never wait for telemetry. */
export function reportAppStarted(): void {
  if (!dispatching() || started) return;
  started = true;
  try {
    Observe.logEvent('app_started');
    // Also flush any fatal report persisted by the previous launch. Offline dispatch is best effort.
    void Observe.dispatchEvents().catch(() => {});
  } catch {
    // Reporting must never prevent reading the offline copy.
  }
}
