import type { Extension } from '@codemirror/state';
import { hoverTooltip } from '@codemirror/view';

import { getGraphQLTokenAt } from './get-graphql-token-at';
import { renderGraphQLInfo } from './graphql-info-render';
import type { GraphQLInfoOptions } from './types';

export const graphqlInfoExtension = (options: GraphQLInfoOptions = {}): Extension => {
  if (!options.schema) {
    return [];
  }

  return hoverTooltip(
    (view, pos) => {
      const token = getGraphQLTokenAt(view.state.doc.toString(), pos);
      if (!token?.state) {
        return null;
      }

      const dom = renderGraphQLInfo(token.state, options);
      if (!dom) {
        return null;
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'CodeMirror-info';
      wrapper.append(dom);

      return {
        pos,
        above: true,
        create() {
          return { dom: wrapper };
        },
      };
    },
    { hoverTime: 500 },
  );
};
