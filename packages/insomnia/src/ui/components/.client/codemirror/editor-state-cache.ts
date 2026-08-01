import type { EditorView } from '@codemirror/view';

import type { EditorPosition, EditorRange, MarkerRange } from './cm6/types';

export interface CachedEditorState {
  history: unknown;
  scroll?: { left: number; top: number };
  selections?: EditorRange[];
  cursor?: EditorPosition;
  marks?: Partial<MarkerRange>[];
}

const MAX_CACHED_EDITOR_STATES = 2000;
const editorStates = new Map<string, CachedEditorState>();

export const getCachedEditorState = (historyKey: string): CachedEditorState | undefined => {
  const state = editorStates.get(historyKey);
  if (state) {
    editorStates.delete(historyKey);
    editorStates.set(historyKey, state);
  }
  return state;
};

export const setCachedEditorState = (historyKey: string, state: CachedEditorState): void => {
  editorStates.delete(historyKey);
  editorStates.set(historyKey, state);
  while (editorStates.size > MAX_CACHED_EDITOR_STATES) {
    const lruKey = editorStates.keys().next().value;
    if (lruKey === undefined) {
      break;
    }
    editorStates.delete(lruKey);
  }
};

export const purgeCachedEditorStates = (shouldPurge: (historyKey: string) => boolean): number => {
  let purged = 0;
  for (const key of editorStates.keys()) {
    if (shouldPurge(key)) {
      editorStates.delete(key);
      purged++;
    }
  }
  return purged;
};

export type { EditorView };
