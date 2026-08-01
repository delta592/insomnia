import { type Diagnostic,linter } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import * as jsonlint from 'jsonlint-mod-fixed';

import { render } from '~/ui/templating/renderer-safe';

import { offsetToPos, posToOffset } from '../editor-utils';

async function jsonValidator(text: string, view: EditorView): Promise<Diagnostic[]> {
  const found: Diagnostic[] = [];

  jsonlint.parser.parseError = (str: string, hash: jsonlint.ParseErrorHash) => {
    if (hash.line && !hash.loc) {
      const from = posToOffset(view.state.doc, { line: hash.line - 1, ch: 0 });
      found.push({
        from,
        to: from,
        message: str,
        severity: 'error',
      });
    } else if (hash.loc) {
      const loc = hash.loc;
      found.push({
        from: posToOffset(view.state.doc, { line: loc.first_line - 1, ch: loc.first_column }),
        to: posToOffset(view.state.doc, { line: loc.last_line - 1, ch: loc.last_column }),
        message: str,
        severity: 'error',
      });
    }
  };

  try {
    const renderedText: string | null = await render(text, {});
    if (renderedText) {
      jsonlint.parse(renderedText);
    }
  } catch {}

  return found;
}

export const jsonLintExtension = (): Extension =>
  linter(async view => jsonValidator(view.state.doc.toString(), view));

export { offsetToPos };
