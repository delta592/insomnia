import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import classnames from 'classnames';
import type { KeyCombination } from 'insomnia-data/common';
import { JSONPath } from 'jsonpath-plus';
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Button, Toolbar } from 'react-aria-components';
import { useLatest, useMount, useUnmount } from 'react-use';
import vkBeautify from 'vkbeautify';

import * as misc from '~/common/misc';
import { type NunjucksParsedTag } from '~/common/templating/types';
import { useRootLoaderData } from '~/root';
import { AnalyticsEvent, trackOnceDaily } from '~/ui/analytics';
import { createKeybindingsHandler } from '~/ui/components/keydown-binder';
import { isKeyCombinationInRegistry } from '~/ui/components/settings/shortcuts';
import { useNunjucks } from '~/ui/context/nunjucks/use-nunjucks';
import { useEditorRefresh } from '~/ui/hooks/use-editor-refresh';
import { plugins } from '~/ui/plugins/renderer-bridge';
import { getTagDefinitions } from '~/ui/templating/renderer-safe';
import { ednPrettify } from '~/ui/utils/prettify/edn';
import { jsonPrettify } from '~/ui/utils/prettify/json';
import { queryXPath } from '~/ui/utils/xpath/query';

import { createEditorExtensions, reconfigureLanguage, reconfigureLint } from './cm6/create-editor-extensions';
import {
  attachViewReference,
  getCursor,
  getEditorValue,
  getLine,
  indexFromPos,
  offsetToPos,
  posToOffset,
  setCursor,
  setEditorValue,
} from './cm6/editor-utils';
import { nunjucksTagsExtension } from './cm6/extensions/nunjucks-tags';
import { normalizeMimeType } from './cm6/normalize-mime-type';
import type { CodeMirrorLinkClickCallback, EditorChange, EditorModeSpec, EditorPosition } from './cm6/types';
import { getCachedEditorState, setCachedEditorState } from './editor-state-cache';

const TAB_SIZE = 4;

export const shouldIndentWithTabs = ({ mode, indentWithTabs }: { mode?: string; indentWithTabs?: boolean }) => {
  const isYaml = mode?.includes('yaml') || false;
  const isOpenAPI = mode === 'openapi';
  return indentWithTabs && !isYaml && !isOpenAPI;
};

export interface CodeEditorProps {
  autoPrettify?: boolean;
  className?: string;
  defaultValue?: string;
  dynamicHeight?: boolean;
  enableNunjucks?: boolean;
  filter?: string;
  filterHistory?: string[];
  getAutocompleteConstants?: () => string[] | PromiseLike<string[]>;
  getAutocompleteSnippets?: () => { name: string; value?: string }[];
  hideGutters?: boolean;
  hideLineNumbers?: boolean;
  hintOptions?: Record<string, unknown>;
  id: string;
  infoOptions?: Record<string, unknown>;
  jumpOptions?: Record<string, unknown>;
  lintOptions?: Record<string, unknown>;
  showPrettifyButton?: boolean;
  mode?: string;
  noLint?: boolean;
  noMatchBrackets?: boolean;
  noStyleActiveLine?: boolean;
  onBlur?: (e: FocusEvent) => void;
  onFocus?: (e: Event, editor?: EditorView) => void;
  onChange?: (value: string, changeObj: EditorChange[]) => void;
  onCursorActivity?: (doc: EditorView) => void;
  onPaste?: (value: string) => string;
  onPrettify?: () => void;
  onClickLink?: CodeMirrorLinkClickCallback;
  pinToBottom?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  truncateLongLines?: boolean;
  style?: object;
  historyKey?: string;
  updateFilter?: (filter: string) => void;
}

export interface CodeEditorHandle {
  setValue: (value: string) => void;
  getValue: () => string;
  scrollToSelection: (chStart: number, chEnd: number, lineStart: number, lineEnd: number) => void;
  selectAll: () => void;
  focus: () => void;
  focusEnd: () => void;
  getCursor: () => EditorPosition | undefined;
  setCursorLine: (lineNumber: number) => void;
  tryToSetOption: (key: string, value: unknown) => void;
  hasFocus: () => boolean;
  indexFromPos: (pos?: EditorPosition) => number;
  getDoc: () => { getValue: () => string; lineCount: () => number; setCursor: (line: number) => void } | undefined;
}

