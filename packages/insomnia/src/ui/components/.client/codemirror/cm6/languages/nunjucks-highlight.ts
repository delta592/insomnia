import type { EditorView} from '@codemirror/view';
import { Decoration, type DecorationSet, MatchDecorator, ViewPlugin } from '@codemirror/view';

const regexVariable = /^{{\s*([^ }]+)\s*[^}]*\s*}}/;
const regexTag = /^{%\s*([^ }]+)\s*[^%]*\s*%}/;
const regexComment = /^{#\s*[^#]+\s*#}/;

const nunjucksDecorator = new MatchDecorator({
  regexp: /(\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}|\{#[\s\S]*?#\})/g,
  decoration: match => {
    const text = match[0];
    if (regexTag.test(text)) {
      return Decoration.mark({ class: 'cm-nunjucks-tag' });
    }
    if (regexVariable.test(text)) {
      return Decoration.mark({ class: 'cm-nunjucks-variable' });
    }
    if (regexComment.test(text)) {
      return Decoration.mark({ class: 'cm-nunjucks-comment' });
    }
    return Decoration.mark({ class: 'cm-nunjucks-variable' });
  },
});

class NunjucksHighlightPlugin {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = nunjucksDecorator.createDeco(view);
  }

  update(update: { docChanged: boolean; viewportChanged: boolean; view: EditorView }) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = nunjucksDecorator.createDeco(update.view);
    }
  }
}

export const nunjucksHighlightExtension = ViewPlugin.fromClass(NunjucksHighlightPlugin, {
  decorations: value => value.decorations,
});

export const isNunjucksToken = (text: string) =>
  regexVariable.test(text) || regexTag.test(text) || regexComment.test(text);

export { regexTag, regexVariable, regexComment };
