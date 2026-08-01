import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useEffect, useRef } from 'react';

import type { CreateEditorExtensionsOptions } from './create-editor-extensions';
import { createEditorExtensions, reconfigureLanguage, reconfigureLint, reconfigureReadOnly } from './create-editor-extensions';
import { attachViewReference, markEditorDom } from './editor-utils';
import type { EditorModeSpec } from './types';

export interface UseCodeMirrorEditorOptions extends CreateEditorExtensionsOptions {
  defaultValue?: string;
  onCreate?: (view: EditorView) => void;
}

export const useCodeMirrorEditor = (containerRef: React.RefObject<HTMLElement | null>, options: UseCodeMirrorEditorOptions) => {
  const viewRef = useRef<EditorView | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!containerRef.current || viewRef.current) {
      return;
    }

    const view = new EditorView({
      state: EditorState.create({
        doc: options.defaultValue ?? '',
        extensions: createEditorExtensions(options),
      }),
      parent: containerRef.current,
    });

    markEditorDom(view);
    attachViewReference(view);
    viewRef.current = view;
    options.onCreate?.(view);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [containerRef]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    reconfigureLanguage(view, options.mode);
  }, [options.mode]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    reconfigureLint(view, options.mode, options.lint, options.noLint);
  }, [options.lint, options.mode, options.noLint]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    reconfigureReadOnly(view, !!options.readOnly);
  }, [options.readOnly]);

  return viewRef;
};

export const setEditorValue = (view: EditorView | null, value: string) => {
  if (!view || view.state.doc.toString() === value) {
    return;
  }
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: value },
  });
};

export const getEditorValue = (view: EditorView | null) => view?.state.doc.toString() ?? '';

export { reconfigureLanguage };
export type { EditorModeSpec };
