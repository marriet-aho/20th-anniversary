# Plan: SPFx conversion of the 20th Anniversary portal (step a, for approval)

## 1. What the reference actually contains (read in full, media stripped)

- Single page, ~360 lines. State object `S` (cloned from default `D`, persisted in `localStorage` key `anniv20v5`). Four media blobs are embedded: hero loop MP4, hero poster WebP, logo WebP, "20" watermark WebP, background-music MP3, anniversary film MP4 + poster. All become `PortalAssets` files.
- Sections in DOM order: entry overlay, hero, countdown, key stats, journey, tree, legend cards, memory lane, **gallery**, voices, video, board, footer. Note: gallery sits *before* voices/video in the reference. The prompt lists it after the board. **I will follow the reference order** (question Q1).
- Data objects: `N` (13 legends), `D.tx` (hero/countdown/footer text), `HD` (section headings), `D.mem`, `D.tl`, `D.stats`, `D.msgs`, `D.notes` (board), `D.gal`, `BR`, `DP`, `CT`.
- Dead code to **drop**: the SVG dancer figures `P()` and `.fig/.dz/.sync/.azonto` CSS (superseded by the video), edit mode/export/import/reset, the "Try a song file" and `tx.song` link inputs, the oscillator chime on `#ovs` (see Q4), localStorage/sessionStorage use.

### Gaps between the prompt and the reference (need your decisions)
| # | Finding | My proposed default |
|---|---|---|
| Q1 | Reference puts Gallery before Voices; prompt lists it after the board | Follow the reference order |
| Q2 | Reference board has an optional "Your name" box; prompt says never ask for names | Remove it; author = signed-in user (`Author`) |
| Q3 | Reference gallery card Like button is one per item with a count; prompt wants Like + 👏🎉❤️ with toggle | Like (♥) on card and in lightbox, plus 👏 🎉 ❤️ in lightbox; four `Reaction` choices as specified. Note: ♥ Like and ❤️ Love are visually close; I'll label them "Like" and "Love" |
| Q4 | Entry overlay has a second button "Play celebration sound" (synth chime via `AudioContext`) | Keep it; no third-party content, works offline. Tell me if you'd rather drop it |
| Q5 | Reference leaves the hero stat strip hi-light on the 2nd stat only (`.hi`, "81 Branches") | Keep, keyed by label containing "branch" rather than position |
| Q6 | Reference fonts load from Google Fonts (blocked by tenant CSP, forbidden by section 7) | Need font files. I can bundle only if you supply licensed WOFF2 (Fraunces and Figtree are OFL, so I can download and bundle them if the build environment has network access). Otherwise fall back to Georgia / system-ui. **Which do you want?** |
| Q7 | Hero text (`hero.btn1..3`) has the "13" hard-coded in btn1: "Meet our 13 audacious legends" | Seeded as text in `PortalContent`; I'll keep it editable and also add a `{count}` token that substitutes the Active legend count so it does not go stale |
| Q8 | Prompt's `video.url` is described as a `PortalContent` key but not in the key list | Add `video.url` to the seed list |
| Q9 | Branch and Department are Lookups. Per-item Lookup resolution needs `$expand` and lookup threshold awareness (max 12 lookup columns per query) | Fine: GalleryMedia has 2, Legends 2, BoardMessages 1, reactions/comments 1 each |
| Q10 | "Image" column type cannot be filled by the PnP REST in a simple way, and its value is JSON | Parse `Photo` JSON (`serverRelativeUrl`) in the model mapper; seed scripts leave it empty |
| Q11 | Reference uses *image-column-less* memory lane for 6 items | `MemoryLane.Photo` as specified |
| Q12 | `BoardMessages.Celebrating` lookup targets `Legends`. "Top celebrated legends" counts per legend | Tally by lookup Id, name via the cached Legends list; use `BoardStats` above ~2,000 |
| Q13 | "Hidden to non-owners" cannot be a security boundary with "Read all items" | See risk R2: UI + view filtering only; true hiding needs different permissions on a moderation list. Say if you want that |
| Q14 | Unique `ReactionKey` index: SharePoint rejects duplicates with an error, which is what we want | Handle the error as "already reacted" and toggle by delete |

## 2. Technical choices (verified)

