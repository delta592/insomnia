import { buildSchema } from 'graphql';
import { describe, expect, it } from 'vitest';

import { getGraphQLTokens } from './get-graphql-token-at';

describe('graphql token helper for jump/info', () => {
  it('identifies NamedType tokens in selection sets', () => {
    const query = 'query { user { name } }';
    const tokens = getGraphQLTokens(query);
    const userToken = tokens.find(token => token.string === 'user');
    expect(userToken?.state.kind).toBe('Field');
  });

  it('parses arguments in operations', () => {
    const schema = buildSchema('type Query { echo(message: String): String }');
    void schema;
    const query = 'query($msg: String) { echo(message: $msg) }';
    const tokens = getGraphQLTokens(query);
    expect(tokens.some(token => token.string === 'message')).toBe(true);
    expect(tokens.some(token => token.string.startsWith('$'))).toBe(true);
  });
});
