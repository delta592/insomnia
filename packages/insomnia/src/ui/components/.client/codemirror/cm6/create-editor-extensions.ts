import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { foldGutter, foldKeymap } from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches,searchKeymap } from '@codemirror/search';
import type { Extension } from '@codemirror/state';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, highlightActiveLine,keymap, lineNumbers, placeholder as placeholderExt } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { isMac } from 'insomnia-data/common';

import { clickableLinksExtension } from './extensions/clickable-links';
import { environmentAutocompleteExtension } from './extensions/environment-autocomplete';
import { createGraphQLExtensions, createGraphQLVariablesAutocompleteExtensions } from './graphql/create-graphql-extensions';
import type { GraphQLExtensionOptions } from './graphql/types';
import { getLanguageExtensions } from './language-support';
import { javascriptLintExtension } from './lint/javascript-lint';
import { jsonLintExtension } from './lint/json-lint';
import { openapiLintExtension } from './lint/openapi-lint';
import { insomniaEditorTheme, insomniaSyntaxHighlighting, singleLineEditorTheme } from './theme';
import type { CodeMirrorLinkClickCallback, EditorModeSpec, EnvironmentAutocompleteConfig } from './types';

export const languageCompartment = new Compartment();
export const lintCompartment = new Compartment();
export const readOnlyCompartment = new Compartment();
export const autocompleteCompartment = new Compartment();
export const graphqlCompartment = new Compartment();

export interface GraphQLEditorOptions {
  hintOptions?: GraphQLExtensionOptions['hintOptions'];
  infoOptions?: GraphQLExtensionOptions['infoOptions'];
  jumpOptions?: GraphQLExtensionOptions['jumpOptions'];
  lintOptions?: GraphQLExtensionOptions['lintOptions'];
  getAutocompleteConstants?: () => string[] | PromiseLike<string[]>;
}

export interface CreateEditorExtensionsOptions {
  mode?: EditorModeSpec;
  readOnly?: boolean;
  placeholder?: string;
  lineNumbers?: boolean;
  lineWrapping?: boolean;
  lint?: boolean | Record<string, unknown>;
  noLint?: boolean;
  noStyleActiveLine?: boolean;
  indentWithTabs?: boolean;
  tabSize?: number;
  singleLine?: boolean;
  environmentAutocomplete?: EnvironmentAutocompleteConfig | false | null;
  onClickLink?: CodeMirrorLinkClickCallback;
  fontSize?: number;
  extraExtensions?: Extension[];
  graphqlOptions?: GraphQLEditorOptions;
}

const getMime = (mode: EditorModeSpec | undefined) => (typeof mode === 'string' ? mode : mode?.baseMode ?? '');

const buildGraphQLExtensions = (
  mode: EditorModeSpec | undefined,
  graphqlOptions: GraphQLEditorOptions | undefined,
  noLint?: boolean,
): Extension[] => {
  const mime = getMime(mode);
  if (mime === 'graphql') {
    return createGraphQLExtensions({
      mode: 'graphql',
      hintOptions: graphqlOptions?.hintOptions,
      infoOptions: graphqlOptions?.infoOptions,
      jumpOptions: graphqlOptions?.jumpOptions,
      lintOptions: (graphqlOptions?.lintOptions ?? undefined) as GraphQLExtensionOptions['lintOptions'],
      noLint,
    });
  }
  if (mime === 'graphql-variables') {
    return [
      ...createGraphQLExtensions({
        mode: 'graphql-variables',
        lintOptions: (graphqlOptions?.lintOptions ?? undefined) as GraphQLExtensionOptions['lintOptions'],
        noLint,
      }),
      ...createGraphQLVariablesAutocompleteExtensions(graphqlOptions?.getAutocompleteConstants),
    ];
  }
  return [];
};

const getLintExtension = (mode: EditorModeSpec | undefined, lintOptions: boolean | Record<string, unknown> | undefined, noLint?: boolean) => {
  if (noLint) {
    return [];
  }
  const mime = getMime(mode);
  if (mime === 'graphql' || mime === 'graphql-variables') {
    return [];
  }
  if (mime.includes('json') || mime === 'application/json') {
    return [jsonLintExtension()];
  }
  if (mime.includes('javascript') || mime === 'application/javascript') {
    return [javascriptLintExtension(lintOptions as never)];
  }
  if (mime === 'openapi' || mime.includes('openapi')) {
    return [openapiLintExtension()];
  }
  return [];
};

export const createEditorExtensions = ({
  mode,
  readOnly,
  placeholder,
  lineNumbers: showLineNumbers = true,
  lineWrapping = true,
  lint,
  noLint,
  noStyleActiveLine,
  indentWithTabs: useTabs,
  tabSize = 4,
  singleLine,
  environmentAutocomplete,
  onClickLink,
  fontSize,
  extraExtensions = [],
  graphqlOptions,
}: CreateEditorExtensionsOptions): Extension[] => {
  const extensions: Extension[] = [
    history(),
    insomniaEditorTheme,
    insomniaSyntaxHighlighting,
    highlightSelectionMatches(),
    EditorState.tabSize.of(tabSize),
    EditorState.readOnly.of(!!readOnly),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...searchKeymap,
      ...lintKeymap,
      indentWithTab,
      {
        key: isMac ? 'Mod-/' : 'Ctrl-/',
        run: _view => {
          // comment toggling handled by language packages where available
          return false;
        },
      },
    ]),
    languageCompartment.of(getLanguageExtensions(mode)),
    lintCompartment.of(getLintExtension(mode, lint, noLint)),
    graphqlCompartment.of(buildGraphQLExtensions(mode, graphqlOptions, noLint)),
    readOnlyCompartment.of(EditorState.readOnly.of(!!readOnly)),
    autocompleteCompartment.of(environmentAutocompleteExtension(environmentAutocomplete ?? null)),
    ...clickableLinksExtension(onClickLink),
    ...extraExtensions,
  ];

  if (showLineNumbers) {
    extensions.push(lineNumbers(), foldGutter());
  }

  if (!noStyleActiveLine && !readOnly) {
    extensions.push(highlightActiveLine());
  }

  if (placeholder) {
    extensions.push(placeholderExt(placeholder));
  }

  if (singleLine) {
    extensions.push(singleLineEditorTheme);
  }

  if (lineWrapping) {
    extensions.push(EditorView.lineWrapping);
  }

  if (fontSize) {
    extensions.push(EditorView.theme({ '&': { fontSize: `${fontSize}px` } }));
  }

  if (useTabs) {
    extensions.push(EditorState.changeFilter.of(() => true));
  }

  return extensions;
};

export const createBasicEditorExtensions = (): Extension[] => [basicSetup, history()];

export const reconfigureLanguage = (view: EditorView, mode?: EditorModeSpec) =>
  view.dispatch({ effects: languageCompartment.reconfigure(getLanguageExtensions(mode)) });

export const reconfigureLint = (view: EditorView, mode: EditorModeSpec | undefined, lint: boolean | Record<string, unknown> | undefined, noLint?: boolean) =>
  view.dispatch({ effects: lintCompartment.reconfigure(getLintExtension(mode, lint, noLint)) });

export const reconfigureReadOnly = (view: EditorView, readOnly: boolean) =>
  view.dispatch({ effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)) });

export const reconfigureGraphQL = (
  view: EditorView,
  mode: EditorModeSpec | undefined,
  graphqlOptions: GraphQLEditorOptions | undefined,
  noLint?: boolean,
) => view.dispatch({ effects: graphqlCompartment.reconfigure(buildGraphQLExtensions(mode, graphqlOptions, noLint)) });
