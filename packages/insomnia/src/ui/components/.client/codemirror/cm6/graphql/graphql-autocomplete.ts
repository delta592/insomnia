import { autocompletion, type Completion, type CompletionContext, type CompletionSource } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import { getAutocompleteSuggestions, Position } from 'graphql-language-service';

import { getGraphQLTokenAtPos } from './get-graphql-token-at';
import type { GraphQLHintOptions } from './types';

const createGraphQLCompletionSource = (options: GraphQLHintOptions): CompletionSource => {
  return (context: CompletionContext) => {
    const { schema, externalFragments, autocompleteOptions } = options;
    if (!schema) {
      return null;
    }

    const { state, pos } = context;
    const doc = state.doc.toString();
    const line = state.doc.lineAt(pos);
    const lineIndex = line.number - 1;
    const ch = pos - line.from;

    const token = getGraphQLTokenAtPos(doc, lineIndex, ch);
    const tokenStart = token && token.type !== null && /"|\w/.test(token.string[0] ?? '') ? token.start - line.from : ch;

    const position = new Position(lineIndex, tokenStart);
    const rawResults = getAutocompleteSuggestions(
      schema,
      doc,
      position,
      token
        ? ({
            type: token.type,
            string: token.string,
            start: tokenStart,
            end: ch,
            state: token.state,
          } as never)
        : undefined,
      externalFragments,
      autocompleteOptions,
    );

    if (!rawResults.length) {
      return null;
    }

    const optionsList: Completion[] = rawResults.map(item => ({
      label: item.label,
      detail: item.documentation ?? undefined,
      type: typeof item.type === 'string' ? item.type : undefined,
      apply: item.rawInsert ?? item.label,
      deprecated: item.isDeprecated,
    }));

    return {
      from: line.from + tokenStart,
      to: pos,
      options: optionsList,
    };
  };
};

export const graphqlAutocompleteExtension = (options: GraphQLHintOptions = {}): Extension[] => {
  if (!options.schema) {
    return [];
  }

  return [
    autocompletion({
      override: [createGraphQLCompletionSource(options)],
      activateOnTyping: true,
      maxRenderedOptions: 50,
    }),
  ];
};
