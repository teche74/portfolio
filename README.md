# Ujjwal Bisht: the field notebook

A static personal site built with [Astro](https://astro.build), designed as a hand-kept field notebook. Every section is its own page, and each page is a different kind of paper object: a passport, a trail map, a logbook, a manuscript, a bookshelf, a report card and a cork board. There are no animation libraries, glass effects or particle canvases. The only motion is small paper movements, like stamps landing, cards sliding and a book being pulled from the shelf, and `prefers-reduced-motion` turns all of it off.

## Sections

| Route | Object | What's on it |
|---|---|---|
| `/` | Notebook cover | Title plate, the Contents page (a table of contents with page numbers), a "Today" sticky with the latest log entry, a streak stamp and "currently reading". |
| `/about/` | Passport | Photo page with an MRZ line; phone and email are assembled in the browser (never plain text in the HTML) with copy buttons; the bio is written as a letter; skills are visa stamps. |
| `/journey/` | Trail map | The timeline as a winding trail: polaroids (projects), medals (awards), certificates, flags (education/work), and one "camp" per quarter for public GitHub repos. A map key filters the entry types. The trail becomes vertical on phones. |
| `/practice/` | Ruled logbook | One line per day with a handwritten date and a mood doodle, split into a two-column spread: **At work** on the left, **Self-improvement** on the right, each with its own tally-mark hours, highlighter tags and notes (stacked on phones; an empty half says "nothing logged"). A Both / At work / Self toggle (`?track=work\|self`) works together with the tag filter (`?tag=`). A page per entry at `/practice/<id>/` uses the same two-part layout. |
| `/practice/tracker/` | Graph paper | Ink-stamp heatmap per year (with a Both / At work / Self toggle), streaks (any logging counts), hours per week stacked as work vs self, entries per month, topics per month, a "currently learning" strip and monthly recaps. Recomputed in the browser with today's date in IST. |
| `/practice/efforts/` | Ledger | Totals for this month, this year and all time: log entries, hours at work, hours on self-improvement, total hours, books, pages, other reading, posts, TILs, LeetCode solved (live) and GitHub repos (live). |
| `/blog/` | Manuscript index | Numbered posts with reading time and tags; posts have a drop cap, footnotes as margin sidenotes, prev/next and tags. RSS at `/rss.xml`, and a sitemap. |
| `/reading/` | Bookshelf | Book spines sized and coloured from a hash of the title, with scroll snap on small screens. Clicking a spine pulls out a panel with stars, a progress ribbon and notes (`#slug` deep-links). Non-books are index cards in a drawer. Stats row. Full keyboard support: arrows, Home/End, Enter and Escape. |
| `/projects/` | Specimen sheets | Featured repos pinned as specimens, an "On the bench" strip, and a ledger archive of every public repo with search, language filter, sort and a forks toggle. |
| `/stats/` | Report card | LeetCode (live), contest rating and badges as sewn-on patches, GitHub (live), plus hand-kept HackerRank and GeeksforGeeks rows. |
| `/now/` | Planner page | This month's plan with ticked checkboxes, on a torn-edged planner sheet with an "updated" stamp. |
| `/til/` | Sticky wall | "Today I learned" notes on cork, with a tag filter and a permalink per note. |
| `/year/<year>/` | Printed annual report | Figures, a month-by-month chart, highlights from the timeline, top topics and new skills for that year. |
| `/resume/` | Clipboard | The PDF clipped to a board, with download and open buttons. Phones get a download card instead. |
| 404 | Torn page | "This page was torn out". |

Everywhere: a light/dark theme with no flash of the wrong theme, a command palette (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>K</kbd>, or the search button) to jump to any page, entry, post, book or repo, View Transitions between pages, visible focus rings, and no horizontal scroll at 390px.

## Run locally

Requires Node 20 or newer.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run preview    # serve dist/ locally
npm run check      # astro check (types and content)
```

To preview exactly as GitHub Pages serves a project site, build with the base path. In Git Bash, `MSYS_NO_PATHCONV=1` stops the shell from turning `/portfolio` into a Windows path:

```bash
MSYS_NO_PATHCONV=1 BASE_PATH=/portfolio npm run build && npm run preview
```

## Writing content

All content is Markdown in `src/content/`. Files that start with `_` are templates and are ignored.

| Command | Creates |
|---|---|
| `npm run new-entry -- "What I did"` | `src/content/daily/<today IST>.md` (`--work-hours`, `--work-tags`, `--self-hours`, `--self-tags`, `--self-topics`, `--mood`; the old `--hours`/`--tags`/`--topics` fill the self-improvement half; a second entry that day becomes `-2.md`; a date first, like `2026-10-01 "Title"`, picks a different day) |
| `npm run new:post -- "Post title"` | `src/content/blog/<slug>.md`, starting as `draft: true` (`--tags`) |
| `npm run new:read -- "Book title"` | `src/content/reading/<slug>.md` (`--author`, `--type book\|article\|paper\|video\|course`, `--status reading\|finished\|want`, `--pages`, `--url`, `--tags`) |
| `npm run new:til -- "What I learned"` | `src/content/til/<today>-<slug>.md` (`--tags`) |

Create or edit `src/content/now.md` for the Now page (or use the Now tab in /admin). The frontmatter for each collection is defined in `src/content.config.ts`, and the build fails with a clear message if a field is wrong. Dates are quoted `"YYYY-MM-DD"` strings, so no UTC shifting happens. "Today" and streaks use IST (`TIMEZONE` in the config), and a streak stays alive until the end of today even if today has no entry yet.

- **Daily:** `date`, `title`, optional `mood` and `draft`, and two optional halves, `work` and `self`, each with `hours` (0-24, drawn as tallies and used for heatmap shading), `tags` and `topics` (for the topics chart). The body is split by the headings `## At work` and `## Self-improvement`; either half may be left out. Keep the work half general: no client names, ticket IDs or internal details. Example:

  ```markdown
  ---
  date: "2026-10-01"
  title: "Regression pass and a DP session"
  mood: "🙂"
  work:
    hours: 6
    tags: ["qa", "api testing"]
  self:
    hours: 1.5
    tags: ["dsa"]
    topics: ["dynamic programming"]
  ---

  ## At work
  - Ran the regression suite and wrote up two flaky tests.

  ## Self-improvement
  - Three knapsack problems.
  ```

  Older entries with top-level `hours`/`tags`/`topics` and no headings still work: they count as self-improvement.
- **Blog:** `title`, `date`, `summary`, `tags`, optional `cover`, `draft`. Footnotes (`text[^1]` … `[^1]: note`) become margin sidenotes on wide screens and tap-to-open notes on phones.
- **Reading:** `title`, `author`, `type`, `status`, optional `started`, `finished`, `rating` (0-5, halves allowed), `pages`, `progress` (0-100), `url`, `cover`, `tags`. The body is your notes.
- **TIL:** `date`, `title`, `tags`. Keep the body to a few lines.
- **Now:** `title` (usually the month), `updated`, `location`. Use `- [x]` / `- [ ]` for the checklist.

### Empty collections and sample content

The site now starts empty: the daily log, reading, TIL and blog folders hold only their `_TEMPLATE.md`, and there is no `src/content/now.md`. Every page has a designed empty state ("The logbook is blank", "The first essay is being drafted", "Planner page not filled in yet", a blank tracker calendar, zeros in the ledger), the RSS feed is valid with no items, and entry pages are simply not generated. The build prints a "collection is empty" / "No files found" warning for each empty collection; that is expected and harmless, and it goes away once the first entry exists.

Entries can be marked `sample: true` (blog, reading, TIL, Now) to show a pencilled "sample" note, and `SHOW_SAMPLES = false` in `src/config.ts` hides them all at once. No sample entries exist at the moment, so the flag currently has nothing to act on.

## Personalise

Everything lives in **`src/config.ts`**:

| Setting | What it does |
|---|---|
| `GITHUB_USERNAME` | Drives the live GitHub data, the avatar, the GitHub camps on the trail and the project ledger. Set it to `"TODO"` to hide all of them. |
| `LEETCODE_USERNAME` | Drives the live LeetCode report card. Set it to `"TODO"` to hide it. |
| `REPO` | The repo `/admin` commits to (`owner`, `name`, `branch`) and the content paths. **Change `name` if your repo isn't called `portfolio`.** |
| `SHOW_SAMPLES` | Shows or hides entries marked `sample: true` (none exist right now). |
| `TIMELINE` | Whether GitHub repos and forks join the trail. |
| `FEATURED_REPOS` / `FEATURED_AUTO_COUNT` | Repos pinned as specimens, in order. Leave the list empty to pick the top non-fork repos by stars, then by most recent push. `REPO_PITCHES` in `src/data/projects.ts` adds hand-written pitches. |
| `SITE`, `COVER_LINE`, `BIO`, `SKILLS`, `SOCIALS`, `LINKS` | Text and links. Any link containing `TODO` is hidden automatically. |
| `SITE.resume` | Path of the resume PDF in `public/`. Set it to `""` to hide the resume links. |

Other data files:

- `src/data/timeline.json`: the hand-written journey entries (`education`, `work`, `award`, `certification`, `skill`, `project`). Entries whose title, org or date contains `TODO` get a TODO badge until you fill them in.
- `src/data/projects.ts`: the "On the bench" cards and repo pitches.
- `src/data/profiles.ts`: the coding-profile rows and the LeetCode snapshot (`LEETCODE_FALLBACK`) shown until live numbers arrive.
- `public/resume/Ujjwal_Bisht_Resume.pdf`: **to update the resume, overwrite this file with the same name and push.**
- `public/og.png`: the social preview image. Regenerate it on Windows with `powershell -File scripts/make-og.ps1`.

Timeline entry format (`start`/`end` accept `YYYY`, `YYYY-MM`, `YYYY-MM-DD` or `"TODO"`; `end` also accepts `"present"`):

```json
{ "id": "cert-istqb", "type": "certification", "title": "ISTQB Foundation Level",
  "org": "ISTQB", "start": "2025-06", "description": "…",
  "link": "https://…", "credential": "https://…", "tags": ["Test design"] }
```

## /admin: edit from the browser

The site is static, so `/admin` saves by committing straight to the repo through the GitHub Contents API, and GitHub Actions rebuilds the site in about a minute. The page isn't linked in the nav, is marked `noindex` and is excluded from the sitemap. It can't change anything without a valid token, so it is safe for the page itself to be public.

**Tabs:** Daily, Blog, Reading, TIL, Now and Timeline.

- Each Markdown tab has a frontmatter form built from `src/lib/admin-docs.ts`, a Markdown editor with a live preview, and a preview of the exact file that will be committed. Drafts autosave in the browser. <kbd>Ctrl</kbd>+<kbd>S</kbd> in the editor commits (or downloads, when you aren't connected).
- **Daily** has two clearly separated panels, **At work** and **Self-improvement**, each with its own hours, tags, Markdown editor and preview (the self panel also has topics). A pencilled reminder above the work editor says to keep it general: no client names, ticket IDs or internal details. The file is written in the split format above; an empty panel is left out. Loading an old-style entry puts its hours, tags and notes in the self-improvement panel, so saving it converts it.
- **Files on GitHub** lists the folder's files so you can load one and edit it. Updates are sent with the file's `sha`, so an edit made somewhere else is never silently overwritten. A second daily entry on the same day becomes `-2.md`. For the other tabs you are asked before a file with the same name is replaced.
- **Timeline:** add, edit or delete any entry. Each save re-reads the latest `timeline.json`, applies your change and commits. On a 409/422 conflict it re-reads and retries automatically.
- **No token?** Every tab has a download button; put the file in the folder shown and commit it yourself.

### Create the token (one time)

1. Go to <https://github.com/settings/personal-access-tokens/new> (a fine-grained token).
2. **Repository access:** *Only select repositories*, then choose this repo only.
3. **Permissions → Repository permissions → Contents: Read and write.** Nothing else is needed.
4. Set an expiry (for example 90 days), generate it and copy the `github_pat_…` value.
5. Open `https://<your-site>/admin/`, paste the token and click **Save & verify**.

The token is stored **only in that browser's `localStorage`** and is sent only to `api.github.com`. It never enters the repo or the build. Use **Forget token** on shared machines, and revoke it on GitHub at any time.

## Deploy free on GitHub Pages

1. Create a repo on GitHub, for example `portfolio` (or `teche74.github.io` for the root URL, then update `REPO.name` to match).
2. Push this folder to `main`.
3. On GitHub, open **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
4. `.github/workflows/deploy.yml` runs on every push to `main`. It sets `SITE_URL` and `BASE_PATH` automatically, so the site works at `https://teche74.github.io/portfolio/` or at `https://teche74.github.io/`.

Netlify, Vercel and Cloudflare Pages also work (build `npm run build`, output `dist`). They serve from `/`, so no base path is needed. Set `SITE_URL=https://your-domain` for correct canonical, RSS and Open Graph URLs.

## Known limitations

- **LeetCode stats rely on unofficial public proxies**, because LeetCode's own API blocks browser requests. The site asks `alfa-leetcode-api.onrender.com` and `leetcode-api-faisalshohag.vercel.app` at the same time and uses the first answer. The onrender proxy can take about 30 seconds to wake from a cold start. If every proxy fails, the page shows the last cached result, or the snapshot in `LEETCODE_FALLBACK`.
- **GitHub API:** anonymous requests are limited to 60 per hour per visitor IP. Results are cached for an hour, and on a rate limit the site shows the stale cache with a note. Only the first 100 repos are fetched.
- The contribution graph on /stats/ is an image from `ghchart.rshah.org`, a third-party service. It hides itself if that service fails.
- GitHub-derived trail camps, project ledger rows and repo counts load in the browser, so search engines see only the hand-written content.
- The heatmap and streaks are recomputed in the browser with the real date. The build-time HTML reflects the day the site was built.
