import getTypeInfo from 'codemirror-graphql/utils/getTypeInfo';
import {
  getArgumentReference,
  getDirectiveReference,
  getEnumValueReference,
  getFieldReference,
  getTypeReference,
  type SchemaReference,
} from 'codemirror-graphql/utils/SchemaReference';
import { GraphQLList, type GraphQLNamedType,GraphQLNonNull } from 'graphql';

import type { GraphQLInfoOptions } from './types';

interface TypeInfoLike {
  fieldDef?: { name?: string; description?: string | null; deprecationReason?: string | null };
  directiveDef?: { name?: string; description?: string | null; deprecationReason?: string | null };
  argDef?: { name?: string; description?: string | null; deprecationReason?: string | null };
  enumValue?: { name?: string; description?: string | null; deprecationReason?: string | null };
  type?: GraphQLNamedType | null;
  inputType?: GraphQLNamedType | null;
}

function text(
  into: HTMLElement,
  content: string,
  className = '',
  options: GraphQLInfoOptions = {},
  ref: SchemaReference | null = null,
) {
  if (className) {
    const { onClick } = options;
    let node: HTMLElement;
    if (onClick) {
      const anchor = document.createElement('a');
      anchor.href = 'javascript:void 0';
      anchor.addEventListener('click', e => {
        e.preventDefault();
        onClick(ref ?? undefined, e);
      });
      node = anchor;
    } else {
      node = document.createElement('span');
    }
    node.className = className;
    node.append(document.createTextNode(content));
    into.append(node);
  } else {
    into.append(document.createTextNode(content));
  }
}

function renderType(into: HTMLElement, typeInfo: TypeInfoLike, options: GraphQLInfoOptions, t: GraphQLNamedType | null | undefined) {
  if (t instanceof GraphQLNonNull) {
    renderType(into, typeInfo, options, t.ofType);
    text(into, '!');
  } else if (t instanceof GraphQLList) {
    text(into, '[');
    renderType(into, typeInfo, options, t.ofType);
    text(into, ']');
  } else {
    text(into, t?.name || '', 'type-name', options, getTypeReference(typeInfo as never, t as never));
  }
}

function renderTypeAnnotation(into: HTMLElement, typeInfo: TypeInfoLike, options: GraphQLInfoOptions, t: GraphQLNamedType | null | undefined) {
  const typeSpan = document.createElement('span');
  typeSpan.className = 'type-name-pill';
  if (t instanceof GraphQLNonNull) {
    renderType(typeSpan, typeInfo, options, t.ofType);
    text(typeSpan, '!');
  } else if (t instanceof GraphQLList) {
    text(typeSpan, '[');
    renderType(typeSpan, typeInfo, options, t.ofType);
    text(typeSpan, ']');
  } else {
    text(typeSpan, t?.name || '', 'type-name', options, getTypeReference(typeInfo as never, t as never));
  }
  into.append(typeSpan);
}

function renderDescription(
  into: HTMLElement,
  options: GraphQLInfoOptions,
  def: { description?: string | null; deprecationReason?: string | null },
) {
  const { description } = def;
  if (description) {
    const descriptionDiv = document.createElement('div');
    descriptionDiv.className = 'info-description';
    if (options.renderDescription) {
      descriptionDiv.innerHTML = options.renderDescription(description);
    } else {
      descriptionDiv.append(document.createTextNode(description));
    }
    into.append(descriptionDiv);
  }

  const reason = def.deprecationReason;
  if (reason) {
    const deprecationDiv = document.createElement('div');
    deprecationDiv.className = 'info-deprecation';
    into.append(deprecationDiv);
    const label = document.createElement('span');
    label.className = 'info-deprecation-label';
    label.append(document.createTextNode('Deprecated'));
    deprecationDiv.append(label);
    const reasonDiv = document.createElement('div');
    reasonDiv.className = 'info-deprecation-reason';
    if (options.renderDescription) {
      reasonDiv.innerHTML = options.renderDescription(reason);
    } else {
      reasonDiv.append(document.createTextNode(reason));
    }
    deprecationDiv.append(reasonDiv);
  }
}

function renderField(into: HTMLElement, typeInfo: TypeInfoLike, options: GraphQLInfoOptions) {
  text(into, typeInfo.fieldDef?.name || '', 'field-name', options, getFieldReference(typeInfo as never));
  renderTypeAnnotation(into, typeInfo, options, typeInfo.type);
}

function renderDirective(into: HTMLElement, typeInfo: TypeInfoLike, options: GraphQLInfoOptions) {
  text(into, '@' + (typeInfo.directiveDef?.name || ''), 'directive-name', options, getDirectiveReference(typeInfo as never));
}

function renderArg(into: HTMLElement, typeInfo: TypeInfoLike, options: GraphQLInfoOptions) {
  text(into, typeInfo.argDef?.name || '', 'arg-name', options, getArgumentReference(typeInfo as never));
  renderTypeAnnotation(into, typeInfo, options, typeInfo.inputType);
}

function renderEnumValue(into: HTMLElement, typeInfo: TypeInfoLike, options: GraphQLInfoOptions) {
  renderType(into, typeInfo, options, typeInfo.inputType);
  text(into, '.');
  text(into, typeInfo.enumValue?.name || '', 'enum-value', options, getEnumValueReference(typeInfo as never));
}

export const renderGraphQLInfo = (tokenState: Record<string, unknown>, options: GraphQLInfoOptions): HTMLElement | null => {
  if (!options.schema || !tokenState) {
    return null;
  }

  const { kind, step } = tokenState as { kind?: string; step?: number };
  const typeInfo = getTypeInfo(options.schema, tokenState as never) as TypeInfoLike;

  if (
    ((kind === 'Field' || kind === 'ObjectField') && step === 0 && typeInfo.fieldDef) ||
    (kind === 'AliasedField' && step === 2 && typeInfo.fieldDef)
  ) {
    const header = document.createElement('div');
    header.className = 'CodeMirror-info-header';
    renderField(header, typeInfo, options);
    const into = document.createElement('div');
    into.append(header);
    renderDescription(into, options, typeInfo.fieldDef);
    return into;
  }

  if (kind === 'Directive' && step === 1 && typeInfo.directiveDef) {
    const header = document.createElement('div');
    header.className = 'CodeMirror-info-header';
    renderDirective(header, typeInfo, options);
    const into = document.createElement('div');
    into.append(header);
    renderDescription(into, options, typeInfo.directiveDef);
    return into;
  }

  if (kind === 'Argument' && step === 0 && typeInfo.argDef) {
    const header = document.createElement('div');
    header.className = 'CodeMirror-info-header';
    renderArg(header, typeInfo, options);
    const into = document.createElement('div');
    into.append(header);
    renderDescription(into, options, typeInfo.argDef);
    return into;
  }

  if (kind === 'EnumValue' && typeInfo.enumValue?.description) {
    const header = document.createElement('div');
    header.className = 'CodeMirror-info-header';
    renderEnumValue(header, typeInfo, options);
    const into = document.createElement('div');
    into.append(header);
    renderDescription(into, options, typeInfo.enumValue);
    return into;
  }

  if (kind === 'NamedType' && typeInfo.type?.description) {
    const header = document.createElement('div');
    header.className = 'CodeMirror-info-header';
    renderType(header, typeInfo, options, typeInfo.type);
    const into = document.createElement('div');
    into.append(header);
    renderDescription(into, options, typeInfo.type);
    return into;
  }

  return null;
};
