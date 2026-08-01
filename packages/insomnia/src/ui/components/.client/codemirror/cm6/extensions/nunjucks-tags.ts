import type { Extension } from '@codemirror/state';
import type { EditorView} from '@codemirror/view';
import { Decoration, ViewPlugin, WidgetType } from '@codemirror/view';

import * as misc from '~/common/misc';
import type { HandleRender, RenderContextAndKeys } from '~/common/templating/types';
import { tokenizeTag } from '~/common/templating/utils';
import { showModal } from '~/ui/components/modals/index';
import { NunjucksModal } from '~/ui/components/modals/nunjucks-modal';
import { getTagDefinitions } from '~/ui/templating/renderer-safe';

import { regexComment,regexTag, regexVariable } from '../languages/nunjucks-highlight';

class NunjucksWidget extends WidgetType {
  constructor(
    readonly template: string,
    readonly tokenType: string,
    readonly readOnly: boolean,
    readonly editorId: string,
    readonly render: HandleRender,
    readonly renderContext: (contextCacheKey?: string) => Promise<RenderContextAndKeys>,
    readonly showVariableSourceAndValue: boolean,
  ) {
    super();
  }

  eq(other: NunjucksWidget) {
    return other.template === this.template && other.tokenType === this.tokenType;
  }

  toDOM(view: EditorView) {
    const el = document.createElement('span');
    el.className = `nunjucks-tag ${this.tokenType}`;
    el.dataset.nunjucksTag = 'true';
    el.dataset.template = this.template;
    el.dataset.error = 'off';
    el.replaceChildren(document.createElement('label'), document.createTextNode(this.template));

    void updateElementText(
      el,
      this.render,
      this.template,
      this.renderContext,
      this.showVariableSourceAndValue,
    );

    el.addEventListener('mouseenter', () => {
      void updateElementText(el, this.render, this.template, this.renderContext, this.showVariableSourceAndValue);
    });

    if (!this.readOnly) {
      el.addEventListener('click', () => {
        showModal(NunjucksModal, {
          template: this.template,
          editorId: this.editorId,
          onDone: (template: string | null) => {
            if (!template) {
              return;
            }
            const pos = view.posAtDOM(el);
            if (pos == null) {
              return;
            }
            const from = pos;
            const to = from + this.template.length;
            view.dispatch({ changes: { from, to, insert: template } });
          },
        });
      });
    }

    return el;
  }

  ignoreEvent() {
    return false;
  }
}

async function updateElementText(
  el: HTMLElement,
  render: HandleRender,
  text: string,
  renderContext: (contextCacheKey?: string) => Promise<RenderContextAndKeys>,
  showVariableSourceAndValue: boolean,
) {
  let innerHTML = text;
  let title = '';
  let dataIgnore = '';
  let dataError = 'off';
  const str = text.replace(/\\/g, '');
  const tagMatch = str.match(/{% *([^ ]+) *.*%}/);
  const cleanedStr = str.replace(/^{%/, '').replace(/%}$/, '').replace(/^{{/, '').replace(/}}$/, '').trim();

  try {
    if (tagMatch) {
      const tagData = tokenizeTag(str);
      const tagDefinition = (await getTagDefinitions()).find((d: { name: string }) => d.name === tagData.name);
      if (tagDefinition) {
        const liveDisplayName = tagDefinition.liveDisplayName(tagData.args);
        const firstArg = tagDefinition.args[0];
        if (liveDisplayName) {
          innerHTML = liveDisplayName;
        } else if (firstArg && firstArg.type === 'enum') {
          const argData = tagData.args[0];
          const foundOption = firstArg.options?.find((d: { value: unknown }) => d.value === argData.value);
          const option = foundOption || firstArg.options?.[0];
          innerHTML = `${tagDefinition.displayName} ⇒ ${option?.displayName ?? ''}`;
        } else {
          innerHTML = tagDefinition.displayName || tagData.name;
        }
        const preview = await render(text);
        title = tagDefinition.disablePreview(tagData.args) ? preview.replace(/./g, '*') : preview;
      } else {
        innerHTML = cleanedStr;
        title = 'Unrecognized tag';
        dataIgnore = 'on';
      }
    } else {
      title = await render(str);
      const context = await renderContext();
      const con = context.context.getKeysContext();
      const contextForKey = con.keyContext[cleanedStr];
      const valueAndContext = contextForKey ? `${title} {${contextForKey}}` : title;
      innerHTML = showVariableSourceAndValue ? valueAndContext : cleanedStr;
      title = showVariableSourceAndValue ? cleanedStr : valueAndContext;
    }
  } catch (err) {
    title = err instanceof Error ? err.message.replace(/\[.+,.+]\s*/, '') : String(err);
    dataError = 'on';
  }

  el.title = title;
  el.dataset.ignore = dataIgnore;
  el.dataset.error = dataError;
  el.replaceChildren(document.createElement('label'), document.createTextNode(dataError === 'on' ? cleanedStr : innerHTML));
}

export interface NunjucksTagsConfig {
  handleRender: HandleRender;
  handleGetRenderContext?: (contextCacheKey?: string) => Promise<RenderContextAndKeys>;
  showVariableSourceAndValue?: boolean;
  editorId?: string;
  readOnly?: boolean;
}

const tokenRegex = /(\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}|\{#[\s\S]*?#\})/g;

function getTokenType(text: string) {
  if (regexTag.test(text)) {
    return 'nunjucks-tag';
  }
  if (regexVariable.test(text)) {
    return 'nunjucks-variable';
  }
  if (regexComment.test(text)) {
    return 'nunjucks-comment';
  }
  return 'nunjucks-variable';
}

export const nunjucksTagsExtension = (config: NunjucksTagsConfig | null): Extension => {
  if (!config?.handleRender) {
    return [];
  }

  return ViewPlugin.define(view => ({
    decorations: buildDecorations(view, config),
    update(u) {
      if (u.docChanged || u.viewportChanged || u.selectionSet) {
        (this as { decorations: ReturnType<typeof buildDecorations> }).decorations = buildDecorations(u.view, config);
      }
    },
  }), {
    decorations: plugin => plugin.decorations,
  });
};

function buildDecorations(view: EditorView, config: NunjucksTagsConfig) {
  const widgets = [];
  const { from, to } = view.viewport;
  const text = view.state.doc.sliceString(from, to);
  const cursor = view.state.selection.main.head;
  let match: RegExpExecArray | null;
  tokenRegex.lastIndex = 0;
  while ((match = tokenRegex.exec(text))) {
    const start = from + match.index;
    const end = start + match[0].length;
    if (cursor > start && cursor < end && view.hasFocus) {
      continue;
    }
    widgets.push(
      Decoration.replace({
        widget: new NunjucksWidget(
          match[0],
          getTokenType(match[0]),
          !!config.readOnly,
          config.editorId ?? '',
          config.handleRender,
          config.handleGetRenderContext ?? (async () => ({ context: { getKeysContext: () => ({ keyContext: {} }) } }) as RenderContextAndKeys),
          config.showVariableSourceAndValue ?? false,
        ),
        inclusive: false,
      }).range(start, end),
    );
  }
  return Decoration.set(widgets, true);
}

export const debouncedNunjucksRefresh = misc.debounce((view: EditorView) => {
  view.dispatch({});
});
