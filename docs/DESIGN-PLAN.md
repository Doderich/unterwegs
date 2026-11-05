# Unterwegs UI design plan

Status: planning only. The direction and priorities below reflect the agreed brief; proposed layouts still need to be reviewed together before implementation. This document does not describe shipped behaviour.

Make Unterwegs more expressive through the trip's own photography, clearer through stronger information hierarchy, and easier to write in through inline Markdown editing. Preserve the home hero as the visual starting point and extend its character across the app through a consistent set of native components.

The first implementation focus is **Today, resource details, and inline editing**. The wider app follows the same visual language. Implementation does not start as part of this planning task.

## 1. Purpose and design direction

Unterwegs is opened while travelling: checking the next connection, finding an accommodation, retrieving a booking number, reading a note, or updating the plan. The interface should make these actions easy with one hand, variable connectivity, and little attention to spare.

The design should feel warmer and more recognisable without making essential information harder to reach. Photos identify the trip and its places; typography and grouping explain what matters; native controls make interaction familiar.

### One app with one visual language

Borrow ideas from reference apps, then design them as Unterwegs components. The references are evidence of useful interactions and information structures, not specifications for fonts, colours, shapes, navigation, or screen composition.

Across screens, use:

- The platform's system font, with a shared hierarchy of titles, body text, supporting text, and labels.
- The existing terracotta accent and neutral surfaces, adapted to light, dark, and increased contrast.
- Consistent spacing, image treatment, section rhythm, action placement, and interaction feedback.
- One semantic icon vocabulary, using each platform's native symbols.
- Familiar iOS and Android controls and navigation, with a shared product identity rather than identical pixels.

A screen can change density to suit its task. An itinerary needs compact scanning; a place detail can give a photo more space; a note needs comfortable reading. These are variations of one system, not separate visual themes.

Judge the design as a family of screens. A date selector, gallery, journey summary, and editor should look related even though their interaction ideas came from different references.

### What carries forward

The existing home hero, native navigation, system typography, terracotta accent, offline behaviour, and accessibility support remain the foundation. Expand the role of photos and improve hierarchy rather than introducing a replacement brand.

`DESIGN.md` remains the description of the current implementation. After native review, merge the implemented patterns and tokens into it and its existing `.impeccable/design.json` sidecar. In particular, revise the current rule that the home hero is the only prominent photo treatment. Do not overwrite unrelated design guidance or record proposals as implemented rules.

## 2. Scope and priorities

| Priority   | Surface                                                   | Main outcome                                                                      |
| ---------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| First      | Today                                                     | Understand the selected day, scan the programme, and find tonight's accommodation |
| First      | Location, lodging, transportation details                 | Recognise the resource and find its essential travel information quickly          |
| First      | Markdown reading and editing                              | Read formatted content and edit it without an additional editor screen or sheet   |
| Next       | Days and lodging lists                                    | Carry the same resource identity and hierarchy into denser overviews              |
| Next       | Home's secondary collections, map previews, search, notes | Complete the visual consistency pass                                              |
| Supporting | Settings and account forms                                | Inherit shared typography, spacing, and action patterns where applicable          |

Keep the existing collection tabs and navigation structure. Full resource-edit forms can remain on their existing routes; the Markdown field must stop opening another editor on top of them. Editing directly from every read-only detail screen is a separate scope decision.

This work adds no trip-planning features, server endpoints, automatic itinerary inference, or new photo sources. Existing capabilities must remain reachable after regrouping.

## 3. Photography and shared content patterns

### Resource identity

Use three related treatments, with final dimensions settled through native review:

| Context                               | Treatment                                                           | Hierarchy                                  |
| ------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| Home's featured collection            | Retain the signature hero                                           | Collection identity and trip context       |
| Resource detail                       | Prominent adaptive gallery, followed by title and essential context | Recognition, then practical information    |
| Itinerary, lists, map preview, search | Larger, consistently cropped thumbnail beside the text              | Name and relevant time remain easy to scan |

