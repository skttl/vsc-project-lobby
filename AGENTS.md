# Agent Guidelines — vsc-project-lobby

This file contains rules and conventions for AI agents (Cascade, Copilot, etc.) working on this repository.

---

## Commit messages — REQUIRED

All commits **must** follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types and their effect on versioning

| Type | Version bump | Use for |
|---|---|---|
| `feat` | **minor** | New user-facing feature |
| `fix` | **patch** | Bug fix |
| `feat!` / `fix!` / `BREAKING CHANGE:` | **major** | Breaking change |
| `refactor` | none | Internal code restructure, no behavior change |
| `chore` | none | Tooling, dependencies, config |
| `docs` | none | Documentation only |
| `test` | none | Adding or fixing tests |
| `ci` | none | CI/CD changes |
| `perf` | none | Performance improvement |

### Examples

```
feat: group repositories by intermediate folder
fix: stop descending into ignored folders
feat!: rename setting projectLobby.roots to projectLobby.baseFolders
chore: update semantic-release to v24
docs: add configuration examples for favicon discovery
```

---

## Files you must NEVER manually edit

| File | Managed by |
|---|---|
| `CHANGELOG.md` | `semantic-release` — auto-updated on every release |
| `version` field in `package.json` | `semantic-release` — auto-bumped on every release |

Manually editing either will cause the next automated release to fail or produce incorrect output.

---

## CHANGELOG maintenance

The `CHANGELOG.md` is **automatically kept up to date** by `semantic-release` on every release triggered by a push to `main`. You do not need to write changelog entries. The release notes are derived from commit messages using the Conventional Commits format.

If you need to add context beyond what a commit message conveys, do so in the commit message body — it will be included in the release notes.

---

## Settings changes

When adding, renaming, or removing a VS Code setting:
1. Update `package.json` → `contributes.configuration`
2. Update `docs/configuration.md` with the new setting, its type, default, and examples
3. Use a `feat:` commit if it's a new setting, `fix:` if correcting a bug in an existing one, `feat!:` if renaming/removing (breaking change)

---

## Development setup

See [docs/contributing.md](docs/contributing.md) for full dev setup instructions.

---

## Branch rules

- Do **not** commit non-conventional messages directly to `main`
- Feature work should be done on a branch and merged via PR
- The release workflow runs on every push to `main` — only releasable commit types (`feat`, `fix`, breaking changes) will produce a new version
