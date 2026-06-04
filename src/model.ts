/**
 * Serializable representation of the scanned project tree.
 * Kept plain (no vscode types) so it can be cached in globalState.
 */

export type LobbyNode = GroupNode | RepoNode;

export interface GroupNode {
    kind: 'group';
    /** Display name (folder name). */
    name: string;
    /** Absolute path of this folder. */
    path: string;
    /** True when this node is a configured base folder. */
    isBaseFolder: boolean;
    /** Child nodes (groups and/or repos). */
    children: LobbyNode[];
}

export interface RepoNode {
    kind: 'repo';
    /** Display name (folder name). */
    name: string;
    /** Absolute path of the repository root. */
    path: string;
    /** Absolute path to a favicon to use as the icon, if found. */
    iconPath?: string;
    /** Absolute path to a .code-workspace file found inside the repo, if any. */
    workspacePath?: string;
}

export function isGroup(node: LobbyNode): node is GroupNode {
    return node.kind === 'group';
}

export function isRepo(node: LobbyNode): node is RepoNode {
    return node.kind === 'repo';
}