- Latest SPFx on npm today: **`@microsoft/generator-sharepoint` 1.23.2**, requires **Node ≥ 22.14 < 23** (this machine has Node 22.22.0). I will re-check release notes before scaffolding.
- **PnPjs v4** (`@pnp/sp` 4.21.0), React 17/18 as the SPFx template dictates (SPFx pins its React version; I will not upgrade it), TypeScript strict, Jest + ts-jest for services/pure logic, Heft/gulp as the template provides (the 1.2x templates use Heft; I'll follow whichever the generator emits and adapt the build/package commands in the README).
- CSS: port to **CSS Modules (`.module.scss`)** for per-component styles, with the tokens (`--o`, `--od`, `--ol`, ...) on a root `.portal` element so light/dark works inside SharePoint. Dark mode: `prefers-color-scheme` + SharePoint theme variant detection.
- Full-bleed: `supportsFullBleed: true` and `SharePointFullPage` host; the page's own `body` rules (padding, margin) move to the web part root.
- Code splitting: `React.lazy` for `GalleryLightbox`, `Confetti`, `HeroCanvas`, and the gallery section (IntersectionObserver-gated).

## 3. Proposed file layout

```
spfx-anniversary-portal/
  config/ package-solution.json, config.json, serve.json
  src/webparts/anniversaryPortal/
    AnniversaryPortalWebPart.ts            (property pane, PnP context init)
    models/            index.ts (Legend, TimelineItem, KeyStat, Memory, LeadershipMessage,
                       BoardMessage, GalleryItem, Reaction, Comment, PortalAssets, Settings)
    services/          sp.ts (PnP factory) · PortalService · GalleryService
                       BoardService · ReactionService · cache.ts · mappers.ts
    logic/             tagSuggest.ts · topLegends.ts · names.ts (initials, firstName)
                       countdown.ts · imageField.ts
    hooks/             useReducedMotion · useIsOwner · useInView · useAsync · useTheme
    components/
      AnniversaryPortal.tsx                (providers, section order, states)
      common/          Section, Heading, StateBoundary (loading/empty/error), Badge
      Overlay/         EntryOverlay
      Hero/            Hero, HeroVideo, HeroCanvas(lazy), HeroChips, Ribbons, FloatingNotes,
                       MusicPlayer (context: AudioProvider)
      Countdown/       Countdown, FlipCard
      Journey/         Journey, KeyStats
      Tree/            TreeOfLegacy, LegendPanel
      Legends/         LegendCards, LegendCard, LegendSearch
      MemoryLane/      MemoryLane
      Voices/          Voices
      Video/           AnniversaryVideo   (pauses/resumes music via AudioProvider)
      Board/           Board, BoardStats, FeaturedCarousel, PostForm, Wall, WallCard, Confetti(lazy)
      Gallery/         Gallery, GalleryFilters, GalleryGrid, GalleryCard,
                       GalleryLightbox(lazy), ReactionBar, Comments
      Footer/
      Manage/          ManageLink (owners)
    loc/               en-us.js, mystrings.d.ts
    styles/            tokens.scss, mixins, per-component *.module.scss
  provisioning/        Provision-Portal.ps1 · Seed-Portal.ps1 · seed.json · branches.sample.csv
  tests/ or src/**/__tests__   (Jest)
README.md · MIGRATION.md
```

## 4. Component tree (runtime)

```
AnniversaryPortal
├─ SettingsContext / ServicesContext / AudioProvider / ThemeProvider
├─ EntryOverlay
├─ Hero (HeroVideo, HeroCanvas*, Ribbons, HeroChips, FloatingNotes, MusicPlayer)
├─ Countdown
├─ KeyStats
├─ Journey
├─ TreeOfLegacy ⇄ LegendPanel   (selected legend state shared with LegendCards)
├─ LegendCards (search)
├─ MemoryLane
├─ Gallery*  (collapsible; lazy; lightbox*)
├─ Voices
├─ AnniversaryVideo
├─ Board (BoardStats, FeaturedCarousel, PostForm, Wall)
└─ Footer                      * = lazy / code-split
```

## 5. Data layer design

- `sp.ts`: one `spfi().using(SPFx(context), CacheNone/…)`; per-service typed `select`/`expand`/`filter`/`orderBy`/`top`.
- Small reference lists (PortalContent, Timeline, KeyStats, Legends, MemoryLane, LeadershipMessages, Branches, Departments, PortalAssets) loaded once, cached in memory for the page lifetime.
- Large lists (BoardMessages, GalleryMedia, GalleryReactions, GalleryComments) use `.top(n)` + paged iteration (`getPaged`); filters always lead with an indexed column (`Published eq 1`, `Featured eq 1`, `GalleryItem eq x`).
- Counts: `ItemCount`/`$inlinecount` is unavailable on filtered REST; use `RenderListDataAsStream` with `ViewXml` aggregates where needed, falling back to `BoardStats`.
- Reactions: create item with `ReactionKey = {itemId}-{userId}-{reaction}`; unique index violation = already reacted; toggle = delete own item. Counts per gallery item via filtered query on `GalleryItem` (indexed).
- Post gating: the web part computes `Title` (first ~80 chars) and enforces the 400-char limit before create.
- Owner detection: `web.currentUserHasPermissions(PermissionKind.ManageLists)` **or** membership in the configured Portal Owners group; used only to reveal UI; SharePoint enforces writes.

## 6. Delivery order (after you approve)

1. Scaffold + CI scripts + settings property pane + services/models + tests + `Provision-Portal.ps1` / `Seed-Portal.ps1`. **Checkpoint.**
2. Shell, theme tokens, overlay, hero, music, countdown. Build/test.
3. Stats, journey, tree, legend cards, memory lane, voices, video. Build/test.
4. Board. Build/test.
5. Gallery. Build/test.
6. QA at the six widths with Playwright (Chromium is installed here), light/dark, reduced motion; Lighthouse against the built local workbench-equivalent harness (see R4), README and MIGRATION.md.

## 7. Risks

- **R1 (cannot verify here):** I have no SharePoint Online tenant. Provisioning, permissions, item-level security, `getpreview.ashx`, lookup behaviour, unique-index errors and Lighthouse on the real app page **cannot be verified by me**. I'll test services against mocked PnP with Jest and render the UI in a local harness (mock service layer), and I'll mark every tenant-dependent acceptance item as "unverified, needs your tenant" in the final report. PnP PowerShell scripts will be syntax/PSScriptAnalyzer-checked only if `pwsh` is available here (to be confirmed); otherwise unverified.
- **R2 Hidden items are not secure:** with "Read all items", any member can read items where `Published = No` via REST. UI filtering is cosmetic. Options: accept; or keep moderation-hidden messages in a separate list/library with restricted permissions.
- **R3 Media size:** hero MP4, music MP3 and film live in `PortalAssets`; the sample has ~13 MB of embedded base64 so assets are several MB. Fine on SharePoint, but autoplay and `preload` policy needs the poster-first approach already specified.
- **R4 Lighthouse ≥ 90:** a SharePoint full-page app page carries the SharePoint chrome and its own JS; the score is largely outside this web part's control. I'll report honestly (local harness numbers are not the same as tenant numbers).
- **R5 Image columns** (`Legends.Photo`, `MemoryLane.Photo`): REST returns JSON strings; provisioning with PnP PowerShell must create `Thumbnail` type fields. Seed can't upload photos.
- **R6 Autoplay/audio:** browsers block audio before a gesture; kept as in the reference (first interaction starts music; overlay button counts as a gesture).
- **R7 Fonts:** see Q6.
- **R8 Package size/CSP:** no remote scripts; all media referenced by server-relative URLs from `PortalAssets`.
- **R9 `Celebrating` lookup to `Legends`:** deleting a legend with messages is blocked or orphaned depending on relationship behaviour. I'll set the lookup to "restrict delete".
- **R10 Large per-user write quotas:** one reaction row per click is fine for the stated volume.

## 8. Questions needing your answer before I start

1. Q1 section order: follow reference (Gallery before Voices) or the prompt's list?
2. Q6 fonts: should I download and bundle Fraunces + Figtree (OFL), or use system fallbacks?
3. Q2/Q4: confirm removing the "Your name" field and keeping the "Play celebration sound" chime.
4. R2: accept UI-only hiding for `Published = No`, or do you want a restricted moderation list?
5. Confirm site URL placeholder `/sites/Anniversary20` and that `branches.csv` will be supplied later.
6. Is the folder `/spfx-anniversary-portal` meant to be inside this repo? (I'll put it at the repo root unless told otherwise.)
7. The media files (`hero-celebration-loop.mp4`, `hero-celebration-poster.webp`, `anniversary-video-web.mp4`) were not attached; only the HTML was. I can extract the embedded base64 media from the HTML into `./reference/` myself, which is likely the same content. Is that OK?
