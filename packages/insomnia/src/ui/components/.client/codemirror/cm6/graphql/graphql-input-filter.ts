import { ChangeSet, type Extension } from '@codemirror/state';
import { EditorState } from '@codemirror/state';

import { normalizeIrregularWhitespace } from '../../normalize-irregular-whitespace';

export const graphqlInputFilterExtension = (): Extension =>
  EditorState.transactionFilter.of(tr => {
    if (!tr.docChanged) {
      return tr;
    }

    const mapped: { from: number; to: number; insert: string }[] = [];
    let modified = false;

    tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
      const text = inserted.toString();
      const normalized = normalizeIrregularWhitespace(text);
      if (normalized !== text) {
        modified = true;
        mapped.push({ from: fromA, to: toA, insert: normalized });
      }
    });

    if (!modified) {
      return tr;
    }

    return [tr, { changes: ChangeSet.of(mapped, tr.startState.doc.length), sequential: true }];
  });
