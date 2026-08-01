import { yaml } from '@codemirror/lang-yaml';
import { MergeView } from '@codemirror/merge';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import classnames from 'classnames';
import { useEffect, useRef } from 'react';

import { debounce } from '~/common/misc';
import { useIsLightTheme } from '~/ui/hooks/theme';

import { insomniaEditorTheme, insomniaSyntaxHighlighting } from './cm6/theme';

interface Props {
  leftContent: string;
  rightContent: string;
  centerContent: string;
  onChange: (value: string) => void;
}

export const MergeEditor = ({ leftContent, rightContent: _rightContent, centerContent, onChange }: Props) => {
  const divRef = useRef<HTMLDivElement>(null);
  const mergeViewRef = useRef<MergeView | null>(null);
  const onChangeRef = useRef(onChange);
  const isLightTheme = useIsLightTheme();

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!divRef.current) {
      return;
    }
    const div = divRef.current;
    const debouncedOnChange = debounce((value: string) => onChangeRef.current(value), 300);
    const baseExtensions = [yaml(), insomniaEditorTheme, insomniaSyntaxHighlighting, EditorView.lineWrapping];

    mergeViewRef.current = new MergeView({
      a: { doc: leftContent, extensions: [...baseExtensions, EditorState.readOnly.of(true)] },
      b: {
        doc: centerContent,
        extensions: [
          ...baseExtensions,
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              debouncedOnChange(update.state.doc.toString());
            }
          }),
        ],
      },
      parent: div,
      highlightChanges: true,
      gutter: true,
    });

    return () => {
      mergeViewRef.current?.destroy();
      mergeViewRef.current = null;
      div.innerHTML = '';
    };
  }, [isLightTheme, leftContent]);

  useEffect(() => {
    const editor = mergeViewRef.current?.b;
    if (editor && editor.state.doc.toString() !== centerContent) {
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: centerContent },
      });
    }
  }, [centerContent]);

  return (
    <div className={classnames('h-full merge-editor-cm6', { 'dark-merge-editor': !isLightTheme })} ref={divRef} />
  );
};
