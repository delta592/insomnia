import { autocompletion, type Completion, type CompletionContext, type CompletionSource,startCompletion } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { getPlatformKeyCombinations } from 'insomnia-data/common';

import { escapeRegex } from '~/common/misc';
import { getDefaultFill } from '~/common/templating/utils';

import type { AutocompleteNamedItem, EnvironmentAutocompleteConfig } from '../types';

const NAME_MATCH_FLEXIBLE = /[\w.\][\-/]+$/;
const NAME_MATCH = /[\w.\][]+$/;
const AFTER_VARIABLE_MATCH = /{{\s*[\w.\][]*$/;
const AFTER_TAG_MATCH = /{%\s*[\w.\][]*$/;
const MAX_HINT_LOOK_BACK = 100;

const TYPE_VARIABLE = 'variable';
const TYPE_TAG = 'tag';
const TYPE_CONSTANT = 'constant';
const TYPE_SNIPPET = 'snippet';

const ICONS: Record<string, { char: string; title: string }> = {
  [TYPE_CONSTANT]: { char: '𝒄', title: 'Constant' },
  [TYPE_SNIPPET]: { char: '§', title: 'Snippet' },
  [TYPE_VARIABLE]: { char: '𝑥', title: 'Environment Variable' },
  [TYPE_TAG]: { char: 'ƒ', title: 'Generator Tag' },
};

interface CompletionItem extends AutocompleteNamedItem {
  type: string;
  text?: string;
}

const getCompletionHints = (list: CompletionItem[], segment: string, type: string, max: number): Completion[] => {
  if (max === 0) {
    return [];
  }
  const re = new RegExp('^' + escapeRegex(segment), 'i');
  return list
    .filter(item => re.test(item.name))
    .slice(0, max > 0 ? max : undefined)
    .map(item => ({
      label: item.displayName || item.name,
      detail: ICONS[type]?.title,
      type,
      apply: item.name,
      info: item.displayValue,
    }));
};

const createCompletionSource = (options: EnvironmentAutocompleteConfig): CompletionSource => {
  return async (context: CompletionContext) => {
    const { state, pos } = context;
    const lookback = Math.max(0, pos - MAX_HINT_LOOK_BACK);
    const previousText = state.sliceDoc(lookback, pos);

    const constants = options.getConstants ? await options.getConstants() : [];
    const variables = options.getVariables ? await options.getVariables() : [];
    const snippets = options.getSnippets ? await options.getSnippets() : [];
    const tags = options.getTags ? await options.getTags() : [];

    const variablesToMatch: CompletionItem[] = variables.map(v => ({ ...v, type: TYPE_VARIABLE }));
    const snippetsToMatch: CompletionItem[] = snippets.map(v => ({ ...v, type: TYPE_SNIPPET }));
    const tagsToMatch: CompletionItem[] = tags.map(v => ({ ...v, type: TYPE_TAG }));
    const constantsToMatch: CompletionItem[] = constants.map(s => ({
      name: s,
      value: s,
      displayValue: '',
      type: TYPE_CONSTANT,
    }));

    const isInVariable = previousText.match(AFTER_VARIABLE_MATCH);
    const isInTag = previousText.match(AFTER_TAG_MATCH);
    const isInNothing = !isInVariable && !isInTag;
    const allowMatchingVariables = isInNothing || isInVariable;
    const allowMatchingTags = isInNothing || isInTag;
    const allowMatchingConstants = isInNothing;

    const nameMatch = previousText.match(NAME_MATCH);
    const nameMatchLong = previousText.match(NAME_MATCH_FLEXIBLE);
    const nameSegment = nameMatch ? nameMatch[0] : '';
    const nameSegmentLong = nameMatchLong ? nameMatchLong[0] : '';
    const nameSegmentFull = previousText;

    let matches: Completion[] = [];

    if (allowMatchingVariables) {
      matches = [
        ...matches,
        ...getCompletionHints(variablesToMatch, nameSegmentLong || nameSegment, TYPE_VARIABLE, -1),
      ];
    }

    if (allowMatchingConstants) {
      matches = [...matches, ...getCompletionHints(constantsToMatch, nameSegmentFull, TYPE_CONSTANT, -1)];
    }

    if (allowMatchingTags) {
      matches = [
        ...matches,
        ...getCompletionHints(tagsToMatch, nameSegmentLong || nameSegment, TYPE_TAG, -1),
      ];
    }

    matches = [...matches, ...getCompletionHints(snippetsToMatch, nameSegment, TYPE_SNIPPET, -1)];

    const segment = nameSegmentLong || nameSegment;
    if (!segment && !context.explicit) {
      return null;
    }

    const uniqueMatches = matches.reduce((arr, v) => (arr.find(a => a.label === v.label) ? arr : [...arr, v]), [] as Completion[]);

    if (!uniqueMatches.length && !context.explicit) {
      return null;
    }

    return {
      from: pos - segment.length,
      to: pos,
      options: uniqueMatches,
    };
  };
};

export const environmentAutocompleteExtension = (options: EnvironmentAutocompleteConfig | false | null): Extension[] => {
  if (!options) {
    return [];
  }

  const extensions: Extension[] = [
    autocompletion({
      override: [createCompletionSource(options)],
      activateOnTyping: true,
      maxRenderedOptions: 50,
    }),
  ];

  if (options.hotKeyRegistry?.showAutocomplete) {
    const keyCombs = getPlatformKeyCombinations(options.hotKeyRegistry.showAutocomplete as never);
    for (const keyComb of keyCombs) {
      const key = [
        keyComb.shift ? 'Shift-' : '',
        keyComb.meta ? 'Mod-' : '',
        keyComb.ctrl ? 'Ctrl-' : '',
        keyComb.alt ? 'Alt-' : '',
      ].join('');
      extensions.push(
        keymap.of([
          {
            key,
            run: view => startCompletion(view),
          },
        ]),
      );
    }
  }

  return extensions;
};

export { getDefaultFill };
