import type { EditorView } from '@codemirror/view';

import type { NunjucksParsedTag, NunjucksParsedTagArg } from '~/common/templating/types';
import { base64ToUtf8, utf8ToBase64 } from '~/common/utils/utf8-bytes';
import type { MarkerRange } from '~/ui/components/.client/codemirror/cm6/types';

import { tokenizeArgs } from './tokenize-args';
export { tokenizeArgs };
import objectPath from './third_party/object-path';

/**
 * Get list of paths to all primitive types in nested object
 * @param {object} obj - object to analyse
 * @param {String} [prefix] - base path to prefix to all paths
 * @returns {Array} - list of paths
 */
export function getKeys(obj: any, prefix = ''): { name: string; value: any }[] {
  let allKeys: { name: string; value: any }[] = [];
  const typeOfObj = Object.prototype.toString.call(obj);

  if (typeOfObj === '[object Array]') {
    for (const [i, element] of obj.entries()) {
      allKeys = [...allKeys, ...getKeys(element, forceBracketNotation(prefix, i))];
    }
  } else if (typeOfObj === '[object Object]') {
    const keys = Object.keys(obj);

    for (const key of keys) {
      allKeys = [...allKeys, ...getKeys(obj[key], forceBracketNotation(prefix, key))];
    }
  } else if (typeOfObj === '[object Function]') {
    // Ignore functions
  } else if (prefix) {
    allKeys.push({
      name: normalizeToDotAndBracketNotation(prefix),
      value: obj,
    });
  }

  return allKeys;
}

export function forceBracketNotation(prefix: string, key: string | number) {
  // Prefix is already in bracket notation because getKeys is recursive
  return `${prefix}${objectPath.stringify([key], "'", true)}`;
}

export function normalizeToDotAndBracketNotation(prefix: string) {
  return objectPath.normalize(prefix);
}

/**
 * Parse a Liquid template tag string into a usable object
 * @param {string} tagStr - the template string for the tag
 */
export function tokenizeTag(tagStr: string) {
  const withoutEnds = tagStr.trim().replace(/^{%/, '').replace(/%}$/, '').trim();
  const nameMatch = withoutEnds.match(/^[a-zA-Z_$][0-9a-zA-Z_$]*/);
  const name = nameMatch ? nameMatch[0] : withoutEnds;
  const argsStr = withoutEnds.slice(name.length);

  const parsedTag: NunjucksParsedTag = {
    name,
    args: tokenizeArgs(argsStr),
  };
  return parsedTag;
}

/** Convert a tokenized tag back into a Liquid template string */
export function unTokenizeTag(tagData: NunjucksParsedTag) {
  const args: string[] = [];

  for (const arg of tagData.args) {
    if (['string', 'model', 'file', 'enum'].includes(arg.type)) {
      const q = arg.quotedBy || "'";
      const re = new RegExp(`([^\\\\])${q}`, 'g');
      const str = arg.value?.toString().replace(re, `$1\\${q}`);
      args.push(`${q}${str}${q}`);
    } else if (arg.type === 'boolean') {
      args.push(arg.value ? 'true' : 'false');
    } else {
      // @ts-expect-error -- TSCONVERSION
      args.push(arg.value);
    }
  }

  const argsStr = args.join(', ');
  return `{% ${tagData.name} ${argsStr} %}`;
}

/** Get the default Liquid template string for an extension */
export function getDefaultFill(name: string, args: NunjucksParsedTagArg[]) {
  const stringArgs: string[] = (args || []).map(argDefinition => {
    if (argDefinition.type === 'enum') {
      const { defaultValue, options } = argDefinition;
      const fallback = options && options.length ? options[0].value : '';
      const value = defaultValue !== undefined ? String(defaultValue) : String(fallback);
      return `'${value}'`;
    }
    if (argDefinition.type === 'number') {
      return `${Number.parseFloat(argDefinition.defaultValue + '') || 0}`;
    }
    if (argDefinition.type === 'boolean') {
      return argDefinition.defaultValue ? 'true' : 'false';
    }
    if (argDefinition.type === 'string' || argDefinition.type === 'file' || argDefinition.type === 'model') {
      return `'${(argDefinition.defaultValue as any) || ''}'`;
    }
    return "''";
  });
  return `${name} ${stringArgs.join(', ')}`;
}

export function encodeEncoding<T>(value: T, encoding?: 'base64') {
  if (typeof value !== 'string') {
    return value;
  }

  if (value.length === 0) {
    return value;
  }

  if (encoding === 'base64') {
    const encodedValue = utf8ToBase64(value);
    return `b64::${encodedValue}::46b`;
  }

  return value;
}

export function decodeEncoding<T>(value: T) {
  if (typeof value !== 'string') {
    return value;
  }

  const results = value.match(/^b64::(.+)::46b$/);

  if (results) {
    return base64ToUtf8(results[1]);
  }

  return value;
}

export function extractNunjucksTagFromCoords(
  coordinates: { left: number; top: number },
  cm: React.RefObject<unknown>,
): { range: MarkerRange; template: string } | void {
  const editor = cm?.current;
  if (!editor || typeof editor !== 'object') {
    return;
  }

  if ('coordsChar' in editor && typeof editor.coordsChar === 'function' && 'getDoc' in editor && typeof editor.getDoc === 'function') {
    const legacyEditor = editor as CodeMirrorLegacyEditor;
    const textMarkerPos = legacyEditor.coordsChar(coordinates);
    const textMarker = legacyEditor.getDoc().findMarksAt(textMarkerPos)[0];
    if (textMarker) {
      const range = textMarker.find() as MarkerRange;
      return {
        range,
        template: (textMarker as { __template?: string }).__template || '',
      };
    }
    return;
  }

  const view = editor as EditorView;
  const pos = view.posAtCoords({ x: coordinates.left, y: coordinates.top });
  if (pos == null) {
    return;
  }
  const target = globalThis.document?.elementFromPoint(coordinates.left, coordinates.top) as HTMLElement | null;
  const tagEl = target?.closest('[data-nunjucks-tag]') as HTMLElement | null;
  if (tagEl?.dataset.template) {
    return {
      range: {},
      template: tagEl.dataset.template,
    };
  }
}

interface CodeMirrorLegacyEditor {
  coordsChar: (coordinates: { left: number; top: number }) => unknown;
  getDoc: () => {
    findMarksAt: (pos: unknown) => { find: () => MarkerRange; __template?: string }[];
  };
}

export const responseTagRegex = new RegExp('{% *response *.* %}');
