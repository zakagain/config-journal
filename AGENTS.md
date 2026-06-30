# Agent Guidelines: config-journal

VitePress docs site at `docs/`. British English, opinionated tone. Owner: zakagain.

## Prerequisites

- **Node**: `>=24` (see `.nvmrc`)

## Commands

| Command | Action |
| :--- | :--- |
| `npm run docs:dev` | Dev server |
| `npm run docs:build` | Build site (output: `.vitepress/dist`) |
| `npm run docs:preview` | Preview build |
| `npm run review "Title"` | Create movie review in `docs/movies/` |
| `npm run note "Title"` | Create general note in `docs/` |
| `npm run game "Title"` | Create game review in `docs/games/` |
| `npm run app "Title"` | Create app/tool review in `docs/apps/` |
| `npm test` | Intentional `exit 1` — do not run |

## Git

- `git status`, `git log` — ok without asking
- `git add`, `git commit`, `git push` — require explicit user permission
- CI auto-deploys to GitHub Pages on push to `main`

## Content rules

- **Frontmatter**: every `docs/` file needs `title` and `editLink: true`. The scripted templates (`npm run review|note|game`) set these automatically. Global edit link is configured in `.vitepress/config.mts`.
- **Filenames**: `lowercase-kebab-case.md`.
- **Sidebar**: update `.vitepress/config.mts` when adding or moving pages. Games need entries in both the "Game Reviews" and the collapsed "Games" sidebar sections.
- **Links**: relative internal links. `ignoreDeadLinks: false` — build fails on broken links.
- **Headings**: ATX (`##`). One `h1` per file.

## Verify

Run `npm run docs:build` before finishing — broken links produce errors.
