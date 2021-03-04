import * as vscode from "vscode";
import * as path from "path";
import { Diagnostic, DiagnosticCollection, DiagnosticSeverity } from "vscode";
import { createProgram, getPreEmitDiagnostics } from "typescript";
import { Host } from "./Host";
import { types } from "util";
import { readFileSync } from "fs";

export function activate(context: vscode.ExtensionContext) {
  const collection = vscode.languages.createDiagnosticCollection("test");
  if (vscode.window.activeTextEditor) {
    updateDiagnostics(vscode.window.activeTextEditor.document, collection);
  }
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((editor) => {
      if (editor) {
        updateDiagnostics(editor.textEditor.document, collection);
      }
    })
  );
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        updateDiagnostics(editor.document, collection);
      }
    })
  );
}

function trans(binding: string) {
  const host = new Host();
  const definitionsRaw = readFileSync(
    path.resolve(__dirname, "../src/test/test-directory/types.ts"),
    "utf8"
  ).replace(/(export) (interface) (\$.*) {/g, "declare var $3: {");
  host.addFile("glob.d.ts", definitionsRaw);
  host.addFile("__dummy_bundle.ts", binding);
  const program = createProgram({
    options: host.options,
    rootNames: host.getRootNames(),
    host,
  });
  return getPreEmitDiagnostics(program);
}
export function onChange() {
  console.log("hey");
}

function validateDocument(
  doc: vscode.TextDocument,
  collection: DiagnosticCollection
) {
  const text = doc.getText();
  const pattern = /{{(.*)}}/gm;
  let m: RegExpExecArray | null = null;
  let diagnostics: Diagnostic[] = [];
  while ((m = pattern.exec(text))) {
    const err = trans(m[1])[0];
    console.log(err);
    if (!err || !err.start) continue;
    let diagnostic: Diagnostic = {
      code: "",
      message: err.messageText as string,
      severity: DiagnosticSeverity.Error,
      range: {
        start: doc.positionAt(m.index + 2 + err.start),
        end: doc.positionAt(m.index + 2 + err.start + err.length),
      },
    };
    diagnostics.push(diagnostic);
  }

  collection.set(doc.uri, diagnostics);
}

function updateDiagnostics(
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection
): void {
  if (document && path.extname(document.uri.fsPath) === ".json") {
    console.log("on update");
    validateDocument(document, collection);
  } else {
    collection.clear();
  }
}
