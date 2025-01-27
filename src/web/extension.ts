import axios from 'axios';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'browserify-fs';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "conpilot" is now active!');

    // Register the conpilot command
    let disposable = vscode.commands.registerCommand('conpilot', async () => {
        // Get the active text editor
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const position = editor.selection.active;

            // Correct the path to the testingCode.json file
            const testPath = vscode.Uri.file(path.join(context.extensionPath, 'src', 'testingCode.json'));
            console.log('Reading test code snippets from:', testPath.fsPath);

            try {
                const data = await vscode.workspace.fs.readFile(testPath);
                const jsonString = new TextDecoder('utf-8').decode(data);
                const testCodeSnippets = JSON.parse(jsonString.trim());
                console.log('Test code snippets:', testCodeSnippets);
            

                for (const testCode of testCodeSnippets) {
                    console.log('Inserting incomplete code snippet:', testCode.incomplete);

                    // Insert the incomplete code snippet at the cursor position
                    await editor.edit(editBuilder => {
                        editBuilder.insert(position, testCode.incomplete);
                    });

                    // Get the surrounding code context (you can customize how much context you want)
                    const startLine = Math.max(position.line - 50, 0);  // Get up to 5 lines above the cursor
                    const endLine = Math.min(position.line + 50, editor.document.lineCount - 1);  // Get up to 5 lines below the cursor
                    const codeContext = editor.document.getText(new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length));

                    console.log('Code context to send:', codeContext);

                    // Send the text to the Flask backend
                    try {
                        const response = await axios.post('http://localhost:5000/receive_text', { text: codeContext , testFile: testCode.testFile }, {
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });
                        console.log('Response from backend:', response.data);

                        // Extract the generated code completion and remove unnecessary parts
                        let codeCompletion = response.data.code;
                        codeCompletion = codeCompletion.replace(/```[a-z]*\n/g, '').replace(/```/g, '').trim();
                        console.log('Formatted code completion:', codeCompletion);

                        const combinedCodeCompletion = codeContext + codeCompletion;

                        // Send the complete code to the backend for testing
                        const accuracy = response.data.accuracy;
                        console.log(`Accuracy for snippet: ${accuracy}%`);

                        /*// Insert the generated code completion at the cursor position
                        await editor.edit(editBuilder => {
                            editBuilder.insert(position, `\n${codeCompletion}`);
                        });
                        console.log('Code completion inserted at the cursor position');*/

                        // Clear the inserted incomplete code snippet
                        await editor.edit(editBuilder => {
                            const endPosition = editor.selection.active;
                            const range = new vscode.Range(position, endPosition);
                            editBuilder.delete(range);
                        });

                    } catch (error) {
                        console.error('Error sending text to backend:', error);
                    }
                }
          } catch (error) {
                console.error('Error reading test code snippets:', error);
          }       
        }
    });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
    console.log('Extension "conpilot" is now deactivated.');
}

// Function to calculate the accuracy of the generated code completion
function calculateAccuracy(output: string, errors: string): number {
    // Implement your logic to calculate accuracy based on test results
    if (errors) {
        return 0;
    }
    // Example: If all tests pass, return 100% accuracy
    return output.includes('OK') ? 100 : 0;
}