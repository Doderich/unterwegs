# Unterwegs on iPad

Status: proposal. Nothing here is shipped. [DESIGN.md](../DESIGN.md) still describes the single column the phone uses. This document is the layout for a regular-width window. It does not move work ahead of the phone checks in [ROADMAP.md](ROADMAP.md).

The iPad is the same trip, with more of it visible at once. At the hotel desk the day stays on screen while the booking number is open. On the train the map stays up while a location is open. The website remains the place for planning at a desk. Reading, light edits, and offline use stay the app's job, with the same rules as on the phone: one collection request, times in their own zone, edits only online.

## Target

Add iPad to the existing iOS app (`ios.supportsTablet`). One TestFlight build covers iPhone and iPad. The iPhone stays portrait. The iPad rotates, and it joins Slide Over, Split View, and Stage Manager. A regular-width window of this same iPad app on an Apple Silicon Mac follows these rules too. That window is a way to look at the layout. It is not a Mac app, and SDK 58 cannot build one.

The layout follows the window, not the device name. iOS 27 can already resize an iPhone app on an iPad, and a portrait lock is only a preference there. Targeting iPad is how that window gets this layout on purpose.

| Window | What you see |
| --- | --- |
| Compact (iPhone, Slide Over, a narrow Split View) | The phone, unchanged: bottom tabs, a collection's own tabs, details pushed, the map preview as a sheet |
| Regular, under 1000pt (iPad portrait, a smaller Stage Manager window) | Two columns |
| Regular, 1000pt and wider (iPad landscape, a large window) | Three columns |
| Largest text sizes (Riesig and the accessibility sizes) | Two columns at most, even in a wide window. Text growth wins over a third column |

Android tablets and the unfolded Flip 5 keep the centred 720pt column from `READABLE_WIDTH`. They are out of scope here.

## Columns

**Leading.** The shell destination you are in: Home, Trips, Places, or World, as in [HOME-NAVIGATION.md](HOME-NAVIGATION.md). About 320–380pt. The bottom tab bar hides, and those four destinations sit in this column's toolbar as the system sidebar or a segmented control, using the labels the phone already has.

**Middle.** The open collection: Heute, Tage, Karte, Unterkünfte, Notizen. Those sections are a control at the top of this column, in the same order as the phone's tabs. They never share a pane with the shell destinations, which is the same rule as the phone: the two bars are never on screen together. The "Stand" line stays at the top of this column. “+” and “…” stay on this column and follow the section, as they do today. Back from a resource returns to the collection section. Choosing another shell destination in the leading column leaves the collection, as Back does on the phone.

**Inspector.** The selected location, lodging, transportation, note, or checklist. When nothing is selected, the pane names the collection and waits. It does not open a resource by itself.

In a two-column window the leading column is the shell, and the other column is a stack: the collection, then the resource pushed inside that column, with its own back button. The middle and the inspector share one pane.

In a three-column window all three are visible. Selecting a row fills the inspector and leaves the day where it is.

Compact width never shows a second column. The routes stay the ones the phone uses. A resource is a push in a compact window and in the detail stack of a two-column window, and an inspector in a three-column window.

## Screens

### Home and Trips

Home keeps its feed: the featured collection, invites, today, upcoming, recent locations. Trips keeps the full list, including the archive. The two tabs stay separate.

The signature hero is the phone's card (46% of the window, clamped to 320–560px). In a leading column it becomes a row: the cover thumbnail, the name, the countdown, and today's title. The existing shorter hero (`compact` on `CollectionHero`) is still a card sized off the window, so it is not the iPad row.

Selecting a collection opens it in the middle column. The featured collection on Home is selected when the window first becomes regular, so the middle column has the current or next trip. With no collection, the middle column shows the feed's empty state.

### A collection

Heute, Tage, Unterkünfte, and Notizen keep their rows, day strip, and sections. They scroll inside their column. The day strip stays one horizontal row.

