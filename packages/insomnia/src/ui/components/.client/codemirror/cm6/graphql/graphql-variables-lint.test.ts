import jsonParse from 'codemirror-graphql/utils/jsonParse';
import { GraphQLInt, GraphQLNonNull, GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { describe, expect, it } from 'vitest';

describe('graphql-variables validation inputs', () => {
  const variableToType = {
    inputVar: new GraphQLNonNull(GraphQLInt),
    name: GraphQLString,
  };

  it('parses variables JSON for lint validation', () => {
    const ast = jsonParse('{"inputVar": 1, "name": "test"}') as { members: { key: { value: string } }[] };
    expect(ast.members).toHaveLength(2);
    expect(ast.members[0]?.key?.value).toBe('inputVar');
  });

  it('schema variable types are available for validation', () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          echoNum: {
            type: GraphQLString,
            args: {
              intVar: { type: new GraphQLNonNull(GraphQLInt) },
            },
          },
        },
      }),
    });
    void variableToType;
    expect(schema.getQueryType()?.getFields().echoNum).toBeDefined();
  });
});
