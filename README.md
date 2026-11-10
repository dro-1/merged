# merged

Find open-source repositories that are ready for your first contribution.

merged searches GitHub for public repositories by language, framework and activity. It shows the signals that matter when picking a project to contribute to: open beginner issues, a license, a contributing guide, and how active the maintainers are.

## Features

- **Filters:** languages and frameworks (multi-select), minimum stars, minimum open _good first issue_ and _help wanted_ issues, and how recently the repo was pushed to. Every change applies immediately.
- **Contributor readiness:** badges for open good-first-issue and help-wanted counts, plus the license (repos without one are flagged).
- **Maintainer activity**, streamed in per repo after the list renders:
  - a link to the contributing guide
  - how long ago a PR was last merged
  - merged PRs in the last 30 days
  - the median time to close an issue
- **Shareable URLs:** filters live in the query string as repeated keys, e.g. `/?langs=go&langs=rust&frameworks=react&minStars=500`. Default values are left out.
- **Pagination:** 20 results per page with "Load more", up to 200 results. Past that, you're asked to narrow your filters.
- **Resilient:**
  - A failed search keeps the filters usable and offers a retry.
  - GitHub rate limits get their own message.
  - Raw upstream errors never reach the browser.
- **Light and dark themes,** following your system setting. The layout works at phone width.

## Getting started

Requires Node.js 20.19+ (or 22.12+) and a GitHub token.

```bash
npm install
cp .env.example .env   # then set GITHUB_TOKEN
npm run dev            # http://localhost:3000
```

### GitHub token

All GitHub requests are made on the server with your token. It is never sent to the browser.

1. Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new).
2. Under **Repository access**, choose **Public repositories (read-only)**. No other permissions are needed.
3. Put it in `.env` as `GITHUB_TOKEN=...`. The `.env` file is gitignored.

## Scripts

| Command           | What it does                                    |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | Start the dev server on port 3000               |
| `npm run build`   | Production build (client and server) to `dist/` |
| `npm run preview` | Serve the production build locally              |
| `npm run lint`    | ESLint (`@tanstack/eslint-config`)              |
| `npm run format`  | Prettier, then ESLint `--fix`                   |
| `npm run check`   | Check formatting without writing                |

## How it works

### Two-phase loading

A single GraphQL query that also fetched activity for a whole page took 9–11 seconds and sometimes returned a 502, so loading is split in two:

1. **Search.** The route loader runs one GitHub search query, filtered by the qualifiers below. It returns names, stars, push date, license and the open label counts. The list renders as soon as this resolves.
2. **Details.** Contributing guide and maintainer activity for each repo are fetched in batches of 5 (`nodes(ids:)`). The loader doesn't await these promises, so they stream into the server-rendered page, and each row fills in as its batch completes.

The search string built from the filters looks like this:

```
is:public archived:false stars:>=50 pushed:>=2026-10-11
language:"Go" language:"Rust" topic:react,vue good-first-issues:>2
```

Repeated `language:` qualifiers match any of the listed languages, and `topic:a,b` matches any of the listed topics. Frameworks map to GitHub topics.

### Caching

The server keeps an in-memory TTL cache (5 minutes):

- **Search pages** are keyed by query string and cursor.
- **Repo details** are cached per repository, so a repo that appears in several searches is fetched only once.

The cache stores promises, so concurrent identical requests share one GitHub call. Failed requests are evicted, so a retry really hits GitHub again. The cache is per process and is cleared on restart.

### Rate-limit cost

Each search page and each details batch is one GraphQL query. Each has cost 1 when measured, against GitHub's budget of 5,000 points an hour per token. With caching, a first page is about 5 queries: one search plus four details batches.

## Tech stack

- [TanStack Start](https://tanstack.com/start) and [TanStack Router](https://tanstack.com/router): SSR, file-based routing, server functions, and loaders that stream deferred data.
- [Tailwind CSS v4](https://tailwindcss.com/), with semantic colour tokens in `src/styles.css`.
- [shadcn/ui](https://ui.shadcn.com/) primitives (Popover, Command, Select) on [Radix](https://www.radix-ui.com/) and [cmdk](https://cmdk.paco.me/).
- The GitHub GraphQL API.

## Project structure

```
src/
├── routes/
│   ├── __root.tsx          # HTML shell, fonts, app-wide error and not-found pages
│   └── index.tsx           # search page: loader, filters, results, error state
├── components/
│   ├── RepoFilterPanel.tsx # filter toolbar and active-filter chips
│   ├── MultiSelect.tsx     # searchable multi-select (Popover + Command)
│   ├── RepoResults.tsx     # result list with "Load more"
│   ├── RepoListItem.tsx    # one repo card: badges and streamed activity
│   ├── StatusMessage.tsx   # error and empty notices
│   └── ui/                 # shadcn components (generated, owned by the repo)
├── server/                 # server-only: never bundled for the browser
│   ├── github-client.ts    # authenticated GraphQL fetch, timeouts, rate-limit detection
│   ├── github.ts           # queries, server functions, caches
│   └── cache.ts            # promise-storing TTL cache
├── helpers/
│   ├── search/             # filter types and parsing, query building, URL format
│   ├── repo/               # activity metrics and batched detail requests
│   ├── errors.ts           # user-facing error messages
│   └── format.ts           # number, date and duration formatting
└── styles.css              # Tailwind theme tokens, light and dark
```

## Known limitations

- **Exact label names only.** Beginner issues are counted from the exact labels `good first issue` and `help wanted`. Variants such as `beginner` or `easy` aren't matched.
- **Bot closures count.** The median close time includes issues closed by stale bots, which can make maintainers look faster than they are.
- **The cache is in memory.** It isn't shared between server instances and is lost on restart.
- **No ranking.** Results come in GitHub's own order (best match).
