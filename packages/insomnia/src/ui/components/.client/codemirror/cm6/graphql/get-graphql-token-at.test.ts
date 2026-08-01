import { buildSchema, GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { describe, expect, it } from 'vitest';

import { getGraphQLTokenAt, getGraphQLTokens } from './get-graphql-token-at';

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      hello: {
        type: GraphQLString,
      },
    },
  }),
});

describe('get-graphql-token-at', () => {
  it('returns token at cursor inside a field name', () => {
    const query = 'query { hello }';
    const token = getGraphQLTokenAt(query, query.indexOf('hello'));
    expect(token?.string).toBe('hello');
    expect(token?.state.kind).toBe('Field');
  });

  it('tokenizes all non-empty tokens in a query', () => {
    const query = 'query { hello }';
    const tokens = getGraphQLTokens(query);
    expect(tokens.some(token => token.string === 'hello')).toBe(true);
    expect(tokens.some(token => token.string === 'query')).toBe(true);
  });

  it('returns null for empty document offset', () => {
    expect(getGraphQLTokenAt('', 0)).toBeNull();
  });

  it('works with schema-backed query text', () => {
    const query = `query GetHello { hello }`;
    void schema;
    const token = getGraphQLTokenAt(query, query.indexOf('hello'));
    expect(token?.type).toBeTruthy();
  });
});

describe('buildSchema sanity', () => {
  it('creates a valid schema for graphql tests', () => {
    const built = buildSchema('type Query { hello: String }');
    expect(built.getQueryType()?.getFields().hello).toBeDefined();
  });
});
