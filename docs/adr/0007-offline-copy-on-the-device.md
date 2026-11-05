# The offline copy lives in SQLite and the documents folder

The TanStack Query cache is persisted to `expo-sqlite/kv-store` (an Expo module, so no extra native dependency like MMKV) with ordinary reading queries retained, and images and attachments are downloaded with the API key into the documents directory, which the OS doesn't clear like the cache directory. With cached data the app never shows an error screen, only how fresh the data is. The persisted cache is dropped when the app version changes, so an old shape is never read by new code.

Credential-bearing account/integration configuration and OAuth queries opt out of persistence (`meta.persist: false`) and have short lifetimes. Native offline-map packs live in MapLibre's separate store ([0009](0009-maplibre-with-openfreemap.md)); clearing the image/PDF cache does not delete those packs.
