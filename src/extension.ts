import * as vscode from 'vscode';
import { ProjectLobbyTreeProvider } from './treeProvider';
import { registerCommands } from './commands';

export function activate(context: vscode.ExtensionContext): void {
    const provider = new ProjectLobbyTreeProvider(context);

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('projectLobbyView', provider)
    );

    registerCommands(context, provider);

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => provider.onConfigChanged(e))
    );

    provider.initialize();
}

export function deactivate(): void {
    // nothing to clean up — subscriptions handle disposal
}