Prefer the resource's primary image, then its first available image. Do not substitute an unrelated collection image for a resource with no photos. Resources without images get a compact title-and-icon treatment rather than a large empty image placeholder.

Use existing authenticated and offline-aware image loading. Reserve image geometry while loading, handle unavailable images gracefully, and keep text and actions usable when a photo cannot load. Load images near the visible content rather than eagerly loading full-resolution photos for an entire collection.

Multiple photos should be discoverable through a swipeable gallery, a subtle count or position indicator, and accessible controls. Tapping continues into the existing full-screen gallery. Preserve cover selection, removal, and upload access where already available.

Photo headers should adapt to narrow phones, larger screens, and increased text sizes. Essential information must not be buried beneath an oversized gallery. Put resource titles on a solid surface beneath the photo by default; the existing home hero can retain its established text overlay and scrim.

### Shared information hierarchy

Use a small set of components and variants rather than bespoke cards for every screen:

- Resource header: gallery when available, title, short context.
- Itinerary entry: thumbnail or icon, name, time information, concise supporting context.
- Journey summary: origin and destination, departure and arrival, dates and local zones.
- Stay summary: property identity, check-in/out, address and booking access.
- Reading section: consistent formatted text and related links.
- Inline Markdown field: reading and editing states within the same form.

Keep facts such as booking numbers, addresses, prices, and attachments in compact native rows where those already work well. Avoid nested cards, decorative shadows, or an accent colour for every resource type. Native control feedback and existing reduced-motion behaviour are sufficient unless a transition explains a real state change.

## 4. Screen proposals

### Today

The screen answers: what is planned, when do we leave, and where do we sleep?

Proposed reading order:

1. A coherent date/day header with compact day navigation.
2. The programme in its established order, with scheduled times easy to scan.
3. Tonight's accommodation, including relevant arrival or departure context.
4. Longer day notes and supporting information.

Explore a horizontal date strip as a replacement for the current fragmented day picker/counter presentation. Clearly distinguish the selected day from the actual current day. Keep swipe-between-days and provide a labelled full-date picker for long jumps. Dates must stay discoverable at large text sizes and with a screen reader; a fixed seven-cell arrangement is not a requirement.

Increase photo recognition in programme entries without making each one a large hero. Give times a predictable location and distinguish timed events from untimed items. Preserve itinerary ordering and existing empty-day behaviour; do not invent times or reorder untimed entries to make a timeline look complete.

Treat check-in, check-out, and overnight lodging as distinct meanings, even when they refer to the same property. Avoid duplicating the same information across the programme and accommodation section.

Keep day editing, offline state, and sync freshness easy to find without giving them the same emphasis as the day's programme. Longer notes can move below the programme, but remain clearly labelled and readable.

### Location details

Lead with the resource photo and name, then the next useful facts: planned visits and address/map access. Keep the description readable and give rating, trails, activities, sun information, tags, and attachments a clear secondary order.

Retain existing visit and activity actions. Keep photo management near the gallery. Long descriptions should not push practical actions out of reach; validate whether progressive disclosure is helpful before adding it everywhere.

### Lodging details

Organise around arrival: identify the property, find it, check in, and retrieve the booking number.

Show the photo and name, check-in/out summary, address/map action, and reservation number early. Keep copy beside the booking number and existing website/booking actions close to their context. Duration supports the stay dates; ratings and price sit below arrival essentials. Notes and attachments remain clearly grouped and accessible.

### Transportation details

Make the journey the focal point. Show origin and destination together, paired departure/arrival times and dates, relevant local zones, and the available service/flight number. Cross-midnight and cross-zone journeys must be unambiguous.

Use transportation photos when present, but with a compact treatment when needed to keep the journey summary prominent. Booking access, duration, notes, price, rating, and attachments follow in a consistent supporting order. Do not introduce unavailable fields such as live gates or train platforms.

### Notes and checklists

Give notes a clear title and one comfortable reading surface, using the same Markdown renderer as descriptions. Planned dates and related links support the content. Preserve actual checklist interactions and progress separately from Markdown lists.

### Related screens

