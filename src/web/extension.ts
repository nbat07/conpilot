import axios from 'axios';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'browserify-fs';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "conpilot" is now active!');

    const toggleButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    toggleButton.text = '$(sync) Use Test Code';
    toggleButton.command = 'extension.toggleMode';
    toggleButton.show();

    const toggleCorrectnessButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
    toggleCorrectnessButton.text = '$(check) Correct';
    toggleCorrectnessButton.command = 'extension.toggleCorrectnessMode';
    toggleCorrectnessButton.show();

    const toggleInjectionButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 98);
    toggleInjectionButton.text = '$(code) LLM Injection';
    toggleInjectionButton.command = 'extension.toggleInjectionMode';
    toggleInjectionButton.show();

    let useTestCode = false;
    let useCorrectCode = false;
    let useLLMInjection = true;

    vscode.commands.registerCommand('extension.toggleMode', () => {
        useTestCode = !useTestCode;
        toggleButton.text = useTestCode ? '$(sync) Use Test Code' : '$(sync) Use User Input';
    });

    vscode.commands.registerCommand('extension.toggleCorrectnessMode', () => {
        useCorrectCode = !useCorrectCode;
        toggleCorrectnessButton.text = useCorrectCode ? '$(check) Correct' : '$(x) Incorrect';
    });

    vscode.commands.registerCommand('extension.toggleInjectionMode', () => {
        useLLMInjection = !useLLMInjection;
        toggleInjectionButton.text = useLLMInjection ? '$(code) LLM Injection' : '$(code) Direct Injection';
    });

    let currentTestIndex = 0;

    async function insertTestCode(editor: vscode.TextEditor, testCodeSnippets: any[]) {
        if (currentTestIndex >= testCodeSnippets.length) {
            vscode.window.showInformationMessage('All test cases have been processed.');
            return;
        }

        const testCode = testCodeSnippets[currentTestIndex];
        console.log('Inserting incomplete code snippet:', testCode.incomplete);

        // Clear the previous input
        await editor.edit(editBuilder => {
            const document = editor.document;
            const lastLine = document.lineAt(document.lineCount - 1);
            const textRange = new vscode.Range(new vscode.Position(0, 0), lastLine.range.end);
            editBuilder.delete(textRange);
        });

        // Insert the incomplete code snippet at the cursor position
        await editor.edit(editBuilder => {
            editBuilder.insert(new vscode.Position(0, 0), testCode.incomplete);
        });

        // Get the surrounding code context (you can customize how much context you want)
        const position = editor.selection.active;
        const startLine = Math.max(position.line - 50, 0);  // Get up to 50 lines above the cursor
        const endLine = Math.min(position.line + 50, editor.document.lineCount - 1);  // Get up to 50 lines below the cursor
        const codeContext = editor.document.getText(new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length));

        console.log('Code context to send:', codeContext);

        // Send the text to the Flask backend
        await sendCodeToBackend(codeContext, testCode.testFile, editor, testCodeSnippets);
    }

    async function sendCodeToBackend(codeContext: string, testFile: string, editor: vscode.TextEditor, testCodeSnippets: any[]) {
        try {
            const response = await axios.post('http://localhost:5000/receive_text', {
                text: codeContext,
                testFile: testFile,
                performAccuracyTesting: true,
                useCorrectCode: useCorrectCode,
                useLLMInjection: useLLMInjection
            }, {
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

            // Clear the inserted incomplete code snippet
            await editor.edit(editBuilder => {
                const position = editor.selection.active;
                const endPosition = editor.selection.active;
                const range = new vscode.Range(position, endPosition);
                editBuilder.delete(range);
            });

            // Move to the next test case
            currentTestIndex++;
            insertTestCode(editor, testCodeSnippets);

        } catch (error) {
            console.error('Error sending text to backend:', error);
        }
    }

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

                if (useTestCode) {
                    currentTestIndex = 0;
                    insertTestCode(editor, testCodeSnippets);
                } else {
                    console.log('Using user input at cursor position');
                    // Get the surrounding code context (you can customize how much context you want)
                    const startLine = Math.max(position.line - 50, 0);  // Get up to 50 lines above the cursor
                    const endLine = Math.min(position.line + 50, editor.document.lineCount - 1);  // Get up to 50 lines below the cursor
                    const codeContext = editor.document.getText(new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length));

                    console.log('Code context to send:', codeContext);

                    // Send the text to the Flask backend
                    try {
                        const response = await axios.post('http://localhost:5000/receive_text', {
                            text: codeContext,
                            testFile: '',
                            performAccuracyTesting: false,
                            useCorrectCode: useCorrectCode,
                            useLLMInjection: useLLMInjection
                        }, {
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

                        // Insert the generated code completion at the cursor position
                        await editor.edit(editBuilder => {
                            editBuilder.insert(position, `\n${codeCompletion}`);
                        });
                        console.log('Code completion inserted at the cursor position');

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