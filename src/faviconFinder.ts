import * as fs from 'fs/promises';
import * as path from 'path';
import { extractPngFromIco } from './icoConverter';

const FAVICON_NAMES = [
    'favicon.svg',
    'favicon.png',
    'favicon-32x32.png',
    'favicon-16x16.png',
    'apple-touch-icon.png',
    'favicon.ico',
];

/**
 * Search a repository for a favicon to use as its icon.
 *
 * Strategy:
 *  1. Check the repo root and each configured web root directly (fast path).
 *  2. Fall back to a bounded breadth-first walk up to `maxDepth`, skipping
 *     ignored folders. First match wins.
 *
 * Returns the absolute path to a favicon file, or undefined if none found.
 */
export async function findFavicon(
    repoPath: string,
    webRoots: string[],
    ignoreFolders: string[],
    maxDepth: number,
    storageDir: string
): Promise<string | undefined> {
    const ignore = new Set(ignoreFolders.map((f) => f.toLowerCase()));

    // Fast path: repo root + explicit web roots.
    const preferredDirs = [repoPath, ...webRoots.map((r) => path.join(repoPath, r))];
    for (const dir of preferredDirs) {
        const hit = await firstFaviconIn(dir, storageDir);
        if (hit) {
            return hit;
        }
    }

    // Bounded breadth-first fallback walk.
    return walkForFavicon(repoPath, ignore, maxDepth, storageDir);
}

async function firstFaviconIn(dir: string, storageDir?: string): Promise<string | undefined> {
    for (const name of FAVICON_NAMES) {
        const candidate = path.join(dir, name);
        try {
            const stat = await fs.stat(candidate);
            if (stat.isFile()) {
                if (name.endsWith('.ico') && storageDir) {
                    const png = await extractPngFromIco(candidate, storageDir);
                    if (png) {
                        return png;
                    }
                    continue;
                }
                return candidate;
            }
        } catch {
            // not found, continue
        }
    }
    return undefined;
}

async function walkForFavicon(
    root: string,
    ignore: Set<string>,
    maxDepth: number,
    storageDir: string
): Promise<string | undefined> {
    let level: string[] = [root];

    for (let depth = 0; depth <= maxDepth && level.length > 0; depth++) {
        const next: string[] = [];

        for (const dir of level) {
            let entries: import('fs').Dirent[];
            try {
                entries = await fs.readdir(dir, { withFileTypes: true });
            } catch {
                continue;
            }

            const hit = await firstFaviconIn(dir, storageDir);
            if (hit) {
                return hit;
            }

            for (const entry of entries) {
                if (entry.isDirectory() && !ignore.has(entry.name.toLowerCase())) {
                    next.push(path.join(dir, entry.name));
                }
            }
        }

        level = next;
    }

    return undefined;
}
