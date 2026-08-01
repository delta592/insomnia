import { type Diagnostic,linter } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import { getDiagnostics } from 'graphql-language-service';

import { posToOffset } from '../editor-utils';
import type { GraphQLQueryLintOptions } from './types';

const MAX_SIZE_FOR_LINTING = 1_000_000;

const SEVERITY: Diagnostic['severity'][] = ['error', 'warning', 'info', 'hint'];

const TYPE: Record<string, string> = {
  'GraphQL: Validation': 'validation',
  'GraphQL: Deprecation': 'deprecation',
  'GraphQL: Syntax': 'syntax',
};

export const graphqlLintExtension = (options: GraphQLQueryLintOptions = {}): Extension =>
  linter(view => {
    const text = view.state.doc.toString();
    if (!text || text.length > MAX_SIZE_FOR_LINTING || !options.schema) {
      return [];
    }

    const rawResults = getDiagnostics(text, options.schema, options.validationRules as never, undefined, options.externalFragments);

    return rawResults.map(error => ({
      message: String(error.message),
      severity: error.severity ? SEVERITY[error.severity - 1] : 'error',
      source: error.source ? TYPE[error.source] : undefined,
      from: posToOffset(view.state.doc, { line: error.range.start.line, ch: error.range.start.character }),
      to: posToOffset(view.state.doc, { line: error.range.end.line, ch: error.range.end.character }),
    }));
  });
