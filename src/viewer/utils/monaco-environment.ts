/// <reference types="vite/client" />

/**
 * Registers Monaco's web workers through Vite's bundler, keeping them local.
 * The diff computation runs in the editor worker, so without this registration
 * the diff editor shows both versions but marks no changes.
 */

import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import TypeScriptWorker from "monaco-editor/language/typescript/ts.worker.js?worker";

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    return label === "typescript" || label === "javascript" ? new TypeScriptWorker() : new EditorWorker();
  },
};
