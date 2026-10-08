# Manual setup (no PowerShell)

Everything the Anniversary Portal reads, to create by hand in SharePoint. Do it on the site where the page will live.

## Rules that matter

1. **Names without spaces.** Name each list, library and column exactly as written below (case matters). The web part finds them by these names. If you want a friendlier label, rename the display name afterwards; never create the column with the friendly name first.
2. **Create in this order** (lookups need their target to exist first):
   Branches, Departments, PortalContent, Timeline, KeyStats, Legends, MemoryLane, LeadershipMessages, BoardMessages, GalleryMedia, PortalAssets, GalleryReactions, GalleryComments.
3. **Lists:** Site contents > **New** > **List** > **Blank list**. Type the name with no spaces (for example `PortalContent`).
4. **Libraries:** Site contents > **New** > **Document library**. Same naming rule.
5. **Columns:** open the list > **Add column** (use **More...** for Lookup and for settings such as default value). Every list already has a **Title** column. You never need to create it.
6. Types used below: *Text* = single line of text. *Multi-line* = multiple lines of text, **plain text**. *Yes/No* = Yes/No (the default is given). *Date only* = date and time column, "Date only" format. *Number* = number, 0 decimals unless stated.

## Lists

### 1. Branches
| Column | Type | Notes |
|---|---|---|
| Title | built in | The branch name. You may rename the display name to "Branch". |
| Region | Choice | **Allow fill-in choices = Yes** so people can type their own. Suggested choices: Greater Accra, Ashanti, Western, Western North, Central, Eastern, Volta, Oti, Northern, Savannah, North East, Upper East, Upper West, Bono, Bono East, Ahafo |
| Active | Yes/No | Default **Yes** |

### 2. Departments
| Column | Type | Notes |
|---|---|---|
| Title | built in | Department name |
| Active | Yes/No | Default **Yes** |

### 3. PortalContent (every editable text on the page)
| Column | Type | Notes |
|---|---|---|
| Title | built in | The key, for example `hero.title`. **Index it and turn on "Enforce unique values"** (List settings > Indexed columns). Optional display name: Key |
| Value | Multi-line | The text |
| DateValue | Date and time | Used by `countdown.date` (set it to 6 Oct 2026 and the time you want) |
| ContentGroup | Choice | Hero, Countdown, Headings, Footer |

Rows: paste them from `provisioning/csv/PortalContent.csv` (see "Filling the lists" below).
`{count}` in a text is replaced by the number of Active legends.

### 4. Timeline
| Column | Type |
|---|---|
| Title | built in (the milestone text) |
| Year | Number |
| SortOrder | Number |

### 5. KeyStats
| Column | Type | Notes |
|---|---|---|
| Title | built in | The label, for example "Branches Nationwide" |
| Value | Text | Text, not number, so "2k+" works |
| SortOrder | Number | |

### 6. Legends
| Column | Type | Notes |
|---|---|---|
| Title | built in | Full name (display name: Name) |
| Department | **Text** (or Lookup) | Single line of text is easiest to paste. A lookup to **Departments** also works |
| Position | Text | |
| Branch | **Text** (or Lookup) | Same: text, or a lookup to **Branches** |
| Joined | Date only | Not shown on the page now, but keep it |
| Quote | Multi-line | Leave empty until you have real text |
| CareerHighlights | Multi-line | |
| FunFact | Multi-line | |
| Photo | **Image** | Add column > Image. Upload a photo per person |
| SortOrder | Number | Order in the tree: 1 to 13 |
| Active | Yes/No | Default **Yes** |

### 7. MemoryLane
| Column | Type | Notes |
|---|---|---|
| Title | built in | The caption shown on the tile |
| Year | Number | Not shown, but **must exist** |
| Photo | **Image** | |
| SortOrder | Number | |

### 8. LeadershipMessages
| Column | Type |
|---|---|
| Title | built in (for example "Message from the CEO") |
| Message | Multi-line |
| SortOrder | Number |

### 9. BoardMessages (staff post here through the page)
| Column | Type | Notes |
|---|---|---|
| Title | built in | The page fills it in |
| Message | Multi-line | Plain text |
| Celebrating | **Lookup** | From **Legends**, column **Title**. Not required |
| Tags | Choice | **Allow multiple selections = Yes**. Choices: Leadership, Teamwork, Innovation, Customer Focus, Audacious Steps, Appreciation |
| Featured | Yes/No | Default **No** |
| Published | Yes/No | Default **Yes** |

Index these columns (List settings > Indexed columns): **Published, Featured, Celebrating, Created**.

### 10. GalleryReactions (one row per click)
| Column | Type | Notes |
|---|---|---|
| Title | built in | The page fills it in |
| GalleryItem | **Lookup** | From **GalleryMedia**, column **ID** or **Title** (Title is fine). Index it |
| Reaction | Choice | Like, Clap, Celebrate, Love |
| ReactionKey | Text | **Index it and turn on "Enforce unique values".** This is what stops one person reacting twice |