- Days uses the same entry vocabulary in a denser grouped overview, with readable day headings.
- Lodging lists emphasise property photos, stay dates, and location.
- Home keeps the main hero dominant while making secondary collections easier to recognise through photos.
- Map previews and search use consistent resource names, image crops, and supporting details without expanding into full detail pages.
- Settings and account screens retain native grouped forms and inherit shared type, spacing, and action conventions.

## 5. Markdown reading and editing

### Interaction

Replace the shared Markdown modal across collection, day, location, lodging, transportation, and note forms.

1. The field displays formatted content, or a clear invitation to add text when empty.
2. A labelled edit action changes that same area into an editable field and opens the keyboard.
3. A formatting bar appears directly above the keyboard for the active Markdown field.
4. `Fertig` dismisses the keyboard and returns to the formatted reading state.
5. The enclosing form's existing save action persists the resource.

Typing changes the form's local draft. Keyboard dismissal or switching fields must preserve it. `Fertig` finishes text editing; it does not silently save to the server. Preserve the enclosing form's cancellation behaviour and make any discard behaviour clear. Failed saves keep the draft available for correction and retry. Read-only/offline states expose no editing actions that cannot work.

### Toolbar

Start with bold, italic, heading, bullet list, link, and a labelled finish/dismiss action. Use a consistent icon treatment with accessible German labels and English translations. Overflow or horizontal scrolling can accommodate narrow screens and large text; shrinking touch targets is not an acceptable solution.

Formatting applies to the current selection or caret and keeps focus and selection stable. Inserting a link should make its destination easy to replace. Verify emoji, multiline selections, repeated formatting, and typing immediately after a formatting command.

Support hardware keyboards and system keyboard dismissal. The exact native docking implementation needs a feasibility check on both platforms before choosing APIs or adding a dependency. The field must remain visible above the toolbar and keyboard without double insets or scrolling the caret out of view.

### Reading and source fidelity

Use a common rendering model across day descriptions, resource descriptions, note details, and inline field previews. Preserve headings, emphasis, paragraphs, lists, and safe links. Make long URLs wrap, keep links actionable, and support selecting/copying content.

The initial editing proposal shows Markdown source while focused and formatted text at rest. Live rich-text editing is not an agreed requirement. Unsupported syntax remains intact in the stored source; reading and saving must not strip or rewrite it. Existing safe link and booking-link handling must continue to work. Markdown task-list syntax does not automatically create or update AdventureLog checklist items.

## 6. Reference ideas

These Mobbin references were inspected during planning. Use the ideas below as questions to solve within Unterwegs, not layouts to reproduce.

