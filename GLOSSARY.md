# Unterwegs

A mobile client for a self-hosted AdventureLog server, used while travelling. The domain language is AdventureLog's; German words appear only in the UI and its translations.

## Accounts and integrations

**User**:
An AdventureLog account. The same user can own collections, collaborate on others, and connect external services.

**Integration**:
A connection between a user's AdventureLog account and an external service such as Immich, Strava, Endurain or Wanderer. Disconnecting removes the connection; it does not mean deleting previously imported locations, activities or trails. Images linked only from the external service may become unavailable.

## Collections

**Collection**:
A group of locations and optional lodging, transportations, notes, checklists and itinerary in AdventureLog. A collection can describe a journey, a weekend or another group of places. German UI: Sammlung.
_Avoid_: Trip, Reise

**Phase**:
Whether a collection is upcoming, current or past, judged by its start and end date.

**Owner**:
The user who created a collection. Only the owner changes the collection itself: its sharing, whether it is public or archived.

**Collaborator**:
Another AdventureLog user a collection is shared with; collaborators can change the collection's items and can leave the collection.
_Avoid_: Member (Mitglied is the UI word only), shared user

**Invite**:
The owner's offer to make another user a collaborator, pending until that user accepts or declines it or the owner withdraws it.
_Avoid_: Share request

**Public collection**:
A collection anyone with its link can read on the website without an account.

**Archived collection**:
A finished collection the owner has moved out of the main list; it can still be opened and restored.

## Things in a collection

**Location**:
A saved point of interest: a sight, restaurant, temple or shop. It can stand alone or belong to one or more collections, and has a category, images, visits and a rating. A scheduled visit, rather than the location itself, makes it upcoming.
_Avoid_: Place, Ort (UI word only), POI

**Category**:
The kind of a location (e.g. temple, food), with its own icon. Each user has their own categories; "general" is the fallback that always exists.

**Visit**:
A record that a location was visited, with a start and end and the time zone it happened in. A location counts as visited once it has a past visit.

**Rating**:
A location's score from 1 to 5 stars.

**Lodging**:
One booking for somewhere to sleep, from check-in to check-out, in the lodging's own time zone. Booking the same hotel twice is two lodgings.
_Avoid_: Stay, accommodation, Unterkunft (UI word only)

**Transportation**:
One leg of travel (flight, train, ferry, bus, car, …) from an origin to a destination, with departure and arrival each in its own time zone.
_Avoid_: Connection, transport, Verbindung (UI word only)

**Note**:
Free text (Markdown) with optional links and an optional date.

**Checklist**:
A named list of checklist items that can be ticked off, with an optional date.

**Checklist item**:
One line of a checklist, checked or unchecked.

**Image**:
A photo attached to a location, lodging or transportation. It is stored on the server, or linked from the user's Immich library (an Immich photo).

**Attachment**:
A file (usually a PDF such as a ticket or booking confirmation) attached to a location, lodging or transportation.

**Trail**:
A named route linked to a location, identified by an external link or a Wanderer reference.

**Activity**:
An activity recorded during a visit, with a sport type and optional distance, duration, climb and GPX track. An imported activity is distinct from its service integration.

## Days and the itinerary

**Itinerary**:
The day-by-day plan of a collection: the ordered itinerary items on each date.

**Itinerary item**:
A reference that puts one location, lodging, transportation, note or checklist on a date of the itinerary at a position. Removing it takes the object off that day; the object stays in the collection.
_Avoid_: Plan entry, entry

**Itinerary day**:
The title and description AdventureLog stores for one date of the itinerary.

**Day**:
One date within a collection's itinerary, numbered from 1, together with its itinerary day, its itinerary items and its dated items.

**Dated item**:
Something that appears on a day because of its own date, without an itinerary item: a transportation on its departure date, a note or checklist on its date. It cannot be reordered or removed from the day.

**Night lodging**:
The lodging where you sleep the night after a day: checked in on or before that date and checked out after it.

## Beyond one collection

**Country**:
A country of the world as AdventureLog lists it, divided into regions.

**Region**:
A first-level part of a country (a prefecture, a state).

**Visited region**:
A region the user has marked as visited. A country counts as visited once one of its regions is.

**City**:
A city within a region, as listed by AdventureLog.

**Visited city**:
A city the user has marked as visited. Marking a city can also mark its containing region.

**Calendar event**:
One dated entry across all of a user's collections: a collection's span, a transportation, a lodging, a visit or a dated note.

## Time

**Own time zone**:
The time zone a time belongs to: a lodging's zone for check-in / check-out, a transportation's departure or arrival zone, a visit's zone. Every time is shown in its own time zone, never the phone's.

**Collection time zone**:
The zone most of a collection's lodgings are in; the fallback whenever no more specific zone is known.

**Today**:
The current date in the time zone of tonight's night lodging, or the collection time zone when there is none. Decides which day "Heute" opens; before the collection starts that is day 1, after it ends the last day.

## On the device

**API key**:
A credential granting access as its user. Unterwegs keeps one for this device after sign-in; account settings can also create or revoke keys for other clients. Sign-out can leave the key intact or revoke it.

**Offline copy**:
The last loaded state of a collection, with its images and attachments, kept on the device so it can be read without a connection.

**Pending edit**:
A change to a collection made on the device that the server does not have yet. It shows at once, also in widgets and reminders, and is sent when there is a connection. When someone else changed the same thing meanwhile, their version stays and the user is told; a note changed on both sides is kept as a copy. Sharing, invites, archiving and creating a collection are never pending edits: they need the connection at the time.
_Avoid_: Offline change, queued change, outbox entry

**Offline map**:
A saved geographic area with a chosen level of detail, readable without a connection. It is separate from the collection's offline copy; a collection overview and detailed areas can be saved independently.

**Last updated**:
When the offline copy was last refreshed from the server ("Stand" in the UI).
