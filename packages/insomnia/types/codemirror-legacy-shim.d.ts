/// <reference path="../../../node_modules/@types/codemirror/index.d.ts" />

import type { GraphQLInfoOptions } from 'codemirror-graphql/info';
import type { ModifiedGraphQLJumpOptions } from 'codemirror-graphql/jump';
import type { GraphQLSchema } from 'graphql';
import type { Settings } from 'insomnia-data';

import type { RenderContextAndKeys } from '../src/common/templating/types';
import type { HandleRender } from '../src/common/render';
import type { NunjucksParsedTag } from '../src/templating/utils';

type LinkClickCallback = (url: string) => void;

declare global {
  namespace CodeMirror {
    type CodeMirrorLinkClickCallback = LinkClickCallback;

    interface Editor {
      closeHintDropdown: () => void;
      enableNunjucksTags: (
        handleRender: HandleRender,
        handleGetRenderContext?: (contextCacheKey?: string) => Promise<RenderContextAndKeys>,
        showVariableSourceAndValue?: boolean,
        editorId?: string,
      ) => void;
      isHintDropdownActive: () => boolean;
      makeLinksClickable: (handleClick: LinkClickCallback) => void;
      showHint(options?: ShowHintOptions): void;
      foldCode(from: Position, options?: unknown): void;
    }

    interface EditorFromTextArea {
      closeHintDropdown: () => void;
      enableNunjucksTags: (
        handleRender: HandleRender,
        handleGetRenderContext?: (contextCacheKey?: string) => Promise<RenderContextAndKeys>,
        showVariableSourceAndValue?: boolean,
        editorId?: string,
      ) => void;
      isHintDropdownActive: () => boolean;
      makeLinksClickable: (handleClick: LinkClickCallback) => void;
      showHint(options?: ShowHintOptions): void;
      foldCode(from: Position, options?: unknown): void;
    }

    interface TextMarker {
      __isFold: boolean;
    }

    interface Variable {
      name: string;
      value: any;
    }

    interface Snippet {
      name: string;
      displayValue: string;
      value: string | (() => Promise<unknown>);
    }

    interface EnvironmentAutocompleteOptions extends Pick<Settings, 'hotKeyRegistry' | 'autocompleteDelay'> {
      getConstants?: () => string[] | PromiseLike<string[]>;
      getVariables?: () => Variable[] | PromiseLike<Variable[]>;
      getSnippets?: () => Snippet[] | PromiseLike<Snippet[]>;
      getTags?: () => NunjucksParsedTag[] | PromiseLike<NunjucksParsedTag[]>;
    }

    interface EditorConfiguration {
      info?: GraphQLInfoOptions;
      jump?: ModifiedGraphQLJumpOptions;
      environmentAutocomplete?: EnvironmentAutocompleteOptions;
      placeholder?: string;
      lint?: boolean | LintOptions;
      hintOptions?: ShowHintOptions;
      foldGutter?: boolean;
      autoRefresh?: boolean | { delay: number };
      matchBrackets?: boolean;
      autoCloseBrackets?: boolean;
    }

    interface Hint {
      displayText?: string;
      render?: (element: HTMLElement, data: Hint, cur: Hint) => void;
      hint?: unknown;
      type: 'constant' | 'variable' | 'snippet' | 'tag';
      segment: string;
      displayValue: string;
      comment?: string;
      score: number;
      text: string | (() => PromiseLike<unknown>);
    }

    interface ShowHintOptions {
      variables?: Variable[];
      constants?: string[];
      snippets?: Snippet[];
      tags?: NunjucksParsedTag[];
      showAllOnNoMatch?: boolean;
      completeSingle?: boolean;
      hint?: unknown;
      container?: HTMLElement;
      closeCharacters?: RegExp;
      extraKeys?: Record<string, unknown>;
    }

    interface Hints {
      list: Hint[];
    }

    interface LintOptions {
      schema?: GraphQLSchema;
    }

    interface EditorEventMap {
      fold: (instance: Editor, from: Position) => void;
      unfold: (instance: Editor, from: Position) => void;
      cut: (instance: Editor, e: ClipboardEvent) => void;
      copy: (instance: Editor, e: ClipboardEvent) => void;
      paste: (instance: Editor, e: ClipboardEvent) => void;
      endCompletion: (instance: Editor) => void;
    }

    const keyNames: Record<number, string>;
  }
}

declare module 'codemirror-legacy' {
  export = CodeMirror;
  export as namespace CodeMirror;

  export import CodeMirrorLinkClickCallback = CodeMirror.CodeMirrorLinkClickCallback;
  export import EnvironmentAutocompleteOptions = CodeMirror.EnvironmentAutocompleteOptions;
  export import Hint = CodeMirror.Hint;
  export import LintOptions = CodeMirror.LintOptions;
  export import ShowHintOptions = CodeMirror.ShowHintOptions;
  export import Snippet = CodeMirror.Snippet;
  export import TextMarker = CodeMirror.TextMarker;
}

declare module 'codemirror-legacy/*';
