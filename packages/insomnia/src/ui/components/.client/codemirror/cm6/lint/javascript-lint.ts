import { type Diagnostic,linter } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { JSHINT, type LintError, type LintOptions } from 'jshint';

import { posToOffset } from '../editor-utils';

function parseErrors(errors: LintError[], view: EditorView, output: Diagnostic[]) {
  for (const error of errors) {
    if (!error || error.line <= 0) {
      continue;
    }

    const start = error.character - 1;
    let end = start + 1;

    if (error.evidence) {
      const index = error.evidence.slice(Math.max(0, start)).search(/.\b/);
      if (index > -1) {
        end += index;
      }
    }

    const line = error.line - 2;
    output.push({
      message: error.reason ?? 'Unknown error',
      severity: error.code?.startsWith('W') ? 'warning' : 'error',
      from: posToOffset(view.state.doc, { line, ch: start }),
      to: posToOffset(view.state.doc, { line, ch: end }),
    });
  }
}

function javascriptValidator(text: string, view: EditorView, options: LintOptions = {}): Diagnostic[] {
  const { globals, ...restOptions } = options as LintOptions & { globals?: Record<string, boolean> };
  const lintOptions = { ...restOptions, indent: restOptions.indent ?? 1 };
  const textWithWrapper = `async function asyncWrapper() {\n${text}\n}`;
  JSHINT(textWithWrapper, lintOptions, globals);
  const errors = JSHINT.data()?.errors;
  const result: Diagnostic[] = [];
  if (errors) {
    parseErrors(errors, view, result);
  }
  return result;
}

export const javascriptLintExtension = (options: LintOptions = {}): Extension =>
  linter(view => javascriptValidator(view.state.doc.toString(), view, options));
