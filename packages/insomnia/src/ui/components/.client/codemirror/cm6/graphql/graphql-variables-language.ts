import { StreamLanguage } from '@codemirror/language';
import { list, onlineParser, opt, p, t } from 'graphql-language-service';

const LexRules = {
  Punctuation: /^\[|]|\{|\}|:|,/,
  Number: /^-?(?:0|(?:[1-9][0-9]*))(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?/,
  String: /^"(?:[^"\\]|\\(?:"|\/|\\|b|f|n|r|t|u[0-9a-fA-F]{4}))*"?/,
  Keyword: /^true|false|null/,
};

const ParseRules = {
  Document: [p('{'), list('Variable', opt(p(','))), p('}')],
  Variable: [namedKey('variable'), p(':'), 'Value'],
  Value(token: { kind: string; value: string }) {
    switch (token.kind) {
      case 'Number': {
        return 'NumberValue';
      }
      case 'String': {
        return 'StringValue';
      }
      case 'Punctuation': {
        switch (token.value) {
          case '[': {
            return 'ListValue';
          }
          case '{': {
            return 'ObjectValue';
          }
          default: {
            return null;
          }
        }
      }
      case 'Keyword': {
        switch (token.value) {
          case 'true':
          case 'false': {
            return 'BooleanValue';
          }
          case 'null': {
            return 'NullValue';
          }
          default: {
            return null;
          }
        }
      }
      default: {
        return null;
      }
    }
  },
  NumberValue: [t('Number', 'number')],
  StringValue: [t('String', 'string')],
  BooleanValue: [t('Keyword', 'builtin')],
  NullValue: [t('Keyword', 'keyword')],
  ListValue: [p('['), list('Value', opt(p(','))), p(']')],
  ObjectValue: [p('{'), list('ObjectField', opt(p(','))), p('}')],
  ObjectField: [namedKey('attribute'), p(':'), 'Value'],
} as never;

function namedKey(style: string) {
  return {
    style,
    match: (token: { kind: string }) => token.kind === 'String',
    update(state: { name?: string | null }, token: { value: string }) {
      state.name = token.value.slice(1, -1);
    },
  };
}

const parser = onlineParser({
  eatWhitespace: stream => stream.eatSpace(),
  lexRules: LexRules,
  parseRules: ParseRules,
  editorConfig: { tabSize: 2 },
});

export const graphqlVariablesLanguage = StreamLanguage.define({
  startState: parser.startState,
  token: parser.token as never,
  languageData: {
    closeBrackets: { brackets: ['[', ']', '{', '}', '"'] },
  },
});
