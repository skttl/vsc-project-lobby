import * as vscode from 'vscode';
import * as path from 'path';
import { LobbyNode, RepoNode, isRepo } from './model';
import { getConfig, setBaseFolders } from './config';
import { ProjectLobbyTreeProvider } from './treeProvider';

function asRepo(node: LobbyNode | undefined): RepoNode | undefined {
    return node && isRepo(node) ? node : undefined;
}

async function openRepo(repo: RepoNode, forceNewWindow: boolean): Promise<void> {
    const uri = vscode.Uri.file(repo.workspacePath ?? repo.path);
    await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow });
}

export function registerCommands(
    context: vscode.ExtensionContext,
    provider: ProjectLobbyTreeProvider
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('projectLobby.openProject', async (node?: LobbyNode) => {
            const repo = asRepo(node);
            if (!repo) {
                return;
            }
            const forceNewWindow = getConfig().openBehavior === 'newWindow';
            await openRepo(repo, forceNewWindow);
        }),

        vscode.commands.registerCommand('projectLobby.openInNewWindow', async (node?: LobbyNode) => {
            const repo = asRepo(node);
            if (repo) {
                await openRepo(repo, true);
            }
        }),

        vscode.commands.registerCommand(
            'projectLobby.openInCurrentWindow',
            async (node?: LobbyNode) => {
                const repo = asRepo(node);
                if (repo) {
                    await openRepo(repo, false);
                }
            }
        ),

        vscode.commands.registerCommand('projectLobby.refresh', () => provider.refresh()),
        vscode.commands.registerCommand('projectLobby.refreshing', () => { /* no-op: scanning in progress */ }),

        vscode.commands.registerCommand('projectLobby.addBaseFolder', async () => {
            const picked = await vscode.window.showOpenDialog({
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: true,
                openLabel: 'Add as base folder',
                title: 'Select base folder(s) to scan for git repositories',
            });
            if (!picked || picked.length === 0) {
                return;
            }

            const current = getConfig().baseFolders.map((f) => path.normalize(f));
            const additions = picked
                .map((uri) => path.normalize(uri.fsPath))
                .filter((p) => !current.some((c) => c.toLowerCase() === p.toLowerCase()));

            if (additions.length === 0) {
                vscode.window.showInformationMessage('Project Lobby: folder is already a base folder.');
                return;
            }

            await setBaseFolders([...current, ...additions]);
        }),

        vscode.commands.registerCommand(
            'projectLobby.removeBaseFolder',
            async (node?: LobbyNode) => {
                if (!node || node.kind !== 'group' || !node.isBaseFolder) {
                    return;
                }
                const target = path.normalize(node.path).toLowerCase();
                const remaining = getConfig().baseFolders.filter(
                    (f) => path.normalize(f).toLowerCase() !== target
                );
                await setBaseFolders(remaining);
            }
        ),

        vscode.commands.registerCommand('projectLobby.hide', async (node?: LobbyNode) => {
            if (!node) {
                return;
            }
            await provider.hideNode(node);
        }),

        vscode.commands.registerCommand('projectLobby.manageHidden', async () => {
            const hidden = provider.getHiddenPathsRaw();
            if (hidden.length === 0) {
                vscode.window.showInformationMessage('Project Lobby: no hidden items.');
                return;
            }

            const items = hidden.map((p) => ({
                label: path.basename(p),
                description: p,
                detail: 'Click to make visible again',
            }));

            const picked = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select items to unhide',
                canPickMany: true,
                title: 'Hidden items — select to unhide',
            });

            if (!picked || picked.length === 0) {
                return;
            }

            for (const item of picked) {
                await provider.unhideNode(item.description!);
            }
        })
    );
}
