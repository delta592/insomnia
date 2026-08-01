import { StreamLanguage } from '@codemirror/language';

const keyValueHeaders = [
  {
    regex: /^(> )([^:]*:)(.*)$/,
    token: ['curl-prefix curl-out', 'curl-out', 'curl-out curl-value'],
  },
  {
    regex: /^(< )([^:]*:)(.*)$/,
    token: ['curl-prefix curl-in', 'curl-in', 'curl-in curl-value'],
  },
];

const headerFields = [
  {
    regex: /^(> )([^:]+ .*)$/,
    token: ['curl-prefix curl-out curl-header', 'curl-out curl-header'],
  },
  {
    regex: /^(< )([^:]+ .*)$/,
    token: ['curl-prefix curl-in curl-header', 'curl-in curl-header'],
  },
];

const data = [
  {
    regex: /^(\| )(.*)$/,
    token: ['curl-prefix curl-data', 'curl-data'],
  },
];

const informationalText = [
  {
    regex: /^(\* )(.*)$/,
    token: ['curl-prefix curl-comment', 'curl-comment'],
  },
];

export const curlLanguage = StreamLanguage.define({
  startState: () => ({}),
  token(stream) {
    const rules = [...keyValueHeaders, ...headerFields, ...data, ...informationalText];
    for (const rule of rules) {
      if (stream.match(rule.regex, false)) {
        stream.match(rule.regex, true);
        const tokens = rule.token;
        if (Array.isArray(tokens)) {
          return tokens[Math.min(stream.start, tokens.length - 1)] ?? null;
        }
        return tokens;
      }
    }
    stream.next();
    return null;
  },
});
