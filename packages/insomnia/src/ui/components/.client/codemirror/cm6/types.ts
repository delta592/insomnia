import type { EditorView } from '@codemirror/view';

export interface EditorPosition {
  line: number;
  ch: number;
}

export interface EditorRange {
  anchor: EditorPosition;
  head: EditorPosition;
}

export interface EditorChange {
  from: EditorPosition;
  to: EditorPosition;
  text: string[];
  origin?: string;
}

export interface MarkerRange {
  from?: EditorPosition;
  to?: EditorPosition;
}

export interface CachedEditorState {
  history: unknown;
  scroll?: { left: number; top: number };
  selections?: EditorRange[];
  cursor?: EditorPosition;
  marks?: Partial<MarkerRange>[];
}

export interface EditorViewHandle {
  view: EditorView | null;
}

export type CodeMirrorLinkClickCallback = (url: string) => void;

export interface AutocompleteNamedItem {
  name: string;
  value?: unknown;
  displayName?: string;
  displayValue?: string;
}

export interface EnvironmentAutocompleteConfig {
  getVariables?: () => AutocompleteNamedItem[] | PromiseLike<AutocompleteNamedItem[]>;
  getTags?: () => AutocompleteNamedItem[] | PromiseLike<AutocompleteNamedItem[]>;
  getConstants?: () => string[] | PromiseLike<string[]>;
  getSnippets?: () => AutocompleteNamedItem[] | PromiseLike<AutocompleteNamedItem[]>;
  hotKeyRegistry?: Record<string, unknown>;
  autocompleteDelay?: number;
}

export interface NunjucksModeSpec {
  name: 'nunjucks';
  baseMode: string;
}

export type EditorModeSpec = string | NunjucksModeSpec;

export function isNunjucksModeSpec(mode: EditorModeSpec | undefined): mode is NunjucksModeSpec {
  return typeof mode === 'object' && mode !== null && mode.name === 'nunjucks';
}
