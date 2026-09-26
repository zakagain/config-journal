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
| `npm run book "Title"` | Create book review in `docs/books/` |
| `npm test` | Intentional `exit 1` — do not run |

## Git

**Never run `git add`, `git commit`, `git push`, `git merge`, `git rebase`, `git tag`, or any other command that writes to the repository history or index unless the user has explicitly asked you to in that same request. Approval for one commit is not approval for the next one — ask again every time.**

- Read-only commands (`git status`, `git log`, `git diff`, `git show`) — ok without asking
- `git add`, `git commit`, `git push` — **explicit user permission required, every time.** Never infer permission from a previous approval, from the task at hand, or from a standing instruction to "finish" the work. When you are done editing, stop and leave the changes unstaged.
- Do not amend, force-push, rebase, or change git config unless explicitly asked
- If a commit fails or a hook rejects it, fix the issue and create a *new* commit — never amend or retry with `--no-verify`
- CI auto-deploys to GitHub Pages on push to `main`, so an unwanted push publishes the site

## Content rules

- **Frontmatter**: every `docs/` file needs `title` and `editLink: true`. The scripted templates (`npm run review|note|game|app|book`) set these automatically. Global edit link is configured in `.vitepress/config.mts`.
- **Filenames**: `lowercase-kebab-case.md`.
- **Sidebar**: update `.vitepress/config.mts` when adding or moving pages. Each review type (App, Game, Movie, Book) needs entries in both the top-level and the collapsed sidebar sections.
- **Links**: relative internal links. `ignoreDeadLinks: false` — build fails on broken links.
- **Headings**: ATX (`##`). One `h1` per file.

## Verify

Run `npm run docs:build` before finishing — broken links produce errors.
