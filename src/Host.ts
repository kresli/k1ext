import {
  CompilerHost,
  createCompilerHost,
  getDefaultCompilerOptions,
  SourceFile,
  createSourceFile,
} from "typescript";
import * as path from "path";

export class Host implements CompilerHost {
  _host = createCompilerHost(this.options, true);
  constructor(public options = getDefaultCompilerOptions()) {}

  registeredFiles = new Map<string, { raw: string; source: SourceFile }>();

  getDefaultLibFileName(
    ...args: Parameters<CompilerHost["getDefaultLibFileName"]>
  ): string {
    return this._host.getDefaultLibFileName(...args);
  }
  writeFile(...args: Parameters<CompilerHost["writeFile"]>) {
    return this._host.writeFile(...args);
  }
  getCurrentDirectory(
    ...args: Parameters<CompilerHost["getCurrentDirectory"]>
  ): string {
    return this._host.getCurrentDirectory(...args);
  }
  getCanonicalFileName(
    ...args: Parameters<CompilerHost["getCanonicalFileName"]>
  ): string {
    return this._host.getCanonicalFileName(...args);
  }
  useCaseSensitiveFileNames(
    ...args: Parameters<CompilerHost["useCaseSensitiveFileNames"]>
  ): boolean {
    return this._host.useCaseSensitiveFileNames(...args);
  }
  getNewLine(...args: Parameters<CompilerHost["getNewLine"]>): string {
    return this._host.getNewLine(...args);
  }
  getSourceFile(
    ...args: Parameters<CompilerHost["getSourceFile"]>
  ): SourceFile {
    const filePath = path.resolve(args[0] as string);
    const inMemory = this.registeredFiles.get(filePath)?.source;
    return inMemory || this._host.getSourceFile(...args);
  }
  readFile(...args: Parameters<CompilerHost["readFile"]>): string {
    const filePath = path.resolve(args[0] as string);
    const inMemory = this.registeredFiles.get(filePath)?.raw;
    return inMemory || this._host.readFile(...args);
  }
  fileExists(...args: Parameters<CompilerHost["fileExists"]>): boolean {
    const filePath = path.resolve(args[0] as string);
    const inMemory = this.registeredFiles.has(filePath);
    return inMemory || this._host.fileExists(...args);
  }

  addFile(fileName: string, raw: string) {
    const memoryPath = path.resolve(path.join(__dirname, fileName));
    const source = createSourceFile(memoryPath, raw, this.options.target);
    this.registeredFiles.set(memoryPath, { source, raw });
  }
  getRootNames(): string[] {
    return [...this.registeredFiles.keys()];
  }
}
