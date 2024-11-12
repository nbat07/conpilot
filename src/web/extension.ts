import axios from 'axios';
import * as vscode from 'vscode';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "conpilot" is now active!');

    // Register the conpilot command
    let disposable = vscode.commands.registerCommand('conpilot', async () => {
        // Get the active text editor
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const position = editor.selection.active;

            /*// Insert "hello conpilot" at the cursor position
            await editor.edit(editBuilder => {
                editBuilder.insert(position, 'hello conpilot');
            });
            
            // Get the inserted text
            const text = editor.document.getText(new vscode.Range(position, editor.selection.active));
            console.log('Text to send:', text);
            */
            /*// Get the selected text or the word at the cursor position
            let text: string;
            if (!editor.selection.isEmpty) {
                text = editor.document.getText(editor.selection);
            } else {
                const wordRange = editor.document.getWordRangeAtPosition(position);
                text = editor.document.getText(wordRange);
            }
            console.log('Text to send:', text);
            */
            // Get the surrounding code context (you can customize how much context you want)
            const startLine = Math.max(position.line - 5, 0);  // Get up to 5 lines above the cursor
            const endLine = Math.min(position.line + 5, editor.document.lineCount - 1);  // Get up to 5 lines below the cursor
            const codeContext = editor.document.getText(new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length));

            console.log('Code context to send:', codeContext);

            // Send the text to the Flask backend
            try {
                const response = await axios.post('http://localhost:5000/receive_text', { text: codeContext }, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                console.log('Response from backend:', response.data);

                // Insert the generated poem at the cursor position
                const codeCompletion = response.data.code;
                await editor.edit(editBuilder => {
                    editBuilder.insert(editor.selection.active, `\n\n${codeCompletion}`);
                });

            } catch (error) {
                console.error('Error sending text to backend:', error);
            }
        }
    });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
    console.log('Extension "conpilot" is now deactivated.');
}



/*// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import axios from 'axios';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "conpilot" is now active in the web extension host!');

    const completionProvider = vscode.languages.registerCompletionItemProvider(
        { language: 'java', scheme: 'file' },  // Replace with the desired language
        {
            async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                console.log('Completion provider triggered');  // Log when the provider is triggered

                // Get the surrounding code context (you can customize how much context you want)
                const startLine = Math.max(position.line - 5, 0);  // Get up to 5 lines above the cursor
                const endLine = Math.min(position.line + 5, document.lineCount - 1);  // Get up to 5 lines below the cursor
                const codeContext = document.getText(new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length));

                console.log('Code context:', codeContext);  // Log the code context being sent

                try {
                    // Send the code context to the backend service for OpenAI completion
                    const response = await axios.post('http://localhost:3000/complete', { codeContext });
                    
                    console.log('Response from backend:', response.data);

                    // Check if we have suggestions from the backend
                    if (response.data && response.data.completions) {
                        console.log('Received completions from backend');
                        return response.data.completions.map((suggestion: string) => {
                            const completionItem = new vscode.CompletionItem(suggestion, vscode.CompletionItemKind.Text);
                            completionItem.insertText = suggestion;
                            return completionItem;
                        });
                    }
                    else {
                        console.log('No completions received from backend');
                    }

                } catch (error) {
                    console.error('Error fetching code completions:', error);
                    vscode.window.showErrorMessage('Error fetching code completions. Please check the backend service.'); //from copilot
                }

                return [];  // Return an empty array if no completions are available
            }
        },
        '.', ' ', '\n', '(', ')', '{', '}', '[', ']', '<', '>', '=', '+', '-', '*', '/', ';', ':', ',', '.'   // Trigger character for completion
    );

    context.subscriptions.push(completionProvider);
}

// This method is called when your extension is deactivated
export function deactivate() {
    console.log('Extension "conpilot" is now deactivated.');
}
*/

/*
import * as vscode from 'vscode';
import { OpenAIWrapper } from '../openai-wrapper';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "conpilot" is now active in the web extension host!');

    // Initialize OpenAI API client
    const openai = new OpenAIWrapper(process.env.OPENAI_API_KEY || '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');

    const completionProvider = vscode.languages.registerCompletionItemProvider(
        { language: 'java', scheme: 'file' },  // Replace with the desired language
        {
            async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                console.log('Completion provider triggered');  // Log when the provider is triggered

                // Get the surrounding code context (you can customize how much context you want)
                const startLine = Math.max(position.line - 5, 0);  // Get up to 5 lines above the cursor
                const endLine = Math.min(position.line + 5, document.lineCount - 1);  // Get up to 5 lines below the cursor
                const codeContext = document.getText(new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length));

                console.log('Code context:', codeContext);  // Log the code context being sent

                try {
                    // Send the code context to the OpenAI API for completion
                    const response = await openai.createCompletion(codeContext);

                    console.log('Response from OpenAI:', response);

                    // Check if we have suggestions from OpenAI
                    if (response.choices && response.choices.length > 0) {
                        console.log('Received completions from OpenAI');
                        return response.choices.map((choice: any) => {
                            const suggestion = choice.text.trim();
                            const completionItem = new vscode.CompletionItem(suggestion, vscode.CompletionItemKind.Text);
                            completionItem.insertText = suggestion;
                            return completionItem;
                        });
                    } else {
                        console.log('No completions received from OpenAI');
                    }

                } catch (error) {
                    console.error('Error fetching code completions:', error);
                    vscode.window.showErrorMessage('Error fetching code completions. Please check the OpenAI API.');
                }

                return [];  // Return an empty array if no completions are available
            }
        },
        '.', ' ', '\n', '(', ')', '{', '}', '[', ']', '<', '>', '=', '+', '-', '*', '/', ';', ':', ',', '.'   // Trigger characters for completion
    );

    console.log('Completion provider registered');  // Log when the provider is registered

    context.subscriptions.push(completionProvider);
}

// This method is called when your extension is deactivated
export function deactivate() {
    console.log('Extension "conpilot" is now deactivated.');
}
*/