On Heute, the selected row and "Heute Nacht" can both be opened in the inspector. The programme does not repeat the night lodging, same as on the phone.

Tage is the long list in the middle column. A day heading sticks only within that column.

### Map

The map fills the middle column. The day filter stays a floating bar on the map. The preview card leaves the bottom sheet and becomes the inspector whenever the inspector is showing. In a two-column window the preview stays a sheet over the map, because the second column is already the map. "In Karten öffnen" and "Offline-Karten" stay. The offline-map form is a sheet.

### Inspector

A location, lodging, or transportation uses the same blocks as the phone: gallery, name, then the arrival or the journey, then the rest. The gallery is sized from the inspector's width, between 4:3 and 16:10, and at most 280pt tall. It is not a third of the iPad window. Transportation keeps its low 2:1 strip. A resource with no photo keeps the teal icon beside the title.

Notes and checklists use the same reading and ticking they use on the phone. The inspector scrolls on its own.

The full-screen photo gallery and the system PDF viewer still cover the window. They are for looking, not for sitting beside the day.

### Places and World

Places: the list in the leading column, the location in the inspector (or pushed in the detail stack when there are only two columns). World: countries, regions, and cities in the leading column, the map and the visited marks in the other. Statistics stay a single scrolling column in the detail pane. No third column of stats.

### Editing

Create and edit forms, sharing, settings, search, and account screens are sheets on a regular-width window and full-screen pushes on a compact one. Search keeps its current scope: the whole library from the shell, the open collection from the collection column. Saving, deleting, and the online-only rule are unchanged. A sheet closes back to the column that opened it.

Reordering a day accepts a drag on the regular-width list, with the same limits as the phone's up and down actions: itinerary items only, dated items stay put, and the move needs a connection. The up and down actions remain for the compact window and for VoiceOver.

## What does not change

Colours, type, the one teal accent, native grouped rows, and the photo treatments in [DESIGN.md](../DESIGN.md). Offline reading, per-object time zones, and PDFs. German, English, and Japanese. The collection is still one request. Public collections stay read-only. Large text, bold text, more contrast, reduced motion, and VoiceOver apply to every column. The reading order is leading, then middle, then inspector.

## How it is built

`expo-router`'s `SplitView` (`expo-router/unstable-split-view`) is the wrong shell for this. In SDK 58 it has to be the root navigator, it cannot be nested, and its column headers cannot be customised. This app already has a root stack and two tab navigators. The columns belong inside the shell and the collection, using the existing routes. `@expo/ui`'s `NavigationSplitView` is a fit for a screen that owns its own columns. One split in the window, not a split inside a split.

The phone's portrait lock stays. The iPad allows every orientation and multitasking, so the app does not set `ios.requireFullScreen`. On iOS 27 that flag does not keep a window from resizing anyway.

## Order of work

1. **Look first.** Turn on the iPad target, let the iPad rotate, and run the current UI on an iPad simulator in portrait, landscape, and a half-width Split View. Record what breaks: the hero, the second tab bar, the gallery height, the map sheet, sheets that assume a phone. Change nothing else in this step.
2. **Two columns** for a regular window under 1000pt. Compact stays the phone. The collection's sections move to the top of the detail column.
3. **Three columns** from 1000pt, with the inspector, and the map preview moving into it. Drop back to two columns at Riesig.
4. **Sheets** for editors, search, and settings. Drag to reorder a day.
5. **Check** on an 11-inch and a 13-inch iPad: portrait, landscape, Slide Over, half and full Split View, Stage Manager, light and dark, more contrast, bold text, Riesig, VoiceOver, reduced motion, offline, a photo that never downloaded, and a Japanese screen. A regular-width Mac window of the iPad app is part of the look, not a separate project.

After this ships, the implemented rules fold into [DESIGN.md](../DESIGN.md). Until then that file keeps describing the phone.
