import * as vscode from "vscode";
import * as path from "path";
import { Diagnostic, DiagnosticCollection, DiagnosticSeverity } from "vscode";
import {
  CompilerHost,
  CompilerOptions,
  createCompilerHost,
  createProgram,
  createSourceFile,
  getDefaultCompilerOptions,
  getPreEmitDiagnostics,
  ScriptTarget,
  CancellationToken,
} from "typescript";
import { readFileSync } from "fs";

export function activate(context: vscode.ExtensionContext) {
  const collection = vscode.languages.createDiagnosticCollection("test");
  if (vscode.window.activeTextEditor) {
    updateDiagnostics(vscode.window.activeTextEditor.document, collection);
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        updateDiagnostics(editor.document, collection);
      }
    })
  );
}

function getProgram(
  fileName: string,
  text: string,
  options?: CompilerOptions,
  cancellationToken?: CancellationToken
) {
  options = options || getDefaultCompilerOptions();
  const inMemoryFilePath = path.resolve(path.join(__dirname, fileName));
  const textAst = createSourceFile(
    inMemoryFilePath,
    text,
    options.target || ScriptTarget.Latest
  );
  const host = createCompilerHost(options, true);

  overrideIfInMemoryFile("getSourceFile", textAst);
  overrideIfInMemoryFile("readFile", text);
  overrideIfInMemoryFile("fileExists", true);

  const program = createProgram({
    options,
    rootNames: [inMemoryFilePath],
    host,
  });

  return {
    getPreEmitDiagnostics: () =>
      getPreEmitDiagnostics(program, textAst, cancellationToken),
    classifiableNames: () => {
      program.getDeclarationDiagnostics();
      return [...(textAst?.classifiableNames?.values() || [])] as string[];
    },
  };

  function overrideIfInMemoryFile(
    methodName: keyof CompilerHost,
    inMemoryValue: any
  ) {
    const originalMethod = host[methodName] as Function;
    host[methodName] = (...args: unknown[]) => {
      // resolve the path because typescript will normalize it
      // to forward slashes on windows
      const filePath = path.resolve(args[0] as string);
      if (filePath === inMemoryFilePath) return inMemoryValue;
      return originalMethod.apply(host, args);
    };
  }
}

function getTypes(): string {
  const types = readFileSync(
    path.resolve(__dirname, "../src/test/test-directory/types.ts"),
    "utf8"
  );
  const program = getProgram("__dummy_types.ts", types);
  const declarations = program.classifiableNames();
  console.log(declarations);
  const vals = declarations
    .map((name) => `const ${name}: ${name} = null as unknown as ${name};`)
    .join("");
  return `
    ${types}
    ${vals}
  `;
}

function trans() {
  const types = getTypes();
  console.log(
    getProgram(
      "__dummy_bundle.ts",
      `
      ${types}
      $resources.data.titsle
      `
    ).getPreEmitDiagnostics()
  );
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
    let diagnostic: Diagnostic = {
      code: "",
      message: "hola",
      severity: DiagnosticSeverity.Error,
      range: {
        start: doc.positionAt(m.index),
        end: doc.positionAt(m.index + m[0].length),
      },
    };
    diagnostics.push(diagnostic);
  }

  collection.set(doc.uri, diagnostics);

  // let diagnostics: Diagnostic[] = [];
  //   const data = document.getText();
  //   // checkBinding(data);

  //   collection.set(document.uri, [
  //     {
  //       code: "",
  //       message: "hola",
  //       severity: DiagnosticSeverity.Error,
  //       range: {
  //         start: document.positionAt(data.indexOf("age")),
  //         end: document.positionAt(data.indexOf("age") + 3),
  //       },
  //     },
  //   ]);
}

function updateDiagnostics(
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection
): void {
  if (document && path.extname(document.uri.fsPath) === ".json") {
    validateDocument(document, collection);
    trans();

    // collection.set(document.uri, [
    //   {
    //     code: "",
    //     message: "cannot assign twice to immutable variable `x`",
    //     range: new vscode.Range(
    //       new vscode.Position(2, 29),
    //       new vscode.Position(2, 32)
    //     ),
    //     severity: vscode.DiagnosticSeverity.Error,
    //     source: "",
    //     relatedInformation: [
    //       new vscode.DiagnosticRelatedInformation(
    //         new vscode.Location(
    //           document.uri,
    //           new vscode.Range(
    //             new vscode.Position(1, 8),
    //             new vscode.Position(1, 9)
    //           )
    //         ),
    //         "first assignment to `x`"
    //       ),
    //     ],
    //   },
    // ]);
  } else {
    collection.clear();
  }
}
