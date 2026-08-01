import type { EditorState } from '@codemirror/state';
import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

import type { EditorPosition, EditorRange } from './types';

export const posToOffset = (doc: EditorState['doc'], pos: EditorPosition): number => {
  const line = doc.line(Math.min(Math.max(pos.line, 0), doc.lines - 1) + 1);
  return line.from + Math.min(Math.max(pos.ch, 0), line.length);
};

export const offsetToPos = (doc: EditorState['doc'], offset: number): EditorPosition => {
  const line = doc.lineAt(Math.min(Math.max(offset, 0), doc.length));
  return { line: line.number - 1, ch: offset - line.from };
};

export const indexFromPos = (view: EditorView, pos?: EditorPosition): number => {
  if (!pos) {
    return 0;
  }
  return posToOffset(view.state.doc, pos);
};

export const getCursor = (view: EditorView): EditorPosition => {
  const head = view.state.selection.main.head;
  return offsetToPos(view.state.doc, head);
};

export const setCursor = (view: EditorView, line: number, ch?: number, scroll = true) => {
  const docLine = view.state.doc.line(Math.min(line + 1, view.state.doc.lines));
  const offset = docLine.from + (ch ?? 0);
  view.dispatch({
    selection: EditorSelection.cursor(offset),
    scrollIntoView: scroll,
  });
};

export const setSelections = (view: EditorView, ranges: EditorRange[], scroll = true) => {
  view.dispatch({
    selection: EditorSelection.create(
      ranges.map(range =>
        EditorSelection.range(posToOffset(view.state.doc, range.anchor), posToOffset(view.state.doc, range.head)),
      ),
    ),
    scrollIntoView: scroll,
  });
};

export const replaceRange = (view: EditorView, text: string, from: EditorPosition, to: EditorPosition, origin?: string) => {
  view.dispatch({
    changes: {
      from: posToOffset(view.state.doc, from),
      to: posToOffset(view.state.doc, to),
      insert: text,
    },
    ...(origin ? { annotations: [] } : {}),
  });
};

export const getLine = (view: EditorView, lineNumber: number): string => {
  return view.state.doc.line(Math.min(lineNumber + 1, view.state.doc.lines)).text;
};

export const getRange = (view: EditorView, from: EditorPosition, to: EditorPosition): string => {
  return view.state.doc.sliceString(posToOffset(view.state.doc, from), posToOffset(view.state.doc, to));
};

export const EDITOR_DOM_ATTR = 'data-cm-editor';

export const markEditorDom = (view: EditorView) => {
  view.dom.setAttribute(EDITOR_DOM_ATTR, 'true');
};

export const attachViewReference = (view: EditorView) => {
  markEditorDom(view);
  (view.dom as HTMLElement & { cmView?: EditorView }).cmView = view;
};

export const findEditorViewFromDom = (element: HTMLElement | null): EditorView | null => {
  const wrapper = element?.closest(`[${EDITOR_DOM_ATTR}]`) as HTMLElement & { cmView?: EditorView };
  return wrapper?.cmView ?? null;
};

declare module '@codemirror/view' {
  interface EditorView {
    cmView?: EditorView;
  }
}

export const setEditorValue = (view: EditorView | null, value: string) => {
  if (!view || view.state.doc.toString() === value) {
    return;
  }
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: value },
  });
};

export const getEditorValue = (view: EditorView | null) => view?.state.doc.toString() ?? '';
