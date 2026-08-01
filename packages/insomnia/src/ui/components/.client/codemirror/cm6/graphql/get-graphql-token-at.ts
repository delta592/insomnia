import type { StreamParser } from '@codemirror/language';
import { graphql } from 'codemirror-graphql/cm6-legacy/mode';

import { GraphQLStringStream } from './graphql-stream';
import type { GraphQLToken } from './types';

const snapshotParserState = (state: unknown): Record<string, unknown> => {
  const current = state as Record<string, unknown>;
  const snapshot: Record<string, unknown> = {
    kind: current.kind,
    step: current.step,
    name: current.name,
    level: current.level,
    type: current.type,
    needsSeparator: current.needsSeparator,
  };

  if (current.prevState) {
    snapshot.prevState = snapshotParserState(current.prevState);
  }

  return snapshot;
};

const createParserState = (parser: StreamParser<unknown>) => {
  const startState = parser.startState as (config?: unknown) => unknown;
  return startState({});
};

export const getGraphQLTokenAt = (doc: string, offset: number, parser: StreamParser<unknown> = graphql): GraphQLToken | null => {
  const state = createParserState(parser);
  const lines = doc.split('\n');
  let lineOffset = 0;
  let lastToken: GraphQLToken | null = null;

  for (const line of lines) {
    const stream = new GraphQLStringStream(line);

    while (!stream.eol()) {
      stream.start = stream.pos;
      const type = parser.token!(stream as never, state as never);
      const start = lineOffset + stream.start;
      const end = lineOffset + stream.pos;
      const token: GraphQLToken = {
        type: type ?? null,
        string: doc.slice(start, end),
        state: snapshotParserState(state),
        start,
        end,
      };

      if (offset >= start && offset < end) {
        return token;
      }

      if (offset === end && stream.eol()) {
        return token;
      }

      lastToken = token;
    }

    lineOffset += line.length + 1;
  }

  if (lastToken && offset >= lastToken.start) {
    return lastToken;
  }

  return null;
};

export const getGraphQLTokens = (doc: string, parser: StreamParser<unknown> = graphql): GraphQLToken[] => {
  const state = createParserState(parser);
  const lines = doc.split('\n');
  let lineOffset = 0;
  const tokens: GraphQLToken[] = [];

  for (const line of lines) {
    const stream = new GraphQLStringStream(line);

    while (!stream.eol()) {
      stream.start = stream.pos;
      const type = parser.token!(stream as never, state as never);
      const start = lineOffset + stream.start;
      const end = lineOffset + stream.pos;

      if (end > start) {
        tokens.push({
          type: type ?? null,
          string: doc.slice(start, end),
          state: snapshotParserState(state),
          start,
          end,
        });
      } else {
        stream.pos++;
      }
    }

    lineOffset += line.length + 1;
  }

  return tokens;
};

export const getGraphQLTokenAtPos = (doc: string, line: number, ch: number, parser: StreamParser<unknown> = graphql): GraphQLToken | null => {
  const lines = doc.split('\n');
  let offset = 0;
  for (let i = 0; i < line; i++) {
    offset += (lines[i]?.length ?? 0) + 1;
  }
  offset += ch;
  return getGraphQLTokenAt(doc, offset, parser);
};
