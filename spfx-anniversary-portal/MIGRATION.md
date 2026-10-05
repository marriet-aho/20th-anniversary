# Migration map: original single-file page to SPFx

Original file: `audacious-portal-v7.html` (state object `S` in `localStorage`, key `anniv20v5`).

| Original | New component or file | Data source |
|---|---|---|
| `D.tx.h`, `hs`, hero buttons; `E("tx.h")` | `components/Hero/Hero.tsx` | `PortalContent` `hero.*` |
| Hero CSS (`.hbg`, `.hst`, `.hshade`, mask, `--mx/--my`) | `styles/portal.module.scss` (ported, dead dancer-figure CSS dropped) | n/a |
| `hvid` video + poster, fade-in, pause off-screen | `Hero.tsx` effect | `PortalAssets` HeroVideo / HeroPoster |
| `#cv` canvas confetti and fireworks (`fw`, `add`) | `components/Hero/HeroCanvas.tsx` (lazy) | n/a |
| Floating "20", music notes (`.n20`, `.nt`), ribbons, chips | `Hero.tsx` | chips are static copy |
| Music IIFE (`pl`, `vo`, `held`) | `components/AudioProvider.tsx` + player in `Hero.tsx` | `PortalAssets` BackgroundMusic |
| Entry overlay `#ov`, `ovx`, `ovs` chime | `components/Overlay.tsx` (shown once per page load, kept in memory) | n/a |
| `tick()` countdown, `.fc` flip | `components/Countdown.tsx`, `logic/countdown.ts` | `PortalContent` `countdown.date` (DateValue), `countdown.*` |
| `stats`, `counts()` count-up | `components/KeyStats.tsx` | `KeyStats` |
| `tl` timeline | `components/Journey.tsx` | `Timeline` |
| `N`, `staff`, `tree()`, `panel()` | `components/Tree.tsx` | `Legends` |
| `cards()`, `lph()`, search `q` | `components/LegendCards.tsx` | `Legends` |
| `mem` and its lightbox | `components/MemoryLane.tsx`, `common/Modal.tsx` | `MemoryLane` |
| `msgs` | `components/Voices.tsx` | `LeadershipMessages` |
| `video.url`, `avid`, `vslot` | `components/AnniversaryVideo.tsx` | `PortalAssets` AnniversaryVideo / VideoPoster; `PortalContent` `video.url` |
| `WT`, `WK`, `wdet` | `logic/tagSuggest.ts` | n/a |
| `wallSec`, `wall()`, top legends tally | `components/Board/Board.tsx`, `logic/topLegends.ts`, `services/BoardService.ts` | `BoardMessages`, `BoardStats` |
| `fcDraw`, `fcRun` carousel | `components/Board/FeaturedCarousel.tsx` | `BoardMessages` Featured |
| `wpost`, `confetti()` | `components/Board/PostForm.tsx`, `Board/confetti.ts` (lazy) | creates a `BoardMessages` item |
| `galSec`, `gal()`, filters, `gtog` | `components/Gallery/Gallery.tsx`, `services/GalleryService.ts` | `GalleryMedia`, `Branches`, `Departments` |
| `og()` lightbox, likes, reactions, comments | `components/Gallery/GalleryLightbox.tsx` (lazy), `services/ReactionService.ts` | `GalleryReactions`, `GalleryComments` |
| `footer` | `components/Footer.tsx` | `PortalContent` `footer.*` |
| `HD` headings | `components/common/Section.tsx` + `defaults.ts` fallbacks | `PortalContent` `*.heading` / `*.sub` |
| `BR`, `DP`, `CT` | `Branches`, `Departments` lists; `GALLERY_CATEGORIES` constant (matches the Category choice) | lists |

## Intentionally removed
* In-page "Edit page" mode, Export, Import, Reset, `contenteditable`, file-to-base64 uploads, `data-del`/`data-add` buttons: replaced by editing the lists.
* `localStorage` and `sessionStorage`: the overlay "seen" flag is now in memory.
* The "Your name" boxes (board and comments): the author is the signed-in user.
* The SVG dancer figures and their CSS (`P()`, `.fig`, `.dz`): superseded by the hero video in the original too.
* Google Fonts link: fonts are bundled.
* `tx.song`, `tx.hv` link inputs and "Try a song file": music and hero video come from `PortalAssets`.

## Behaviour changes to be aware of
* Legend count, and the "13" in the hero button, now come from the number of Active legends via the `{count}` token.
* Gallery Branch and Region are typed freely (suggestions come from the `Branches` list) instead of picked from a fixed list.
* The legend cards no longer show the joined date, and the tree panel no longer shows it either.
* The gallery card shows a like count; reacting happens in the lightbox (Like, Clap, Celebrate, Love).
* The board watermark and logo are separate `PortalAssets` files (watermark = AssetType Other, title "Watermark").
