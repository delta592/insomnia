import { redo,undo } from '@codemirror/commands';

import { EDITOR_DOM_ATTR, findEditorViewFromDom } from './cm6/editor-utils';

/**
 * Single app-level undo/redo dispatcher for CodeMirror 6 editors and plain inputs.
 */
export const dispatchEditorUndo = (mode: 'undo' | 'redo'): void => {
  const active = document.activeElement as HTMLElement | null;
  const wrapper = active?.closest(`[${EDITOR_DOM_ATTR}]`);
  const view = findEditorViewFromDom(active);
  if (view) {
    (mode === 'undo' ? undo : redo)(view);
    return;
  }
  if (wrapper) {
    return;
  }
  document.execCommand(mode);
};
