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
| Department | **Lookup** | Get information from **Departments**, column **Title** |
| Position | Text | |
| Branch | **Lookup** | From **Branches**, column **Title** |
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
| Category | Choice | Then & Now, Branch Celebrations, Team Moments, Community Impact, Anniversary Events, Fun Memories |
| Branch | **Text** | Typed freely, not a lookup |
| Region | **Text** | Typed freely |
| Department | **Lookup** | From **Departments**, column **Title** |
| Featured | Yes/No | Default **No** |
| Published | Yes/No | Default **Yes** |
| Credit | Text | Optional "posted by" |
| DateTaken | Date only | Optional |

Index: **Published, Featured, Created**. Create **GalleryMedia before** GalleryReactions and GalleryComments.

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

Fast way: open `provisioning/csv/<ListName>.csv` in Excel, copy the rows (not the header), open the list, switch to **Edit in grid view**, click the first empty Title cell and paste. Do **Departments** and **Branches** first, then the others. Lookup columns (Department, Branch in Legends) accept the name as text when pasted in grid view; check that they all resolved.
Files provided: Departments, Branches, PortalContent, Timeline, KeyStats, Legends, MemoryLane, LeadershipMessages.
Then, by hand:
* **Legends**: open each of Selom Cofie Atta, Edna Engmann and Simon Adu-Gyamfi and upload their photo into **Photo**.
* **MemoryLane**: upload a photo into **Photo** for each tile.
* **Branches**: add your 81 branches (Title and Region).

## Permissions

1. **Create the group:** Site settings > Site permissions > **Advanced permissions settings** > **Create Group**, name it `Portal Owners`, give it **Edit** on the site, and add the people who manage content.
2. **Site level:** make sure *Members* have **Read**, not Edit (Site permissions > Members group > permission level). People with Edit or Manage Lists are treated as owners and see the Feature, Hide and Delete buttons.
3. **For each of BoardMessages, GalleryReactions and GalleryComments:**
   * List settings > **Permissions for this list** > **Stop inheriting permissions**.
   * Then **Grant permissions**: add your **Visitors** and **Members** groups with **Contribute**.
   * Then List settings > **Advanced settings** > **Item-level Permissions**: *Read access* = **Read all items**; *Create and Edit access* = **Create items and edit items that were created by the user**.
4. Everything else stays inherited: everyone reads, owners edit.

## Deploying the web part

Upload `spfx-anniversary-portal.sppkg` to the tenant App Catalog and **Deploy**, then add the **Anniversary Portal** web part to a full-width **App page** and publish.
If you named anything differently from this guide, edit the web part and type your names into its settings panel.

## Quick check
* Page opens and every section shows content (a red-bordered message such as "We could not load the timeline" means a list or column name is wrong).
* Post a message on the board as a normal member: it appears first.
* Click a reaction twice in the gallery: it toggles on and off.
