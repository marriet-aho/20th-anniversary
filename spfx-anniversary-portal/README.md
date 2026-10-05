# Anniversary Portal (SPFx web part)

The "20 Years of Audacious Steps" celebration page as a SharePoint Framework web part for SharePoint Online.
All content and activity live in SharePoint lists and libraries (see `provisioning/`). Nothing is stored in the browser.

* SPFx **1.23.2** (Heft toolchain), React 17, TypeScript strict, PnPjs v4. Node **22.14 or later, below 23**.
* One web part, `Anniversary Portal`. Hosts: full-page app page (full bleed) and a normal page section.
* Fonts (Fraunces, Figtree; both SIL Open Font License) are bundled in the package. No external hosts are called.

## 1. Quick deploy (you only want the `.sppkg`)

The built package is committed at `releases/spfx-anniversary-portal.sppkg`.

1. **Provision the site** (once, see section 3): creates the lists and libraries, then loads the starter data and media.
2. SharePoint admin center > More features > Apps (or the tenant App Catalog) > **Upload** the `.sppkg` > **Deploy**. Tick "Make this solution available to all sites" if you want to skip adding it per site.
3. If the app is not tenant-wide, on the site: Site contents > New > App > add **Anniversary Portal**.
4. Create the page: Pages > New > **App page** (single-part full-width) > add the **Anniversary Portal** web part > Publish.
5. Open the page. Owners see "Manage content" links; edit the web part to rename lists if you used other names.

## 2. Build it yourself

```bash
cd spfx-anniversary-portal
npm install
npm run build        # lint + Jest + production bundle + .sppkg  (heft test --production && heft package-solution --production)
# output: sharepoint/solution/spfx-anniversary-portal.sppkg
npm run start        # local dev server (serves to your tenant's hosted workbench; needs a debug URL, see below)
```

`gulp bundle --ship` / `gulp package-solution --ship` from the older tooling are replaced by `npm run build` in this SPFx version.

**Debugging against a real site:** run `npm run start`, then open
`https://<tenant>.sharepoint.com/sites/Anniversary20/_layouts/15/workbench.aspx` (the web part appears in the toolbox).
To debug on a real page, append `?debug=true&noredir=true&debugManifestsFile=https://localhost:4321/temp/build/manifests.js` to the page URL.

## 3. Provisioning (PnP PowerShell)

Needs **PnP.PowerShell 2.x or later**, an Entra ID app registered for PnP interactive login (`-ClientId`), and Site Owner rights.

```powershell
cd provisioning
./Provision-Portal.ps1 -SiteUrl https://<tenant>.sharepoint.com/sites/Anniversary20 -ClientId <app-id>
./Seed-Portal.ps1      -SiteUrl https://<tenant>.sharepoint.com/sites/Anniversary20 -ClientId <app-id>
# later, when you have the full list of 81 branches (columns: Title,Region):
./Seed-Portal.ps1      -SiteUrl ... -ClientId ... -BranchesCsv ./branches.csv -SkipMedia
```

Both scripts can be re-run. Provisioning skips anything that exists; seeding is create-if-missing and never overwrites your edits.

| Created | Purpose |
|---|---|
| `PortalContent` (key/value, unique indexed `Title`) | Every editable text, plus `countdown.date` (in `DateValue`) and optional `video.url` |
| `Timeline`, `KeyStats`, `Legends`, `MemoryLane`, `LeadershipMessages` | Page sections |
| `BoardMessages`, `GalleryReactions`, `GalleryComments` | Staff activity (item-level security) |
| `GalleryMedia` (library) | Gallery photos and videos, uploaded by admins only. **Branch** and **Region** are free text: type any branch or region |
| `PortalAssets` (library) | Hero loop, poster, logo, music, anniversary film, board watermark |
| `Branches`, `Departments` | Lookups and filters |
| `BoardStats` | Optional, for a nightly flow when the board passes ~2,000 messages |

`{count}` in a heading or button (for example "Our {count} Audacious Legends") is replaced by the number of **Active** legends, so nothing says "13" by hand.
The board watermark is the `PortalAssets` file titled **Watermark** with AssetType **Other**.

