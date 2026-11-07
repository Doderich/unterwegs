# Widgets, reminders and Live Activities come from the offline copy

AdventureLog sends no push notifications and has no hook the app could subscribe to. Widgets, local notifications (reminders) and iOS Live Activities are therefore computed on the phone from the offline copy of each collection ([0007](0007-offline-copy-on-the-device.md)). Whenever the app writes a collection to that copy, or comes to the foreground, it recomputes the next glances. It writes widget snapshots and iOS timelines, schedules reminders, and updates any running Live Activity. Nothing new is sent to a server. Everything keeps working in airplane mode, and it is right as of the last sync.

Both platforms use the Expo modules: `expo-widgets` for home-screen and lock-screen widgets and Live Activities, and `expo-notifications` for reminders. The widget runtime cannot import app code or call `tr()`. The app therefore passes finished, already-translated strings and preformatted times in each object's own zone ([0006](0006-times-in-their-own-time-zone.md)) as props. Each reminder is scheduled for an absolute instant, so it fires at the right moment wherever the phone is.

Remote push is not part of this decision. The iOS APNs entitlement stays off (`enableRemoteNotifications: false`, no `enablePushNotifications` for widgets). Invites, collaborator changes and server-pushed Live Activity updates would need a relay that polls the server and sends collection content through APNs/FCM. That relay is a separate decision, with its own privacy, hosting and store-label consequences.

Consequences:

- Adding the modules is a native change: a `version` bump and new builds. OTA updates can change only what glances show and when.
- Widget data leaves the app sandbox for the App Group container. It holds only what a glance shows, and every sign-out (`useGlances`) empties it, cancels every reminder and ends running Live Activities.
- Without a background refresh, a glance is only as fresh as the last time the app ran. Each one shows its sync age when that matters, and a stale snapshot never claims to be current.
- iOS keeps at most 64 pending local notifications, so the app schedules only the soonest ones and tops up on each recompute. Android 14 and later deny exact alarms by default, so reminders are inexact unless the user grants exact alarms.
- iOS can start a Live Activity only while the app is in the foreground (push-to-start would need APNs). The app therefore starts it whenever it is opened on a travel day, unless the user has turned that off in Settings.
- The details are in [docs/GLANCES.md](../GLANCES.md).
