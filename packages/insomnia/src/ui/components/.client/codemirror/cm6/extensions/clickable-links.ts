import type { Extension } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, MatchDecorator, ViewPlugin } from '@codemirror/view';
import { decode } from 'html-entities';

import { FLEXIBLE_URL_REGEX } from '~/common/constants';

import type { CodeMirrorLinkClickCallback } from '../types';

const linkDecorator = new MatchDecorator({
  regexp: new RegExp(FLEXIBLE_URL_REGEX.source, 'g'),
  decoration: Decoration.mark({ class: 'cm-clickable' }),
});

class ClickableLinksPlugin {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = linkDecorator.createDeco(view);
  }

  update(update: { docChanged: boolean; viewportChanged: boolean; view: EditorView }) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = linkDecorator.createDeco(update.view);
    }
  }
}

export const clickableLinksExtension = (handleClick?: CodeMirrorLinkClickCallback): Extension[] => {
  if (!handleClick) {
    return [];
  }

  return [
    ViewPlugin.fromClass(ClickableLinksPlugin, { decorations: value => value.decorations }),
    EditorView.domEventHandlers({
      mouseup(event, _view) {
        const target = event.target as HTMLElement;
        if (target?.classList.contains('cm-clickable')) {
          handleClick(decode(target.textContent ?? ''));
          return true;
        }
        return false;
      },
    }),
  ];
};
