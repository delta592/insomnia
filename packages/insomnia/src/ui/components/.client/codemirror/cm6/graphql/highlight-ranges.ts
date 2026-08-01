import type { Extension } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';

import { posToOffset } from '../editor-utils';
import type { EditorHighlightRange } from './types';

export const setHighlightRangesEffect = StateEffect.define<EditorHighlightRange[]>();

const buildHighlightDecorations = (ranges: EditorHighlightRange[], doc: EditorState['doc']): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  for (const range of ranges) {
    const from = posToOffset(doc, range.from);
    const to = posToOffset(doc, range.to);
    if (from < to) {
      builder.add(from, to, Decoration.mark({ class: range.className ?? 'opacity-70' }));
    }
  }
  return builder.finish();
};

export const highlightRangesField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setHighlightRangesEffect)) {
        return buildHighlightDecorations(effect.value, tr.state.doc);
      }
    }
    return decorations.map(tr.changes);
  },
  provide: field => EditorView.decorations.from(field),
});

export const highlightRangesExtension = (): Extension[] => [highlightRangesField];

export const setHighlightRanges = (view: EditorView, ranges: EditorHighlightRange[]) => {
  view.dispatch({ effects: setHighlightRangesEffect.of(ranges) });
};
