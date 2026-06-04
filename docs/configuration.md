# Configuration

All settings are under the `projectLobby` namespace and can be configured in your VS Code `settings.json` (user or workspace level).

---

## `projectLobby.baseFolders`

**Type:** `string[]`
**Default:** `[]`

Absolute paths to the folders that should be scanned for git repositories. Each path is walked recursively (subject to `maxDepth` and `ignoreFolders`).

### Example

```jsonc
{
  "projectLobby.baseFolders": [
    "C:\\Workspaces",
    "D:\\Clients"
  ]
}
```

You can also add folders from the view itself using the **Add base folder...** button, which writes to this setting.

---

## `projectLobby.maxDepth`

**Type:** `number`
**Default:** `4`

The maximum folder depth to descend below each base folder while searching. Descent always stops at the first `.git` folder regardless of this value, so this only bounds how deep bare (non-repo) folder trees are explored.

---

## `projectLobby.ignoreFolders`

**Type:** `string[]`
**Default:** `["node_modules", ".git", "bin", "obj", "dist", ".vs", ".vscode"]`

Folder **names** to skip while scanning. Matching is case-insensitive. This keeps scanning fast by avoiding large or irrelevant directories.

```jsonc
{
  "projectLobby.ignoreFolders": ["node_modules", "bin", "obj", "packages"]
}
```

---

## `projectLobby.openBehavior`

**Type:** `"newWindow" | "currentWindow"`
**Default:** `"newWindow"`

The action taken when you click a repository in the tree.

> VS Code tree items cannot detect `Ctrl`/`Cmd` modifier clicks, so the alternative action is always available via the right-click context menu (**Open in New Window** / **Open in Current Window**).

---

## `projectLobby.faviconWebRoots`

**Type:** `string[]`
**Default:** `["wwwroot", "public", "static", "assets", "src/assets"]`

Subfolders (relative to a repository's root) that are searched for a favicon to use as the repository's tree icon, in addition to the repository root itself. The first match wins; if none is found a default git icon is used.

Recognized favicon file names: `favicon.ico`, `favicon.png`, `favicon.svg`.

---

## `projectLobby.faviconMaxDepth`

**Type:** `number`
**Default:** `10`

The maximum depth to search inside a repository for a favicon. The search honors `ignoreFolders` and stops at the first match, so a high value is generally safe.