### Permissions the script sets
* **Portal Owners** group: *Edit* on the site. The web part treats anyone who can manage lists, or who is in the group named in the web part settings, as an owner.
* **Members** lose *Edit* and get *Read*; **Visitors** keep *Read*. (If Members keep Edit they would be treated as owners.)
* `BoardMessages`, `GalleryReactions`, `GalleryComments`: inheritance broken, *Read all items* and *Create items and edit items created by the user*, with *Contribute* for Members and Visitors.
* Use `-SkipPermissions` to do this by hand.

> **Hidden items are not a security boundary.** "Read all items" means a member who calls the REST API directly can still read items with `Published = No`. The web part hides them, owners see a "Hidden" badge. If you need true secrecy, keep moderation in a separate restricted list.

## 4. Web part settings (property pane)
Names of every list/library and the Portal Owners group. Leave a field empty to use the default name. No URLs are hard-coded; everything resolves from the current site.

## 5. Day-to-day content
* Text, countdown date: edit `PortalContent` (refresh the page; no redeploy).
* Legends and their photos: `Legends` list (Photo is an Image column; a missing photo shows "Photo coming soon").
* Gallery: drop photos or videos into `GalleryMedia`, set Category, Department and type the Branch and Region; tick Featured to pin and badge; untick Published to hide.
* Page media: replace a file in `PortalAssets` and keep only the new one **Active** per AssetType (the newest Active file wins).
* Board: owners can Feature/Unfeature, Hide/Unhide and Delete on each card. Staff can delete their own messages.

## 6. Tests and local preview
* `npm run build` runs lint and 34 Jest tests (tag suggestion, top-legends tally, initials/first names, countdown, image-field parsing, reaction keys, and every service against a fake SharePoint).
* `qa/` is a browser harness (not shipped) that renders the real components against the same fake SharePoint layer: `cd qa && npm i && npm run build && node shots.mjs 1440` (screenshots) or `node interact.mjs` (33 scripted checks). Needs Chromium; set `CHROME=/path/to/chrome` if it is not in `/opt/pw-browsers`.

## 7. Troubleshooting
| Symptom | Fix |
|---|---|
| A section says "We could not load ..." | The list name in the web part settings does not match, or the list is missing. Owners see the detail under the message. Re-run `Provision-Portal.ps1`. |
| Hero shows a poster but no video; no music | No Active `HeroVideo` / `BackgroundMusic` in `PortalAssets` (run the seed, or upload). Browsers block audio until the first click or key press; that is expected. |
| Gallery shows placeholders instead of thumbnails | The thumbnail service (`getpreview.ashx`) did not return an image, for example for a type SharePoint cannot preview. The full file still opens in the lightbox. |
| Every member sees "Manage content" and Feature/Hide | Members have Edit on the site. Re-run provisioning, or remove Manage Lists from their level. |
| A reaction does not toggle | Check the unique index on `GalleryReactions.ReactionKey` exists and that people have *Contribute* on the list. |
| `video.url` embed is blank | Your tenant's content security policy blocks that host. Upload the film to `PortalAssets` instead and leave `video.url` empty. |
| `npm install` or build fails | Check `node -v` is 22.14 or later and below 23. |
| `yo` fails with EACCES in a root container | `yo` drops to a non-root user; make the target folder writable. |

## 8. Not verified here (needs your tenant)
This was built and tested without access to a SharePoint Online tenant. Verified locally: build, lint, 34 unit tests, the UI in Chromium at 360/390/820/1024/1440/1920 px, dark mode, reduced motion, and 33 interaction checks against a fake SharePoint layer.
**Not verified:** the PowerShell scripts (not run), real permissions and item-level security, the unique-index rejection, `getpreview.ashx` thumbnails, Image column values, the Portal Owners detection, the full-page app page, and the Lighthouse scores (these depend heavily on the SharePoint page chrome). Please run through the acceptance list in section 9 of the original brief on a test site.
