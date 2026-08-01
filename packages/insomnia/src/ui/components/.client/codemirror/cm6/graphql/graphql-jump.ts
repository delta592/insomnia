import type { Extension } from '@codemirror/state';
import type { EditorView} from '@codemirror/view';
import { Decoration, type DecorationSet, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import getTypeInfo from 'codemirror-graphql/utils/getTypeInfo';
import {
  getArgumentReference,
  getDirectiveReference,
  getEnumValueReference,
  getFieldReference,
  getTypeReference,
  type SchemaReference,
} from 'codemirror-graphql/utils/SchemaReference';

import { getGraphQLTokenAt, getGraphQLTokens } from './get-graphql-token-at';
import type { GraphQLJumpOptions } from './types';

const jumpMark = Decoration.mark({ class: 'CodeMirror-jump-token' });

const getJumpReference = (tokenState: Record<string, unknown>, schema: GraphQLJumpOptions['schema']): SchemaReference | null => {
  if (!schema || !tokenState) {
    return null;
  }

  const { kind, step } = tokenState as { kind?: string; step?: number };
  const typeInfo = getTypeInfo(schema, tokenState as never);

  if (
    ((kind === 'Field' || kind === 'AliasedField') && step === 0 && typeInfo.fieldDef) ||
    (kind === 'AliasedField' && step === 2 && typeInfo.fieldDef)
  ) {
    return getFieldReference(typeInfo);
  }
  if (kind === 'Directive' && step === 1 && typeInfo.directiveDef) {
    return getDirectiveReference(typeInfo);
  }
  if (kind === 'Argument' && step === 0 && typeInfo.argDef) {
    return getArgumentReference(typeInfo);
  }
  if (kind === 'EnumValue' && typeInfo.enumValue) {
    return getEnumValueReference(typeInfo);
  }
  if (kind === 'NamedType' && typeInfo.type) {
    return getTypeReference(typeInfo, typeInfo.type as never);
  }

  return null;
};

const buildJumpDecorations = (view: EditorView, options: GraphQLJumpOptions): DecorationSet => {
  if (!options.schema || !options.onClick) {
    return Decoration.none;
  }

  const doc = view.state.doc.toString();
  const decorations: ReturnType<typeof jumpMark.range>[] = [];

  for (const token of getGraphQLTokens(doc)) {
    const reference = getJumpReference(token.state, options.schema);
    if (reference && token.end > token.start) {
      decorations.push(jumpMark.range(token.start, token.end));
    }
  }

  return Decoration.set(decorations, true);
};

export const graphqlJumpExtension = (options: GraphQLJumpOptions = {}): Extension[] => {
  if (!options.schema || !options.onClick) {
    return [];
  }

  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildJumpDecorations(view, options);
      }

      update(update: ViewUpdate) {
        if (update.docChanged) {
          this.decorations = buildJumpDecorations(update.view, options);
        }
      }
    },
    {
      decorations: v => v.decorations,
      eventHandlers: {
        mousedown(event, view) {
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
          if (pos == null) {
            return false;
          }

          const token = getGraphQLTokenAt(view.state.doc.toString(), pos);
          if (!token) {
            return false;
          }

          const reference = getJumpReference(token.state, options.schema);
          if (reference && options.onClick) {
            options.onClick(reference, event);
            return true;
          }

          return false;
        },
      },
    },
  );

  return [plugin];
};