| Reference                                                                                               | Useful idea                                                                     | Application to explore                                                 |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [Mindtrip itinerary](https://mobbin.com/screens/ecb453c0-c80f-49c1-85d1-f21186467c43)                   | Photos have different prominence in saved ideas and scheduled entries           | Make resources recognisable while keeping the programme compact        |
| [Mindtrip place detail](https://mobbin.com/screens/a903fbfb-0b91-4c2a-a620-8e747bc3528f)                | Prominent gallery followed by title and description                             | Give resource details a photographic identity with readable text below |
| [Tripsy itinerary](https://mobbin.com/screens/2f8733ed-e350-42fb-860d-19ba73863526)                     | Compact date navigation and readable chronological grouping                     | Consolidate Today navigation and clarify the selected day              |
| [Tripsy flight details](https://mobbin.com/screens/582911e7-d709-4220-9667-6979fa1ba318)                | Paired departure and arrival, with supporting facts below                       | Build one coherent journey summary                                     |
| [Wanderlog inline note flow](https://mobbin.com/flows/28cadb3c-9f37-4847-978b-f85450e84355?tab=screens) | Editing stays in context; formatting sits above the keyboard                    | Replace the additional Markdown editor modal                           |
| [Vrbo itinerary](https://mobbin.com/screens/04ca4e80-4441-49b5-8333-fcf9a93e392c)                       | Notes, check-in events, and accommodation have distinct roles                   | Clarify the meaning of items in the day plan                           |
| [Hyatt reservation details](https://mobbin.com/screens/832d27db-33f7-4c3f-818b-87e6a48bc4f3)            | Reservation code, property identity, dates, and practical actions are prominent | Order lodging information around arrival                               |

The supplied Obsidian screenshot is an additional reference for keyboard-adjacent formatting. Its full-screen composition is not the intended editing flow.

No reference's exact calendar, card geometry, font, colour, sheet navigation, or action arrangement is binding. The date strip, photo proportions, and grouping above are proposals to validate together. Keep Unterwegs' native navigation and shared component language throughout.

## 7. Implementation sequence and review gates

### Phase 1: Representative designs and native feasibility

Prepare a coherent set covering Today, a location, a lodging, a transportation, and an inline note editor. Use anonymised content with both photo-rich and photo-free resources, long names, and a long note. Review the screens together for visual consistency and separately for task clarity.

Check keyboard docking, focus/selection, native form scrolling, and gallery sizing in a small technical exploration. Choose the implementation only after testing both iOS and Android. Review current Expo SDK documentation before touching its APIs.

Gate: the set feels like one app; the hierarchy works with real content ranges; the inline editor is feasible on both platforms. Settle photo proportions, date navigation, toolbar overflow, and editing/preview transitions here.

Decided in the review of the in-app screen set (#10, 04.11.2026):

- **Photo proportions:** the detail gallery follows the screen: about a third of the window height, between 4:3 and 16:10 of the frame width (`frameHeight` in `src/ui/PhotoPager.tsx`). Transportation keeps a compact 2:1 strip. Programme and list thumbnails are square.
- **Date navigation:** a horizontal strip of day chips above the pager, with the selected day filled in the accent and the actual current day marked by a dot; swiping between days and the "Alle Tage" picker stay.
- **Toolbar overflow:** Bold, Italic and Link directly; Heading and List under "…".
- **Editing/preview transition:** formatted text at rest with a labelled "Text bearbeiten" row; editing replaces it in place; "Fertig" or leaving the field returns to the formatted view. This shipped ahead of the other screens as the only Markdown editor (#19, #20). The iOS keyboard toolbar sits directly on the keyboard; iOS positions it and doesn't allow a gap.

### Phase 2: Shared foundations

Implement shared header, image, entry, summary, and typography variants using the existing native component system. Consolidate Markdown rendering without changing saved content. Keep accessibility and theme behaviour in shared components rather than fixing individual screens independently.

Likely implementation areas: `src/ui/CollectionHero.tsx`, `AuthImage.tsx`, `ImageStrip.tsx`, `Thumb.tsx`, `entries.tsx`, `rows.tsx`, `MarkdownPreview*`, `MarkdownEditor.tsx`, and `FormHost*`. Confirm actual seams during implementation rather than treating this list as a required file structure.

Gate: representative components work in both themes, large text, image-failure states, and both native platforms.

### Phase 3: Core screens

Apply the foundations to Today and location/lodging/transportation details. Keep essential actions and previously available information reachable. Resolve issues in shared components before making local exceptions.

Gate: the selected day is clear; times and arrival information are easy to scan; photos help recognition; long content does not hide important actions.

### Phase 4: Inline editing

Roll the shared field through all six existing Markdown form consumers. Remove the additional editor modal once the replacement is verified. Retain existing form-save and online-only write paths.

Gate: no extra Markdown screen or sheet; formatting preserves selection; keyboard transitions preserve drafts; failed saves can be retried without losing text.

### Phase 5: App-wide consistency

Apply the same patterns to Days, lodging lists, secondary collections, map previews, search, and notes. Review a screen set to catch mismatched fonts, spacing, shapes, icons, image treatments, and actions. Compare iOS screens as a family and Android screens as a family; platform-native differences are expected.

Gate: the same resource looks recognisably related wherever it appears, with density appropriate to the context.

Phases 2, 3 and 5 shipped together (#13–#18, #21, #22); the dev-only preview switch is gone and the reviewed screens are the only ones. The shared pieces, by seam:

- Type scale: `src/ui/typeScale.ts` (title, heading, figure, body, supporting, label).
- Images: `firstImage` (`src/data/images.ts`) picks the primary, else the first image everywhere; `Thumb` is one 56 pt square crop with a muted fill while loading or when the photo is unavailable; `resourceHeaderRows` + `ResourceGallery`/`PhotoPager` for detail screens. `ImageStrip` was removed.
- Entries and summaries: `entryRow` (itinerary), `stayRow`/`staySubtitle` (tonight's lodging, check-in vs. night n vs. check-out), `stayRows` (lodging arrival block), `journey`/`journeyRows` (departure and arrival in their own zones). Time-zone cases are covered in `src/ui/__tests__/journey.test.ts`.
- Phase 5: Days uses sentence-case day headings and the shared stay row; search results carry the same thumbnails; notes and people use the shared title style. Home, map previews and the Lodgings list already used `leadingFor` and get the shared thumbnail through it.

### Phase 6: Verification and documentation

Complete native visual and interaction review, automated checks, and focused regression checks. Merge reviewed patterns into `DESIGN.md` and its token sidecar. Update `FEATURES.md` and `ROADMAP.md` only to describe delivered behaviour and its actual verification limits.

Gate: acceptance criteria below pass, or any outstanding platform/device limitation is explicitly recorded before handoff.

Done (#23): the patterns are merged into `DESIGN.md` and `.impeccable/design.json`, `FEATURES.md` and `ROADMAP.md` describe the shipped screens. Reduced motion now also skips the animated jump to a tapped day, and wide Android windows centre each screen's list at 720px. The device pass over the verification matrix (large/bold text, contrast, screen readers, offline photos, tablet width) was not run here; it is recorded as open in `ROADMAP.md` (Next, step 1). Japanese was added as a third UI language alongside this phase.

## 8. Constraints and acceptance criteria

### Product and architecture

- Keep collection reads on `GET /api/collections/{id}` and writes through the existing edit/action hooks.
- Preserve authenticated media loading, offline files, PDFs, gallery actions, and sync freshness.
- Display times in each object's own zone, including separate departure and arrival zones. Do not use the phone zone to simplify the layout.
- Keep UI text in German through literal render-time `tr()` calls, with English entries. Follow `GLOSSARY.md`.
- Use `@/ui/Text` for native text scaling and preserve app/system size, bold, contrast, and reduced-motion preferences.
- Keep documentation, fixtures, and shareable captures anonymous. Use placeholders and the repository's sample-anonymisation process.
- Assess dependencies only when existing native tools cannot meet the interaction. A native module or config-plugin change requires the version/build process in `RELEASING.md`.

### Verification matrix

| Area             | Required cases                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Native platforms | iOS and Android phone; narrow and expanded/folding layouts; tablet if shipped                                                      |
| Appearance       | Light, dark, increased contrast, large text, bold text, reduced motion                                                             |
| Accessibility    | Screen-reader names/order, selected-date state, gallery position, keyboard navigation where applicable, native-sized touch targets |
| Photos           | None, one, many, portrait/landscape crops, loading, unavailable, cached offline                                                    |
| Itinerary        | Empty day, untimed entries, many entries, long trip, long names, overnight stay/check-in/out                                       |
| Time             | Cross-midnight, cross-zone departure/arrival, device zone different from the resource                                              |
| Markdown         | Empty/long text, supported/unsupported syntax, links/long URLs, emoji, multiline selections, copy, repeated formatting             |
| Editing          | Focus changes, keyboard dismissal/reopening, hardware keyboard, toolbar overflow, cancel, save failure/retry, read-only/offline    |
| Regression       | Navigation/back, booking-number copy, maps/links, attachments, gallery management, sync and offline restart                        |

Run `npm run check` for implementation changes, including typecheck and lint. Extend meaningful existing Markdown/selection tests and verify rendering/link behaviour where it changes. Automated checks complement native inspection; they do not establish keyboard positioning or visual quality.

The design is ready when a traveller can recognise resources through their photos, find important travel information quickly, and edit formatted notes in the current form, while the screens read as one consistent Unterwegs app.
