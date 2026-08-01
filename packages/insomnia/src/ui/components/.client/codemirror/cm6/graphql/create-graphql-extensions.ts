import type { Extension } from '@codemirror/state';

import { graphqlAutocompleteExtension } from './graphql-autocomplete';
import { graphqlInfoExtension } from './graphql-info';
import { graphqlInputFilterExtension } from './graphql-input-filter';
import { graphqlJumpExtension } from './graphql-jump';
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

    if (options.infoOptions) {
      extensions.push(graphqlInfoExtension(options.infoOptions));
    }

    if (options.jumpOptions) {
      extensions.push(...graphqlJumpExtension(options.jumpOptions));
    }

    extensions.push(graphqlInputFilterExtension());
  }

  return extensions;
};
