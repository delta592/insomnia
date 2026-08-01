import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

export const insomniaEditorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontFamily: 'monospace',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'inherit',
  },
  '.cm-content': {
    padding: '4px 0',
    caretColor: 'var(--color-font)',
  },
  '.cm-line': {
    padding: '0 4px',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--color-bg)',
    color: 'var(--hl-md)',
    borderRight: '1px solid var(--hl-sm)',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--hl-xs)',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--hl-sm) !important',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--color-font)',
  },
  '.cm-nunjucks-tag': {
    color: 'var(--color-surprise)',
  },
  '.cm-nunjucks-variable': {
    color: 'var(--color-info)',
  },
  '.cm-nunjucks-comment': {
    color: 'var(--hl-md)',
    fontStyle: 'italic',
  },
  '.cm-clickable': {
    color: 'var(--color-info)',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--hl-sm)',
    color: 'var(--color-font)',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
    color: 'var(--color-font)',
  },
  '.cm-diagnostic': {
    padding: '2px 6px',
  },
  '.cm-diagnostic-error': {
    borderLeft: '3px solid var(--color-danger)',
  },
  '.cm-diagnostic-warning': {
    borderLeft: '3px solid var(--color-warning)',
  },
});

export const insomniaHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: 'var(--color-surprise)' },
  { tag: [t.string, t.special(t.string)], color: 'var(--color-success)' },
  { tag: t.comment, color: 'var(--hl-md)', fontStyle: 'italic' },
  { tag: t.number, color: 'var(--color-warning)' },
  { tag: t.variableName, color: 'var(--color-info)' },
  { tag: t.definition(t.variableName), color: 'var(--color-info)' },
  { tag: t.propertyName, color: 'var(--color-font)' },
  { tag: t.operator, color: 'var(--color-font)' },
  { tag: t.meta, color: 'var(--hl-md)' },
  { tag: t.atom, color: 'var(--color-danger)' },
  { tag: t.tagName, color: 'var(--color-surprise)' },
  { tag: t.className, color: 'var(--color-info)' },
]);

export const insomniaSyntaxHighlighting = syntaxHighlighting(insomniaHighlightStyle);

export const singleLineEditorTheme = EditorView.theme({
  '.cm-scroller': {
    overflow: 'hidden',
  },
  '.cm-content, .cm-line': {
    whiteSpace: 'nowrap',
  },
});
