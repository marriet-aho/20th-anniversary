# Brief background: Anniversary Portal on InfoPortal

## What the request entails
Two one-time actions on the InfoPortal SharePoint site:
1. **Replace the installed app** "Anniversary Portal" with the fixed file `spfx-anniversary-portal.sppkg`, version 1.0.10.0 (App Catalog > Replace > Deploy). About 130 KB. Same app, no new permissions.
2. **Let visitors post messages and react to photos.** Give Visitors and Members the *Contribute* permission on two lists only: **BoardMessages** and **GalleryReactions**.

## Underlying rationale
- The portal is the staff-facing page for the bank's **20th anniversary** (2006 to 2026). It carries a countdown, a timeline, the 13 long-serving colleagues ("Audacious Legends"), Memory Lane, a celebration photo gallery and a message board.
- The installed version has known faults: the gallery and board fail to load ("getPaged is not a function"), and the gallery cannot be filtered or edited by owners on the page. Version 1.0.10.0 fixes these.
- By default SharePoint visitors can only read. Posting a message or a reaction saves a new item in a list, which needs Contribute on that list. Without it, staff see "Sorry, your message could not be posted".
- Permissions are limited to **2 of the 13 lists and libraries** the portal uses. All other content stays read-only for visitors; only owners can edit it.

## What it seeks to achieve
- A working page for all staff: gallery, board and reactions load and save.
- Owners (not the admin) maintain the content from the page itself: photos, wording, countdown date, figures, legends and filter buttons. No further admin visits for content changes.
- Minimal risk: no new API permissions, no tenant-wide changes, deletions go to the Recycle Bin.

## Key figures (as shown on the portal)
- 20 years of excellence; 81 branches nationwide; 2,000+ employees; 2 million+ customers served (figures from the portal's original content, to be confirmed by the owner before publication).
- 13 legends; 11 lists and 2 libraries; 7 sections on the Edit page.
- Quality checks on the package: 35 automated tests passing, 0 build warnings.

## References
- Package: `spfx-anniversary-portal.sppkg` v1.0.10.0 (this request).
- Setup guide: `MANUAL-SETUP.md` (lists, columns, permissions, owner tools).
- Microsoft Learn: "Use the App Catalog to make custom business apps available for your SharePoint Online environment"; "SharePoint Framework overview"; "Edit permissions for a list or library".
