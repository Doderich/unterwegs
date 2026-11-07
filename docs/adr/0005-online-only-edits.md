# Edits need a connection

Partly superseded by [0016](0016-offline-edits-through-an-outbox.md): checklists, notes, "visited today" and ratings can now be made offline. Everything else below still holds.

Reading works offline; every edit is sent to the server right away and is refused without a connection ("Bearbeiten geht nur mit Internet."). An offline queue would need conflict handling against edits from other family members and the website, which AdventureLog gives no versioning for; that is a project of its own, and reading offline stays the priority. Collection edits generally show at once (optimistic update), roll back with an alert if the server refuses them, and refetch afterwards. Collection-level actions and account/integration writes wait for confirmation through `useOnlineAction` or the relevant action hook, then refresh affected queries. Concurrent edits: last write wins.
