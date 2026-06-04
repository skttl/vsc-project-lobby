import * as fs from 'fs/promises';
import * as path from 'path';
import { GroupNode, LobbyNode, RepoNode } from './model';
import { ProjectLobbyConfig } from './config';
import { findFavicon } from './faviconFinder';

/**
 * Scan all configured base folders and build the hierarchical project tree.
 * Each base folder becomes a top-level group node.
 */
export async function scanBaseFolders(config: ProjectLobbyConfig, storageDir: string): Promise<GroupNode[]> {
    const ignore = new Set(config.ignoreFolders.map((f) => f.toLowerCase()));
    const result: GroupNode[] = [];

    for (const baseFolder of config.baseFolders) {
        const normalized = path.normalize(baseFolder);
        let exists = false;
        try {
            const stat = await fs.stat(normalized);
            exists = stat.isDirectory();
        } catch {
            exists = false;
        }

        const base: GroupNode = {
            kind: 'group',
            name: path.basename(normalized) || normalized,
            path: normalized,
            isBaseFolder: true,
            children: [],
        };

        if (exists) {
            base.children = await scanDirectory(normalized, ignore, config, 0, storageDir);
        }

        result.push(base);
    }

    return result;
}

/**
 * Recursively scan a directory.
 * - If a folder contains a `.git` entry, it is a repository leaf (not descended).
 * - Otherwise descend (subject to maxDepth and ignore list), keeping every
 *   intermediate folder that contains at least one repository below it.
 */
async function scanDirectory(
    dir: string,
    ignore: Set<string>,
    config: ProjectLobbyConfig,
    depth: number,
    storageDir: string
): Promise<LobbyNode[]> {
    let entries: import('fs').Dirent[];
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
        return [];
    }

    const subdirs = entries
        .filter((e) => e.isDirectory() && !ignore.has(e.name.toLowerCase()))
        .map((e) => e.name)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    const nodes: LobbyNode[] = [];

    for (const name of subdirs) {
        const childPath = path.join(dir, name);

        if (await isGitRepo(childPath)) {
            const repo: RepoNode = {
                kind: 'repo',
                name,
                path: childPath,
            };
            const workspaceFile = await findWorkspaceFile(childPath);
            if (workspaceFile) {
                repo.workspacePath = workspaceFile;
            }
            const icon = await findFavicon(
                childPath,
                config.faviconWebRoots,
                config.ignoreFolders,
                config.faviconMaxDepth,
                storageDir
            );
            if (icon) {
                repo.iconPath = icon;
            }
            nodes.push(repo);
            continue;
        }

        if (depth + 1 >= config.maxDepth) {
            continue;
        }

        const children = await scanDirectory(childPath, ignore, config, depth + 1, storageDir);
        if (children.length > 0) {
            nodes.push({
                kind: 'group',
                name,
                path: childPath,
                isBaseFolder: false,
                children,
            });
        }
    }

    return nodes.sort((a, b) => {
        if (a.kind === b.kind) {
            return 0;
        }
        return a.kind === 'group' ? -1 : 1;
    });
}

/**
 * Return the path to the first `.code-workspace` file found directly inside
 * `dir`, or `undefined` if none exists.
 */
async function findWorkspaceFile(dir: string): Promise<string | undefined> {
    let entries: import('fs').Dirent[];
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
        return undefined;
    }
    const ws = entries.find((e) => e.isFile() && e.name.endsWith('.code-workspace'));
    return ws ? path.join(dir, ws.name) : undefined;
}

async function isGitRepo(dir: string): Promise<boolean> {
    try {
        const gitPath = path.join(dir, '.git');
        const stat = await fs.stat(gitPath);
        // `.git` is a directory in normal repos, a file in worktrees/submodules.
        return stat.isDirectory() || stat.isFile();
    } catch {
        return false;
    }
}
