import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import classnames from 'classnames';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import * as reactUse from 'react-use';

import { isCurlCommand } from '~/common/utils/curl';
import { useRootLoaderData } from '~/root';
import { Tooltip } from '~/ui/components/tooltip';
import { useNunjucks } from '~/ui/context/nunjucks/use-nunjucks';
import { useEditorRefresh } from '~/ui/hooks/use-editor-refresh';
import { useResizeObserver } from '~/ui/hooks/use-resize-observer';
import { getTagDefinitions } from '~/ui/templating/renderer-safe';

import { createEditorExtensions, reconfigureReadOnly } from './cm6/create-editor-extensions';
import { attachViewReference, getEditorValue, setCursor, setEditorValue } from './cm6/editor-utils';
import { nunjucksTagsExtension } from './cm6/extensions/nunjucks-tags';
import { setCachedEditorState } from './editor-state-cache';

export interface OneLineEditorProps {
  defaultValue: string;
  getAutocompleteConstants?: () => string[] | PromiseLike<string[]>;
  id: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent, value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  type?: string;
  onPaste?: (text: string) => void;
  onBlur?: (e: FocusEvent) => void;
  eventListeners?: { eventName: string; handler: (...args: unknown[]) => void }[];
  historyKey?: string;
  autoFocus?: boolean;
  onAutoFocus?: () => void;
}

export interface OneLineEditorHandle {
  selectAll: () => void;
  focusEnd: () => void;
  setValue: (value: string) => void;
}

export const OneLineEditor = forwardRef<OneLineEditorHandle, OneLineEditorProps>(function OneLineEditor(
  {
    defaultValue,
    getAutocompleteConstants,
    id,
    onChange,
    onKeyDown,
    placeholder,
    readOnly,
    type,
    onPaste,
    onBlur,
    historyKey,
    autoFocus,
    onAutoFocus,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [editorVersion, setEditorVersion] = useState(0);
  const [tooltipValue, setTooltipValue] = useState(type?.toLowerCase() === 'password' ? '' : defaultValue || '');
  const { settings } = useRootLoaderData()!;
  const { handleRender, handleGetRenderContext } = useNunjucks();
  const enableNunjucksTags = Boolean(handleGetRenderContext);

  const updateTooltipValue = useCallback(
    async (rawValue: string) => {
      if (type?.toLowerCase() === 'password') return;
      if (!handleRender || !/{{|{%/.test(rawValue)) {
        setTooltipValue(rawValue);
        return;
      }
      try {
        setTooltipValue(await handleRender(rawValue));
      } catch {
        setTooltipValue(rawValue);
      }
    },
    [handleRender, type],
  );

  const persistState = useCallback(() => {
    if (historyKey && viewRef.current) {
      setCachedEditorState(historyKey, { history: null });
    }
  }, [historyKey]);

  const initEditor = useCallback(() => {
    if (!containerRef.current || viewRef.current || !containerRef.current.offsetWidth) {
      return;
    }

    const canAutocomplete = !!(handleGetRenderContext || getAutocompleteConstants);
    const extensions = createEditorExtensions({
      mode: enableNunjucksTags ? { name: 'nunjucks', baseMode: 'text/plain' } : 'text/plain',
      readOnly,
      placeholder,
      lineNumbers: false,
      lineWrapping: false,
      noLint: true,
      singleLine: true,
      environmentAutocomplete: canAutocomplete
        ? {
            getVariables: async () => (!handleGetRenderContext ? [] : (await handleGetRenderContext())?.keys || []),
            getTags: async () => (!handleGetRenderContext ? [] : await getTagDefinitions()),
            getConstants: getAutocompleteConstants,
            hotKeyRegistry: settings.hotKeyRegistry,
            autocompleteDelay: settings.autocompleteDelay,
          }
        : null,
      extraExtensions: [
        ...(enableNunjucksTags && !settings.nunjucksPowerUserMode
          ? [
              nunjucksTagsExtension({
                handleRender,
                handleGetRenderContext,
                showVariableSourceAndValue: settings.showVariableSourceAndValue,
                editorId: id,
                readOnly,
              }),
            ]
          : []),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            const value = update.state.doc.toString();
            onChange(value);
            updateTooltipValue(value);
          }
        }),
        EditorView.domEventHandlers({
          blur(event) {
            onBlur?.(event);
            onChange(getEditorValue(viewRef.current));
          },
          paste(event) {
            const text = event.clipboardData?.getData('text/plain');
            if (text && onPaste && isCurlCommand(text)) {
              onPaste(text);
              event.preventDefault();
              return true;
            }
            return false;
          },
          keydown(event, view) {
            if (onKeyDown) {
              onKeyDown(event, view.state.doc.toString());
            }
            return false;
          },
        }),
      ],
    });

    viewRef.current = new EditorView({
      state: EditorState.create({ doc: defaultValue || '', extensions }),
      parent: containerRef.current,
    });
    attachViewReference(viewRef.current);
    updateTooltipValue(defaultValue || '');
    setEditorVersion(v => v + 1);
  }, [
    defaultValue,
    enableNunjucksTags,
    getAutocompleteConstants,
    handleGetRenderContext,
    handleRender,
    id,
    onBlur,
    onChange,
    onKeyDown,
    onPaste,
    placeholder,
    readOnly,
    settings.autocompleteDelay,
    settings.hotKeyRegistry,
    settings.nunjucksPowerUserMode,
    settings.showVariableSourceAndValue,
    updateTooltipValue,
  ]);

  useLayoutEffect(() => {
    if (containerRef.current?.offsetWidth) {
      initEditor();
    }
  }, [initEditor]);

  useResizeObserver(containerRef, ({ width }) => {
    if (width && width > 0 && !viewRef.current) {
      initEditor();
    }
  });

  reactUse.useMount(() => {
    initEditor();
    if (autoFocus && !readOnly) {
      onAutoFocus?.();
      viewRef.current?.focus();
    }
  });

  reactUse.useUnmount(() => {
    persistState();
    viewRef.current?.destroy();
    viewRef.current = null;
  });

  useEditorRefresh(() => {
    viewRef.current?.destroy();
    viewRef.current = null;
    initEditor();
  });

  useEffect(() => {
    if (viewRef.current) {
      reconfigureReadOnly(viewRef.current, !!readOnly);
    }
  }, [readOnly, editorVersion]);

  useEffect(() => {
    const view = viewRef.current;
    if (view && historyKey !== undefined && !view.hasFocus && defaultValue !== view.state.doc.toString()) {
      setEditorValue(view, defaultValue || '');
      updateTooltipValue(defaultValue || '');
    }
  }, [defaultValue, historyKey, updateTooltipValue]);

  useImperativeHandle(ref, () => ({
    selectAll: () => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({ selection: EditorSelection.create([EditorSelection.range(0, view.state.doc.length)]) });
    },
    focusEnd: () => {
      viewRef.current?.focus();
      const view = viewRef.current;
      if (view) {
        setCursor(view, 0, view.state.doc.length);
      }
    },
    setValue: (value: string) => viewRef.current && setEditorValue(viewRef.current, value),
  }));

  return (
    <Tooltip message={tooltipValue} delay={1000} className="h-full w-full" shouldShow={() => Boolean(tooltipValue)}>
      <div
        className={classnames('editor--single-line', { editor: true, 'editor--readonly': readOnly })}
        data-editor-type={type || 'text'}
        data-testid="OneLineEditor"
      >
        <div ref={containerRef} className="editor__container input editor--single-line" data-cm-editor="true" />
      </div>
    </Tooltip>
  );
});
OneLineEditor.displayName = 'OneLineEditor';
