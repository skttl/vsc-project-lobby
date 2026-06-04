import * as vscode from 'vscode';
import { GroupNode } from './model';

const CACHE_KEY = 'projectLobby.cachedTree';
const CACHE_VERSION = 1;
const HIDDEN_KEY = 'projectLobby.hiddenPaths';

interface CachePayload {
    version: number;
    /** Hash of the base-folder config the cache was built for. */
    signature: string;
    tree: GroupNode[];
}

/** Build a signature from the base folders so a stale cache is ignored. */
export function buildSignature(baseFolders: string[]): string {
    return JSON.stringify([...baseFolders].sort());
}

export function loadCachedTree(
    context: vscode.ExtensionContext,
    signature: string
): GroupNode[] | undefined {
    const payload = context.globalState.get<CachePayload>(CACHE_KEY);
    if (!payload || payload.version !== CACHE_VERSION) {
        return undefined;
    }
    if (payload.signature !== signature) {
        return undefined;
    }
    return payload.tree;
}

export async function saveCachedTree(
    context: vscode.ExtensionContext,
    signature: string,
    tree: GroupNode[]
): Promise<void> {
    const payload: CachePayload = {
        version: CACHE_VERSION,
        signature,
        tree,
    };
    await context.globalState.update(CACHE_KEY, payload);
}

/** Returns the set of hidden absolute paths (normalised, lower-case for comparison). */
export function loadHiddenPaths(context: vscode.ExtensionContext): Set<string> {
    const raw = context.globalState.get<string[]>(HIDDEN_KEY, []);
    return new Set(raw.map((p) => p.toLowerCase()));
}

/** Returns the raw (original-case) hidden path list. */
export function loadHiddenPathsRaw(context: vscode.ExtensionContext): string[] {
    return context.globalState.get<string[]>(HIDDEN_KEY, []);
}

export async function saveHiddenPaths(
    context: vscode.ExtensionContext,
    paths: string[]
): Promise<void> {
    await context.globalState.update(HIDDEN_KEY, paths);
}
