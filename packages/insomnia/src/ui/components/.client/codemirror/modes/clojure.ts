import CodeMirror from 'codemirror-legacy';

CodeMirror.extendMode('clojure', { fold: 'brace' } as Partial<CodeMirror.Mode<any>>);
