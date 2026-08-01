import { autocompletion, type Completion, type CompletionContext, type CompletionSource } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';

import { escapeRegex } from '~/common/misc';

const TYPE_CONSTANT = 'constant';

const getCompletionHints = (constants: string[], segment: string, max: number): Completion[] => {
  if (max === 0) {
    return [];
  }
  const re = new RegExp('^' + escapeRegex(segment), 'i');
  return constants
    .filter(name => re.test(name))
    .slice(0, max > 0 ? max : undefined)
    .map(name => ({
      label: name,
      type: TYPE_CONSTANT,
      apply: name,
    }));
};

export const graphqlVariablesAutocompleteExtension = (getConstants?: () => string[] | PromiseLike<string[]>): Extension[] => {
  if (!getConstants) {
    return [];
  }

  const source: CompletionSource = async (context: CompletionContext) => {
    const constants = await getConstants();
    if (!constants.length) {
      return null;
    }

    const { state, pos } = context;
    const line = state.doc.lineAt(pos);
    const before = state.sliceDoc(line.from, pos);

    const inKey =
      /"\s*$/.test(before) ||
      /^\s*$/.test(before) ||
      /[{,]\s*$/.test(before) ||
      /:\s*$/.test(before) === false;

    const keyMatch = before.match(/"([^"]*)$/);
    const segment = keyMatch?.[1] ?? before.replace(/^[\s{,]*/, '');

    if (!inKey && !keyMatch && !context.explicit) {
      return null;
    }

    const hints = getCompletionHints(constants, segment, -1).map(hint => ({
      ...hint,
      apply: keyMatch ? hint.apply : `"${hint.label}": `,
    }));

    if (!hints.length && !context.explicit) {
      return null;
    }

    const from = keyMatch ? pos - (keyMatch[1]?.length ?? 0) : pos - segment.length;

    return {
      from: Math.max(line.from, from),
      to: pos,
      options: hints,
    };
  };

  return [
    autocompletion({
      override: [source],
      activateOnTyping: true,
    }),
  ];
};