export const CodeEditor = memo(
  forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(props, ref) {
    const {
      autoPrettify,
      className,
      defaultValue,
      dynamicHeight,
      enableNunjucks,
      filter,
      filterHistory: _filterHistory,
      getAutocompleteConstants,
      getAutocompleteSnippets,
      hideGutters,
      hideLineNumbers,
      hintOptions: _hintOptions,
      id,
      lintOptions,
      showPrettifyButton,
      mode,
      noLint,
      onFocus,
      onBlur,
      onChange,
      onCursorActivity,
      onPaste,
      onPrettify,
      onClickLink,
      pinToBottom: _pinToBottom,
      placeholder,
      readOnly,
      style,
      historyKey,
      updateFilter,
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [originalCode, setOriginalCode] = useState('');
    const { settings } = useRootLoaderData()!;
    const indentSize = settings.editorIndentSize;
    const indentWithTabs = shouldIndentWithTabs({ mode, indentWithTabs: settings.editorIndentWithTabs });
    const { handleRender, handleGetRenderContext } = useNunjucks();
    const isNunjucksEnabled = enableNunjucks && handleRender;
    const latestOnChangeRef = useLatest(onChange);

    const editorMode: EditorModeSpec = useMemo(
      () =>
        !isNunjucksEnabled
          ? normalizeMimeType(mode)
          : { name: 'nunjucks', baseMode: normalizeMimeType(mode) },
      [isNunjucksEnabled, mode],
    );

    const maybePrettifyAndSetValue = useCallback(
      (code?: string, forcePrettify?: boolean, filterValue?: string) => {
        if (typeof code !== 'string') {
          return;
        }
        let next = code;
        const shouldPrettify = forcePrettify || autoPrettify;
        if (shouldPrettify) {
          setOriginalCode(code);
          if (mode?.includes('xml')) {
            try {
              next = vkBeautify.xml(
                updateFilter && filterValue
                  ? `<result>${queryXPath(code, filterValue).map(r => r.outer).join('\n')}</result>`
                  : code,
                indentWithTabs ? '\t' : ' '.repeat(indentSize || TAB_SIZE),
              );
            } catch {
              next = code;
            }
          } else if (mode?.includes('json')) {
            try {
              let jsonString = code;
              if (updateFilter && filterValue) {
                const results = JSONPath({ json: JSON.parse(code), path: filterValue.trim() });
                jsonString = JSON.stringify(results);
              }
              next = jsonPrettify(jsonString, indentWithTabs ? '\t' : ' '.repeat(indentSize || TAB_SIZE), autoPrettify);
            } catch {
              next = code;
            }
          } else if (mode?.includes('edn')) {
            try {
              next = ednPrettify(code);
            } catch {
              next = code;
            }
          }
        }
        setEditorValue(viewRef.current, next || '');
      },
      [autoPrettify, indentSize, indentWithTabs, mode, updateFilter],
    );

    const persistState = useCallback(() => {
      const view = viewRef.current;
      if (historyKey && view) {
        setCachedEditorState(historyKey, {
          history: null,
          scroll: { left: view.scrollDOM.scrollLeft, top: view.scrollDOM.scrollTop },
          cursor: getCursor(view),
        });
      }
    }, [historyKey]);

    const initEditor = useCallback(() => {
      if (!containerRef.current || viewRef.current) {
        return;
      }

      const transformEnums = (tagDef: NunjucksParsedTag): NunjucksParsedTag[] => {
        if (tagDef.args[0]?.type === 'enum') {
          return (
            tagDef.args[0].options?.map(option => {
              const optionName = misc.fnOrString(option.displayName, tagDef.args);
              return {
                ...tagDef,
                displayName: `${tagDef.displayName} ⇒ ${optionName}`,
                args: [{ ...tagDef.args[0], defaultValue: option.value }, ...tagDef.args.slice(1)],
              };
            }) || []
          );
        }
        return [tagDef];
      };

      const extensions = createEditorExtensions({
        mode: editorMode,
        readOnly,
        placeholder,
        lineNumbers: !hideGutters && !hideLineNumbers,
        lineWrapping: settings.editorLineWrapping ?? true,
        lint: lintOptions,
        noLint,
        indentWithTabs,
        tabSize: indentSize || TAB_SIZE,
        fontSize: settings.editorFontSize,
        environmentAutocomplete: {
          getVariables: async () => (!handleGetRenderContext ? [] : (await handleGetRenderContext())?.keys || []),
          getTags: async () => (!handleGetRenderContext ? [] : (await getTagDefinitions()).flatMap(transformEnums)),
          getConstants: getAutocompleteConstants,
          getSnippets: getAutocompleteSnippets,
          hotKeyRegistry: settings.hotKeyRegistry,
          autocompleteDelay: settings.autocompleteDelay,
        },
        onClickLink,
        extraExtensions: [
          ...(isNunjucksEnabled && !settings.nunjucksPowerUserMode
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
            if (update.docChanged && latestOnChangeRef.current) {
              const changeList: EditorChange[] = [];
              update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
                changeList.push({
                  from: offsetToPos(update.startState.doc, fromA),
                  to: offsetToPos(update.startState.doc, toA),
                  text: [inserted.toString()],
                });
              });
              latestOnChangeRef.current(update.state.doc.toString(), changeList);
              setOriginalCode(update.state.doc.toString());
            }
            if (update.selectionSet && onCursorActivity && viewRef.current) {
              onCursorActivity(viewRef.current);
            }
            if (update.docChanged || update.selectionSet) {
              persistState();
            }
          }),
          EditorView.domEventHandlers({
            focus(event) {
              onFocus?.(event, viewRef.current ?? undefined);
            },
            blur(event) {
              onBlur?.(event);
            },
            keydown(event) {
              const pressedKeyComb: KeyCombination = {
                ctrl: event.ctrlKey,
                alt: event.altKey,
                shift: event.shiftKey,
                meta: event.metaKey,
                keyCode: event.keyCode,
              };
              const isUserShortcut = isKeyCombinationInRegistry(pressedKeyComb, settings.hotKeyRegistry);
              const isAutoComplete = isKeyCombinationInRegistry(pressedKeyComb, {
                showAutocomplete: settings.hotKeyRegistry.showAutocomplete,
              });
              if ((isUserShortcut && !isAutoComplete) || event.code === 'Escape') {
                return false;
              }
              event.stopPropagation();
              return false;
            },
            paste(event, view) {
              if (onPaste && event.clipboardData) {
                const text = event.clipboardData.getData('text/plain');
                const translated = onPaste(text);
                if (translated !== text) {
                  const { from, to } = view.state.selection.main;
                  view.dispatch({ changes: { from, to, insert: translated } });
                  event.preventDefault();
                  return true;
                }
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

      maybePrettifyAndSetValue(defaultValue || '', false, filter);
      const cached = historyKey ? getCachedEditorState(historyKey) : undefined;
      if (cached?.scroll && viewRef.current) {
        viewRef.current.scrollDOM.scrollTop = cached.scroll.top;
        viewRef.current.scrollDOM.scrollLeft = cached.scroll.left;
      }
      if (cached?.cursor && viewRef.current) {
        setCursor(viewRef.current, cached.cursor.line, cached.cursor.ch, false);
      }
    }, [
      defaultValue,
      editorMode,
      filter,
      getAutocompleteConstants,
      getAutocompleteSnippets,
      handleGetRenderContext,
      handleRender,
      hideGutters,
      hideLineNumbers,
      historyKey,
      id,
      indentSize,
      indentWithTabs,
      isNunjucksEnabled,
      latestOnChangeRef,
      lintOptions,
      maybePrettifyAndSetValue,
      noLint,
      onBlur,
      onClickLink,
      onCursorActivity,
      onFocus,
      onPaste,
      persistState,
      placeholder,
      readOnly,
      settings.autocompleteDelay,
      settings.editorFontSize,
      settings.editorLineWrapping,
      settings.hotKeyRegistry,
      settings.nunjucksPowerUserMode,
      settings.showVariableSourceAndValue,
    ]);

    useMount(initEditor);
    useUnmount(() => {
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
      if (viewRef.current && lintOptions) {
        reconfigureLint(viewRef.current, editorMode, lintOptions, noLint);
      }
    }, [editorMode, lintOptions, noLint]);

    useEffect(() => {
      if (viewRef.current) {
        reconfigureLanguage(viewRef.current, editorMode);
      }
    }, [editorMode]);

    useImperativeHandle(ref, () => ({
      setValue: value => setEditorValue(viewRef.current, value || ''),
      getValue: () => getEditorValue(viewRef.current),
      selectAll: () => {
        const view = viewRef.current;
        if (!view) return;
        view.dispatch({ selection: EditorSelection.create([EditorSelection.range(0, view.state.doc.length)]) });
      },
      focus: () => viewRef.current?.focus(),
      scrollToSelection: (chStart, chEnd, lineStart, lineEnd) => {
        const view = viewRef.current;
        if (!view) return;
        const from = posToOffset(view.state.doc, { line: lineStart, ch: chStart });
        const to = posToOffset(view.state.doc, { line: lineEnd, ch: chEnd });
        view.dispatch({ selection: EditorSelection.create([EditorSelection.range(from, to)]) });
        view.dispatch({ effects: EditorView.scrollIntoView(from, { y: 'center' }) });
      },
      focusEnd: () => {
        viewRef.current?.focus();
        const view = viewRef.current;
        if (view) {
          setCursor(view, view.state.doc.lines - 1, getLine(view, view.state.doc.lines - 1).length);
        }
      },
      getCursor: () => (viewRef.current ? getCursor(viewRef.current) : undefined),
      setCursorLine: lineNumber => viewRef.current && setCursor(viewRef.current, lineNumber),
      tryToSetOption: (key, value) => {
        const view = viewRef.current;
        if (!view) return;
        if (key === 'mode') {
          reconfigureLanguage(view, value as EditorModeSpec);
        } else if (key === 'lint') {
          reconfigureLint(view, editorMode, value as Record<string, unknown>, noLint);
        }
      },
      hasFocus: () => viewRef.current?.hasFocus ?? false,
      indexFromPos: pos => indexFromPos(viewRef.current!, pos),
      getDoc: () => {
        const view = viewRef.current;
        if (!view) return;
        return {
          getValue: () => view.state.doc.toString(),
          lineCount: () => view.state.doc.lines,
          setCursor: (line: number) => setCursor(view, line),
        };
      },
    }));

    const showFilter = readOnly && (mode?.includes('json') || mode?.includes('xml'));
    const showPrettify = (showPrettifyButton && mode?.includes('json')) || mode?.includes('xml');

    return (
      <div
        className={classnames(className, { editor: true, 'editor--dynamic-height': dynamicHeight, 'editor--readonly': readOnly })}
        style={style}
        data-editor-type="text"
        data-testid="CodeEditor"
        onContextMenu={async event => {
          if (readOnly || !enableNunjucks) return;
          event.preventDefault();
          const pluginTemplateTags = await plugins.getTemplateTags();
          window.main.showNunjucksContextMenu({ key: id, pluginTemplateTags });
        }}
      >
        <div
          ref={containerRef}
          className={classnames('editor__container', 'input', className)}
          style={{ fontSize: `${settings.editorFontSize}px`, minHeight: dynamicHeight ? undefined : '200px' }}
          data-cm-editor="true"
        />
        {showFilter || showPrettify ? (
          <div className="flex h-(--line-height-sm) w-full items-center border-t border-solid border-(--hl-md) text-(--font-size-sm)">
            {showFilter ? (
              <input
                ref={inputRef}
                key="filter"
                type="text"
                className="flex-1 pl-3"
                title="Filter response body"
                defaultValue={filter || ''}
                placeholder={mode?.includes('json') ? '$.store.books[*].author' : '/store/books/author'}
                onFocus={() => trackOnceDaily(AnalyticsEvent.responsePreviewJSONPathEntered)}
                onKeyDown={createKeybindingsHandler({
                  Enter: () => {
                    const filterValue = inputRef.current?.value;
                    updateFilter?.(filterValue || '');
                    maybePrettifyAndSetValue(originalCode, false, filterValue);
                  },
                })}
              />
            ) : null}
            <Toolbar className="flex h-full items-center">
              {showPrettify ? (
                <Button
                  className="flex h-full items-center justify-center gap-2 px-4 py-1 text-xs"
                  onPress={() => {
                    maybePrettifyAndSetValue(getEditorValue(viewRef.current), true);
                    onPrettify?.();
                  }}
                >
                  Beautify
                </Button>
              ) : null}
            </Toolbar>
          </div>
        ) : null}
      </div>
    );
  }),
);
CodeEditor.displayName = 'CodeEditor';

export type { EditorChange };
