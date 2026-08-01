import type { SchemaReference } from 'codemirror-graphql/utils/SchemaReference';
import type { FragmentDefinitionNode, GraphQLInputType, GraphQLSchema } from 'graphql';
import type { AutocompleteSuggestionOptions } from 'graphql-language-service';

export interface GraphQLHintOptions {
  schema?: GraphQLSchema;
  externalFragments?: string | FragmentDefinitionNode[];
  autocompleteOptions?: AutocompleteSuggestionOptions;
  completeSingle?: boolean;
}

export interface GraphQLInfoOptions {
  schema?: GraphQLSchema;
  onClick?: (ref: SchemaReference | null | undefined, e: MouseEvent) => void;
  renderDescription?: (str: string) => string;
}

export interface GraphQLJumpOptions {
  schema?: GraphQLSchema;
  onClick?: (ref: SchemaReference | null | undefined, e: MouseEvent) => void;
}

export interface GraphQLQueryLintOptions {
  schema?: GraphQLSchema;
  validationRules?: unknown;
  externalFragments?: string | FragmentDefinitionNode[];
}

export interface GraphQLVariablesLintOptions {
  variableToType?: Record<string, GraphQLInputType>;
}

export interface GraphQLExtensionOptions {
  mode: 'graphql' | 'graphql-variables';
  hintOptions?: GraphQLHintOptions;
  infoOptions?: GraphQLInfoOptions;
  jumpOptions?: GraphQLJumpOptions;
  lintOptions?: GraphQLQueryLintOptions | GraphQLVariablesLintOptions;
  noLint?: boolean;
}

export interface GraphQLToken {
  type: string | null;
  string: string;
  state: Record<string, unknown>;
  start: number;
  end: number;
}

export interface EditorHighlightRange {
  from: { line: number; ch: number };
  to: { line: number; ch: number };
  className?: string;
}
