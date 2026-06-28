# Config Journal — backlog/ fix list

Prioritised improvements from a project review (tooling, consistency, and maintenance). Re-order as you like.

## Medium priority

- `**games.md` vs `game-reviews.md`** — Both look like game hub pages; `game-reviews.md` appears unused in navigation and grep. Merge, delete, or add a sidebar/link entry so there is one obvious entry point.

## Low priority

- **Footer copy** — Theme footer has a stray space: `CC-BY-4.0 license .` — tidy punctuation in `.vitepress/config.mts`.
- `**docs/LICENSE.md` copyright line** — Still says `© zakagain 2025` while the site footer uses 2026; refresh when you do annual housekeeping.
- **Filename conventions** — `AGENTS.md` prefers lowercase kebab-case; some movie files use PascalCase (`The-Adam-Project.md`, etc.). Harmless for URLs, but renaming would match stated conventions (only if you accept broken external links risk).
- **Dependencies** — Periodically bump `vitepress` (and transitive deps) after checking release notes; no urgent issue noted on current `^1.6.4`.
- `**npm test`** — Script is intentionally `exit 1` per `AGENTS.md`. A one-line comment in `package.json` or README prevents “fix the tests” confusion for new contributors.
