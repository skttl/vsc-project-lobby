import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import { GroupNode, LobbyNode, isGroup, isRepo } from './model';
import { affectsConfig, getConfig } from './config';
import { buildSignature, loadCachedTree, saveCachedTree, loadHiddenPaths, loadHiddenPathsRaw, saveHiddenPaths } from './cache';
import { scanBaseFolders } from './scanner';

export class ProjectLobbyTreeProvider implements vscode.TreeDataProvider<LobbyNode> {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<LobbyNode | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private tree: GroupNode[] = [];
    private scanning = false;
    private initialized = false;
    private hiddenPaths: Set<string> = new Set();

    constructor(private readonly context: vscode.ExtensionContext) {
        this.hiddenPaths = loadHiddenPaths(context);
    }

    /** Load cached results (instant), then kick off a background rescan. */
    initialize(): void {
        const config = getConfig();
        if (config.baseFolders.length === 0) {
            this.markInitialized();
            return;
        }
        const signature = buildSignature(config.baseFolders);
        const cached = loadCachedTree(this.context, signature);
        if (cached) {
            void this.tryUseCached(cached);
        } else {
            void this.refresh();
        }
    }

    private markInitialized(): void {
        if (!this.initialized) {
            this.initialized = true;
            void vscode.commands.executeCommand('setContext', 'projectLobby.initialized', true);
        }
    }

    private async tryUseCached(cached: GroupNode[]): Promise<void> {
        if (await cachedIconPathsExist(cached)) {
            this.tree = cached;
            this.markInitialized();
            this._onDidChangeTreeData.fire(undefined);
        }
        void this.refresh();
    }

    onConfigChanged(e: vscode.ConfigurationChangeEvent): void {
        if (affectsConfig(e)) {
            void this.refresh();
        }
    }

    async refresh(): Promise<void> {
        if (this.scanning) {
            return;
        }
        this.scanning = true;
        void vscode.commands.executeCommand('setContext', 'projectLobby.scanning', true);
        try {
            const config = getConfig();
            const signature = buildSignature(config.baseFolders);
            this.tree = await scanBaseFolders(config, this.context.globalStorageUri.fsPath);
            await saveCachedTree(this.context, signature, this.tree);
            this.markInitialized();
            this._onDidChangeTreeData.fire(undefined);
        } finally {
            this.scanning = false;
            void vscode.commands.executeCommand('setContext', 'projectLobby.scanning', false);
        }
    }

    getTreeItem(element: LobbyNode): vscode.TreeItem {
        if (isRepo(element)) {
            const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.None);
            item.contextValue = 'repo';
            item.tooltip = element.path;
            item.iconPath = element.iconPath
                ? vscode.Uri.file(element.iconPath)
                : new vscode.ThemeIcon('source-control');
            item.command = {
                command: 'projectLobby.openProject',
                title: 'Open Project',
                arguments: [element],
            };
            return item;
        }

        // Group node
        const item = new vscode.TreeItem(
            element.name,
            element.isBaseFolder
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.Collapsed
        );
        item.contextValue = element.isBaseFolder ? 'baseFolder' : 'group';
        item.resourceUri = vscode.Uri.file(element.path);
        item.tooltip = element.path;
        item.iconPath = new vscode.ThemeIcon(element.isBaseFolder ? 'folder-library' : 'folder');
        return item;
    }

    getChildren(element?: LobbyNode): LobbyNode[] {
        const nodes = element ? (isGroup(element) ? element.children : []) : this.tree;
        return nodes.filter((n) => !this.hiddenPaths.has(n.path.toLowerCase()));
    }

    async hideNode(node: LobbyNode): Promise<void> {
        const raw = loadHiddenPathsRaw(this.context);
        const key = node.path.toLowerCase();
        if (!this.hiddenPaths.has(key)) {
            this.hiddenPaths.add(key);
            await saveHiddenPaths(this.context, [...raw, node.path]);
            this._onDidChangeTreeData.fire(undefined);
        }
    }

    async unhideNode(nodePath: string): Promise<void> {
        const key = nodePath.toLowerCase();
        this.hiddenPaths.delete(key);
        const remaining = loadHiddenPathsRaw(this.context).filter(
            (p) => p.toLowerCase() !== key
        );
        await saveHiddenPaths(this.context, remaining);
        this._onDidChangeTreeData.fire(undefined);
    }

    getHiddenPathsRaw(): string[] {
        return loadHiddenPathsRaw(this.context);
    }
}

/**
 * Returns true if every cached iconPath that points to a file on disk still
 * exists. If any are missing (e.g. after an extension reinstall wiped storage)
 * the cache should be discarded so a fresh scan regenerates them.
 */
async function cachedIconPathsExist(tree: GroupNode[]): Promise<boolean> {
    const checks: Promise<boolean>[] = [];

    function walk(nodes: LobbyNode[]): void {
        for (const node of nodes) {
            if (node.kind === 'repo' && node.iconPath) {
                checks.push(
                    fs.access(node.iconPath).then(() => true, () => false)
                );
            } else if (node.kind === 'group') {
                walk(node.children);
            }
        }
    }

    walk(tree);
    const results = await Promise.all(checks);
    return results.every(Boolean);
}
