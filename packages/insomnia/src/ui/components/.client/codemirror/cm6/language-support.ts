import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { php } from '@codemirror/lang-php';
import { python } from '@codemirror/lang-python';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { StreamLanguage } from '@codemirror/language';
import { clojure } from '@codemirror/legacy-modes/mode/clojure';
import { go } from '@codemirror/legacy-modes/mode/go';
import { fSharp } from '@codemirror/legacy-modes/mode/mllike';
import { powerShell } from '@codemirror/legacy-modes/mode/powershell';
import { ruby } from '@codemirror/legacy-modes/mode/ruby';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { swift } from '@codemirror/legacy-modes/mode/swift';
import type { Extension } from '@codemirror/state';

import { graphqlLanguage } from './graphql/graphql-language';
import { graphqlVariablesLanguage } from './graphql/graphql-variables-language';
import { curlLanguage } from './languages/curl-language';
import { nunjucksHighlightExtension } from './languages/nunjucks-highlight';
import { openapiLanguage } from './languages/openapi-language';
import { normalizeMimeType } from './normalize-mime-type';
import type { EditorModeSpec } from './types';
import { isNunjucksModeSpec } from './types';

const legacyMode = (mode: Parameters<typeof StreamLanguage.define>[0]) => StreamLanguage.define(mode);

export const getLanguageExtensions = (mode?: EditorModeSpec): Extension[] => {
  const baseMode = isNunjucksModeSpec(mode) ? mode.baseMode : typeof mode === 'string' ? mode : undefined;
  const mime = normalizeMimeType(baseMode);
  const extensions: Extension[] = [];

  switch (mime) {
    case 'application/json': {
      extensions.push(json());
      break;
    }
    case 'application/xml': {
      extensions.push(xml());
      break;
    }
    case 'text/html': {
      extensions.push(html());
      break;
    }
    case 'yaml': {
      extensions.push(yaml());
      break;
    }
    case 'text/x-yaml': {
      extensions.push(yaml());
      break;
    }
    case 'text/x-openapi':
    case 'text/openapi':
    case 'openapi': {
      extensions.push(openapiLanguage);
      break;
    }
    case 'curl': {
      extensions.push(curlLanguage);
      break;
    }
    case 'graphql': {
      extensions.push(graphqlLanguage);
      break;
    }
    case 'graphql-variables': {
      extensions.push(graphqlVariablesLanguage);
      break;
    }
    case 'application/edn':
    case 'text/x-clojure': {
      extensions.push(legacyMode(clojure));
      break;
    }
    case 'text/javascript':
    case 'application/javascript': {
      extensions.push(javascript());
      break;
    }
    case 'text/css': {
      extensions.push(css());
      break;
    }
    case 'text/x-python': {
      extensions.push(python());
      break;
    }
    case 'text/x-markdown':
    case 'markdown': {
      extensions.push(markdown());
      break;
    }
    case 'text/x-php': {
      extensions.push(php());
      break;
    }
    case 'text/x-sh':
    case 'text/x-shell': {
      extensions.push(legacyMode(shell));
      break;
    }
    case 'text/x-go': {
      extensions.push(legacyMode(go));
      break;
    }
    case 'text/x-ruby': {
      extensions.push(legacyMode(ruby));
      break;
    }
    case 'text/x-swift': {
      extensions.push(legacyMode(swift));
      break;
    }
    case 'text/x-powershell': {
      extensions.push(legacyMode(powerShell));
      break;
    }
    case 'text/x-kotlin': {
      extensions.push(legacyMode(fSharp));
      break;
    }
    default: {
      if (mime.includes('html')) {
        extensions.push(html());
      } else if (mime.includes('javascript') || mime === 'application/typescript') {
        extensions.push(javascript({ typescript: mime.includes('typescript') }));
      }
      break;
    }
  }

  if (isNunjucksModeSpec(mode)) {
    extensions.push(nunjucksHighlightExtension);
  }

  return extensions;
};