### 11. GalleryComments
| Column | Type | Notes |
|---|---|---|
| Title | built in | The page fills it in |
| GalleryItem | **Lookup** | From **GalleryMedia**. Index it |
| Comment | Multi-line | |
| Published | Yes/No | Default **Yes** |

## Document libraries

### 12. GalleryMedia (photos and videos; only admins upload)
| Column | Type | Notes |
|---|---|---|
| Title | built in | The caption (display name: Caption) |
| Category | Choice | Branch Celebrations, Anniversary Events (these are the only two filter buttons visitors see, besides All) |
| Branch | **Text** | Typed freely, not a lookup |
| Region | **Text** | Typed freely |
| Department | **Lookup** | From **Departments**, column **Title** |
| Published | Yes/No | Default **Yes** |
| Credit | Text | Optional "posted by" |
| DateTaken | Date only | Optional |

Index: **Published, Created**. Create **GalleryMedia before** GalleryReactions and GalleryComments.

### 13. PortalAssets (the page's own media)
| Column | Type | Notes |
|---|---|---|
| Title | built in | |
| AssetType | Choice | HeroVideo, HeroPoster, Logo, BackgroundMusic, AnniversaryVideo, VideoPoster, Other |
| Active | Yes/No | Default **Yes** |

Upload these files from the repo folder `provisioning/media/`. For each, set **Title**, **AssetType** and leave **Active = Yes**:

| File | Title | AssetType |
|---|---|---|
| hero-celebration-loop.mp4 | Hero celebration loop | HeroVideo |
| hero-celebration-poster.webp | Hero poster | HeroPoster |
| logo-20th-anniversary.webp | 20th anniversary logo | Logo |
| board-watermark.webp | **Watermark** (exactly this word) | **Other** |
| background-music.mp3 | Background music | BackgroundMusic |
| anniversary-video-web.mp4 | Anniversary film | AnniversaryVideo |
| anniversary-video-poster.webp | Anniversary film poster | VideoPoster |

If you replace a file later, upload the new one and untick Active on the old one (the newest Active file of each type is used).

## Filling the lists

Fast way: open `provisioning/csv/<ListName>.csv` in Excel, copy the rows (not the header), open the list, switch to **Edit in grid view**, click the first empty Title cell and paste. Do **Departments** and **Branches** first, then the others. Paste one column (or a few adjacent columns) at a time, not the whole sheet at once.
Files provided: Departments, Branches, PortalContent, Timeline, KeyStats, Legends, MemoryLane, LeadershipMessages.
Then, by hand:
* **Legends**: open each of Selom Cofie Atta, Edna Engmann and Simon Adu-Gyamfi and upload their photo into **Photo**.
* **MemoryLane**: upload a photo into **Photo** for each tile.
* **Branches**: add your 81 branches (Title and Region).

## Permissions (view-only for visitors, you edit everything)

This is the default. Visitors can look, search and filter. They cannot post, react or comment. Only you (and anyone you add as an owner) can change content and upload pictures.

1. **Make yourself an owner:** Site settings > Site permissions. Your name must be in the **Owners** group (or in a group called `Portal Owners` with **Edit**).
2. **Everyone else reads only:** in Site permissions, the **Members** group and the **Visitors** group must have **Read**, not Edit or Contribute. People with Edit or Manage Lists are treated as owners and see the management buttons.
3. **Leave the lists as they are.** Do not stop inheriting permissions on `BoardMessages`, `GalleryReactions` or `GalleryComments`. If you already did, open each list > List settings > **Permissions for this list** > **Delete unique permissions**, so it follows the site again.
4. **What visitors see:** the board shows messages that you add or approve, but no form to post. Gallery photos open in a viewer with the counts, but no reaction buttons and no comment box.

**To let visitors post, react and comment later** (no admin needed): edit the page, open the web part's settings and turn on **Let visitors post on the board** and **Let visitors react and comment on gallery photos**. Then, for each of BoardMessages, GalleryReactions and GalleryComments: List settings > Permissions for this list > Stop inheriting permissions > grant **Visitors** and **Members** **Contribute**; then Advanced settings > Item-level Permissions: Read access = **Read all items**, Create and Edit access = **Create items and edit items that were created by the user**.

## Deploying the web part

Upload `spfx-anniversary-portal.sppkg` to the tenant App Catalog and **Deploy**, then add the **Anniversary Portal** web part to a full-width **App page** and publish.
If you named anything differently from this guide, edit the web part and type your names into its settings panel.

## Quick check
* Page opens and every section shows content (a red-bordered message such as "We could not load the timeline" means a list or column name is wrong).
* View the page as a normal member: they can search and view but not post.
* If you turned on visitor reactions: click a reaction twice in the gallery; it toggles on and off.
