# Contributing

## Development setup

### Prerequisites

- [Node.js](https://nodejs.org/) LTS
- [VS Code](https://code.visualstudio.com/)

### Getting started

```bash
git clone https://github.com/skttl/vsc-project-lobby.git
cd vsc-project-lobby
npm install
```

### Build

```bash
npm run compile        # compile TypeScript once
npm run watch          # compile in watch mode
```

### Run in VS Code

1. Open the repo in VS Code
2. Press `F5` to launch the **Extension Development Host** — a new VS Code window opens with the extension loaded
3. Open the **Project Lobby** view, add a base folder, and test switching between projects

### Package locally

```bash
npx vsce package --no-dependencies
```

This produces a `.vsix` file you can install manually via **Extensions: Install from VSIX...**.

---

## Commit message conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to drive automatic versioning and changelog generation via `semantic-release`.

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Triggers release? | Use for |
|---|---|---|
| `feat` | Yes — **minor** | New user-facing feature |
| `fix` | Yes — **patch** | Bug fix |
| `feat!` / `fix!` / `BREAKING CHANGE:` | Yes — **major** | Breaking change |
| `refactor` | No | Internal restructure |
| `chore` | No | Tooling, deps, config |
| `docs` | No | Documentation only |
| `test` | No | Tests |
| `ci` | No | CI/CD changes |
| `perf` | No | Performance |

### Examples

```
feat: group repositories by intermediate folder
fix: stop descending into ignored folders
feat!: rename setting projectLobby.roots to projectLobby.baseFolders
docs: update configuration examples
chore: upgrade vsce to v3
```

---

## Release process

Releases are **fully automated**. There is nothing to do manually.

1. Merge your PR (or push commits) to `main`
2. GitHub Actions runs the release workflow
3. `semantic-release` analyzes commits since the last release, determines the version bump, and:
   - Updates `version` in `package.json`
   - Updates `CHANGELOG.md`
   - Creates a git tag (`vX.Y.Z`)
   - Creates a GitHub Release with the auto-generated notes
   - Attaches the `.vsix` artifact to the release

### Files managed automatically — do not edit manually

| File | Managed by |
|---|---|
| `CHANGELOG.md` | `semantic-release` |
| `version` in `package.json` | `semantic-release` |

---

## Adding or changing settings

When adding, renaming, or removing a VS Code setting:

1. Update `contributes.configuration` in `package.json`
2. Update `docs/configuration.md` — add/update the setting's description, type, default, and examples
3. Use the appropriate commit type:
   - New setting → `feat:`
   - Bug in existing setting → `fix:`
   - Rename or removal (breaking) → `feat!:`
