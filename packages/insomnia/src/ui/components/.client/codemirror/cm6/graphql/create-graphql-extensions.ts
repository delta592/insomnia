import type { Extension } from '@codemirror/state';

import { graphqlAutocompleteExtension } from './graphql-autocomplete';
import { graphqlInputFilterExtension } from './graphql-input-filter';
import { graphqlLintExtension } from './graphql-lint';
import type { GraphQLExtensionOptions } from './types';

export const createGraphQLExtensions = (options: GraphQLExtensionOptions): Extension[] => {
  const extensions: Extension[] = [];

  if (options.mode === 'graphql') {
    if (!options.noLint && options.lintOptions && 'schema' in options.lintOptions) {
      extensions.push(graphqlLintExtension(options.lintOptions));
    }

    if (options.hintOptions) {
      extensions.push(...graphqlAutocompleteExtension(options.hintOptions));
    }

    extensions.push(graphqlInputFilterExtension());
  }

  return extensions;
};
