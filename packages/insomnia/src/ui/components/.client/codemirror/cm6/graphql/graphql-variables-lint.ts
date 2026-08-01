import { type Diagnostic,linter } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import jsonParse, { JSONSyntaxError } from 'codemirror-graphql/utils/jsonParse';
import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  type GraphQLInputType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
} from 'graphql';

import type { GraphQLVariablesLintOptions } from './types';

interface JsonNode {
  kind: string;
  start: number;
  end: number;
  value?: unknown;
  key?: JsonNode;
  members?: JsonNode[];
  values?: JsonNode[];
}

function mapCat<T, U>(array: T[], mapper: (item: T) => U[]): U[] {
  return array.flatMap(mapper);
}

function isNullish(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'number' && value !== value);
}

function validateValue(type: GraphQLInputType | undefined, valueAST: JsonNode): [JsonNode, string][] {
  if (!type || !valueAST) {
    return [];
  }

  if (type instanceof GraphQLNonNull) {
    if (valueAST.kind === 'Null') {
      return [[valueAST, `Type "${type}" is non-nullable and cannot be null.`]];
    }
    return validateValue(type.ofType, valueAST);
  }

  if (valueAST.kind === 'Null') {
    return [];
  }

  if (type instanceof GraphQLList) {
    const itemType = type.ofType;
    if (valueAST.kind === 'Array') {
      return mapCat(valueAST.values || [], item => validateValue(itemType, item));
    }
    return validateValue(itemType, valueAST);
  }

  if (type instanceof GraphQLInputObjectType) {
    if (valueAST.kind !== 'Object') {
      return [[valueAST, `Type "${type}" must be an Object.`]];
    }

    const providedFields: Record<string, boolean> = {};
    const fieldErrors = mapCat(valueAST.members || [], member => {
      const fieldName = member.key?.value as string | undefined;
      if (fieldName) {
        providedFields[fieldName] = true;
      }
      const inputField = fieldName ? type.getFields()[fieldName] : undefined;
      if (!inputField) {
        return [[member.key!, `Type "${type}" does not have a field "${fieldName}".`]] as [JsonNode, string][];
      }
      return validateValue(inputField.type, member);
    });

    for (const fieldName of Object.keys(type.getFields())) {
      const field = type.getFields()[fieldName];
      if (!providedFields[fieldName] && field.type instanceof GraphQLNonNull && field.defaultValue === undefined) {
        fieldErrors.push([valueAST, `Object of type "${type}" is missing required field "${fieldName}".`]);
      }
    }

    return fieldErrors;
  }

  if (
    (type.name === 'Boolean' && valueAST.kind !== 'Boolean') ||
    (type.name === 'String' && valueAST.kind !== 'String') ||
    (type.name === 'ID' && valueAST.kind !== 'Number' && valueAST.kind !== 'String') ||
    (type.name === 'Float' && valueAST.kind !== 'Number') ||
    (type.name === 'Int' && (valueAST.kind !== 'Number' || (valueAST.value as number) !== ((valueAST.value as number) | 0)))
  ) {
    return [[valueAST, `Expected value of type "${type}".`]];
  }

  if (
    (type instanceof GraphQLEnumType || type instanceof GraphQLScalarType) &&
    ((valueAST.kind !== 'String' && valueAST.kind !== 'Number' && valueAST.kind !== 'Boolean' && valueAST.kind !== 'Null') ||
      isNullish(type.parseValue(valueAST.value)))
  ) {
    return [[valueAST, `Expected value of type "${type}".`]];
  }

  return [];
}

function validateVariables(variableToType: Record<string, GraphQLInputType>, variablesAST: JsonNode): Diagnostic[] {
  const errors: Diagnostic[] = [];

  for (const member of variablesAST.members || []) {
    if (!member) {
      continue;
    }
    const variableName = member.key?.value as string | undefined;
    const type = variableName ? variableToType[variableName] : undefined;
    if (type) {
      for (const [node, message] of validateValue(type, member)) {
        errors.push({
          from: node.start,
          to: node.end,
          message,
          severity: 'error',
        });
      }
    } else if (variableName && member.key) {
      errors.push({
        from: member.key.start,
        to: member.key.end,
        message: `Variable "$${variableName}" does not appear in any GraphQL query.`,
        severity: 'error',
      });
    }
  }

  return errors;
}

export const graphqlVariablesLintExtension = (options: GraphQLVariablesLintOptions = {}): Extension =>
  linter(view => {
    const text = view.state.doc.toString();
    if (!text) {
      return [];
    }

    let ast: JsonNode;
    try {
      ast = jsonParse(text) as JsonNode;
    } catch (error) {
      if (error instanceof JSONSyntaxError) {
        const node = error.position as JsonNode;
        return [
          {
            from: node.start,
            to: node.end,
            message: error.message,
            severity: 'error',
          },
        ];
      }
      throw error;
    }

    const { variableToType } = options;
    if (!variableToType) {
      return [];
    }

    return validateVariables(variableToType, ast);
  });
