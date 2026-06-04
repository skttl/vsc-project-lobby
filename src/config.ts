import * as vscode from 'vscode';

export const CONFIG_SECTION = 'projectLobby';

export type OpenBehavior = 'newWindow' | 'currentWindow';

export interface ProjectLobbyConfig {
    baseFolders: string[];
    maxDepth: number;
    ignoreFolders: string[];
    openBehavior: OpenBehavior;
    faviconWebRoots: string[];
    faviconMaxDepth: number;
}

const DEFAULT_IGNORE_FOLDERS = ['node_modules', '.git', 'bin', 'obj', 'dist', '.vs', '.vscode'];
const DEFAULT_FAVICON_WEB_ROOTS = ['wwwroot', 'public', 'static', 'assets', 'src/assets'];

export function getConfig(): ProjectLobbyConfig {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);

    return {
        baseFolders: config.get<string[]>('baseFolders', []),
        maxDepth: config.get<number>('maxDepth', 4),
        ignoreFolders: config.get<string[]>('ignoreFolders', DEFAULT_IGNORE_FOLDERS),
        openBehavior: config.get<OpenBehavior>('openBehavior', 'newWindow'),
        faviconWebRoots: config.get<string[]>('faviconWebRoots', DEFAULT_FAVICON_WEB_ROOTS),
        faviconMaxDepth: config.get<number>('faviconMaxDepth', 10),
    };
}

export async function setBaseFolders(folders: string[]): Promise<void> {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    await config.update('baseFolders', folders, vscode.ConfigurationTarget.Global);
}

export function affectsConfig(e: vscode.ConfigurationChangeEvent): boolean {
    return e.affectsConfiguration(CONFIG_SECTION);
}
