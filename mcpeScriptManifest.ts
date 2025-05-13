/*__  __                 ____            _       _   __  __             _  __           _   
 |  \/  | ___ _ __   ___/ ___|  ___ _ __(_)_ __ | |_|  \/  | __ _ _ __ (_)/ _| ___  ___| |_ 
 | |\/| |/ __| '_ \ / _ \___ \ / __| '__| | '_ \| __| |\/| |/ _` | '_ \| | |_ / _ \/ __| __|
 | |  | | (__| |_) |  __/___) | (__| |  | | |_) | |_| |  | | (_| | | | | |  _|  __/\__ \ |_ 
 |_|  |_|\___| .__/ \___|____/ \___|_|  |_| .__/ \__|_|  |_|\__,_|_| |_|_|_|  \___||___/\__|
             |_|                          |_|                                               
    written by @yeondu1062.
*/

import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
	const versionsFilePath = path.join(__dirname, '..', 'moduleVersions.json');
	const versions = JSON.parse(fs.readFileSync(versionsFilePath, 'utf8'));

	const lang = vscode.env.language === 'ko' ? 'ko' : 'en';
	const langFilePath = path.join(__dirname, '../lang', lang + '.json');
	const translations = JSON.parse(fs.readFileSync(langFilePath, 'utf8'));

	const disposable = vscode.commands.registerCommand('mcpescriptmanifest.scriptManifest', async () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) { vscode.window.showErrorMessage(translations['noWorkspace']); return; }

		const workspaceName = path.basename(workspaceFolders[0].uri.fsPath);
		const name = await vscode.window.showInputBox({
			prompt: translations['enterScriptName'] + ' ', value: workspaceName,
		});

		const description = await vscode.window.showInputBox({
			prompt: translations['enterDescription']  + ' '
		});

		const serverVersion = await vscode.window.showQuickPick(
			versions.server, { placeHolder: translations['selectServerModuleVer'] }
		);

		const uiModule = await vscode.window.showQuickPick(
			[translations['yes'], translations['no']], { placeHolder: translations['useUiModule'] }
		);

		const useUiModule = uiModule === translations['yes'];
		let uiVersion: string | undefined;
		
		if (useUiModule) {
    		uiVersion = await vscode.window.showQuickPick(
				versions.ui, { placeHolder: translations['selectUiModuleVer'] }
			);
  		}

		if (!name || description === undefined || !uiModule || (useUiModule && !uiVersion)) { 
			vscode.window.showInformationMessage(translations['missingInfo']); return; 
		}

		const manifestContent = {
			format_version: 2,
			header: {
				name, description,
				uuid: crypto.randomUUID(),
				version: [1, 0, 0],
				min_engine_version: [1, 21, 80]
			},
			modules: [{
				type: "script",
				language: "javascript",
				uuid: crypto.randomUUID(),
				version: [1, 0, 0],
				entry: "main.js"
			}],
			dependencies: [{ module_name: "@minecraft/server", version: serverVersion }]
		};

		if (useUiModule) manifestContent.dependencies.push({ module_name: "@minecraft/server-ui", version: uiVersion });

		const mainJsContent = 'import { world, system } from "@minecraft/server";\n\nsystem.runInterval(() => world.sendMessage("Hello World"), 30);';

		const manifest = Buffer.from(JSON.stringify(manifestContent, null, 2), 'utf8');
		const manifestUri = vscode.Uri.joinPath(workspaceFolders[0].uri, 'manifest.json');
		const mainJsUri = vscode.Uri.joinPath(workspaceFolders[0].uri, 'scripts', 'main.js');

		await vscode.workspace.fs.writeFile(manifestUri, manifest);
		await vscode.workspace.fs.writeFile(mainJsUri, Buffer.from(mainJsContent, 'utf8'));

		const doc = await vscode.workspace.openTextDocument(mainJsUri);
		await vscode.window.showTextDocument(doc);
		vscode.window.showInformationMessage(translations['success']);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
