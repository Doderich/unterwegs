# Unterwegs on iPad and Mac

Status: in progress. The iPad target is on (`ios.supportsTablet`, the iPad rotates, version 1.6.0) and the day map is built (step 1); the rest is still to build. [DESIGN.md](../DESIGN.md) keeps describing the phone until this ships.

## Who uses it, and when

The owner and the family, for planning and for reading. The same app also runs on the owner's MacBook as an iPad app (an Apple Silicon Mac runs the iPad build in a resizable window), so mouse, keyboard and a wide window count as much as touch. Usually there is internet (at home, at the hotel), but not always: the offline rules of the phone stay ([0007](adr/0007-offline-copy-on-the-device.md), [0016](adr/0016-offline-edits-through-an-outbox.md)).

Travelling is supposed to be exciting. Unterwegs on a big screen is a place to look forward to a trip and to look back on it, not only a planning tool. The four moments:

| Moment              | Where                                     | What people want                                                                                    |
| ------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Looking forward** | Couch, weeks before                       | See the trip come alive: the cover, the countdown, photos of the places on the list, where they are |
| **Planning**        | Couch or Mac, before and during           | Put places on days so each day stays in one area; see where tonight's stay is                       |
| **Tomorrow**        | Hotel, the evening before, often together | Go through the next day: where, in what order, how to get there, where to sleep                     |
| **Looking back**    | After the trip, or the last evening       | Big photos, the map of where we were, the stamps, past collections                                  |

On the street the phone is the device. Quick lookups, QR sign-in, widgets and the Live Activity need no iPad version.

## Rules

- **The phone's screens, wider.** Home, Collections, Places, World and a collection are the same screens as on the phone. iPadOS puts the tab bars at the top; screens that inset their content by the header add that bar (`src/ui/topTabBar.tsx`).
- **No extra columns of detail.** A shell sidebar and a detail inspector beside the collection were tried on 08.11.2026 and dropped: they made the app feel like a tool and the trip disappear. A place opens as on the phone.
- **Room goes to the map and the photos**, not to more rows.
- **Everything new works on the phone too**, just smaller. The iPad gets more of it on screen, not a different app.
- Android tablets and the unfolded Flip keep the centred readable column (`READABLE_WIDTH`).

## Features

### The day map

Built: `src/data/dayMap.ts` (tested), the collection map and its preview card. The map used to show one day only by hiding everything else; now it is the place where days are shaped.

- **Colour by day.** With "Whole collection", every place shows its day number in its day's colour; places on no day are grey. On a map any two days can sit side by side, and only about three hues stay apart for colour-blind readers there, so the number carries the day and the eight colours (the data-viz reference order, repeating from day nine) only help neighbouring days apart. Stays are neutral dark markers, so they never read as one of the days. A day that jumps across town, or a place far from the rest of its day, shows at a glance.
- **One day and what is still open.** With a day selected, its places stand out, tonight's stay marks where the day starts and ends, and the open places stay visible but faded, so what is close and still free is easy to see.
- **Moving from the map.** Tapping a place offers "Put on {day}" (an open place, with a day selected), "Move to another day" and "Remove from this day" (a place on that day), or "Add to a day"; the colour changes at once. Right-click on the Mac comes with step 3. It is an ordinary day-plan edit through the outbox, so it works offline ([0016](adr/0016-offline-edits-through-an-outbox.md)).
- **Later: the order within a day.** Numbered stops and a line between them, reordering from the map, and a sensible order by distance. Which day a place is on comes first.
- **Later: suggestions.** "These open places are close to Tuesday's plan."

On the iPad and the Mac the map is big enough to plan on; on the phone the same colours and the same action fit the existing map screen.

### Big pictures

- **Looking forward:** the collection's places as a photo wall before the trip, so the cover is not the only picture of what is coming.
- **Looking back:** a past collection opens with its photos large and the map of where we were. The photo grid of a day ("Photos of the day") and the full-screen gallery use the room instead of phone-sized thumbnails. Memories and passport stamps on Home and World get bigger cards.
- Photos come from the offline copy where they are saved; a photo never downloaded keeps its placeholder offline.

### On the Mac

Right-click menus on rows and map points with the same actions as the phone's long press, hover states, and keyboard shortcuts for search (⌘F), new place (⌘N) and Back (⌘[). A resizable window follows the same rules as an iPad window.

## Open questions

- How the photo wall and the look-back view are reached: from the collection's header, from Home's memory card, or as their own section.
- Whether the day colours need a separate high-contrast set (the numbers already carry the day).
- Whether the Mac window needs anything the iPad doesn't, beyond menus, hover and shortcuts.

## Order of work

1. **The day map**: colour by day, one day with the open places and tonight's stay, putting and moving places from the map. Useful on the phone at once.
2. **Big pictures** for looking forward and looking back.
3. **Mac comforts**: menus, hover, shortcuts.
4. **Order within a day** on the map, then suggestions.
5. **Check** on an 11-inch and a 13-inch iPad and on the Mac: portrait, landscape, Slide Over, Split View, light and dark, more contrast, bold text, Riesig, VoiceOver, offline, a photo that never downloaded, and a Japanese screen.
