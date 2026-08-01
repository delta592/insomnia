/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dispatchEditorUndo } from './editor-undo';

vi.mock('@codemirror/commands', () => ({
  undo: vi.fn(() => true),
  redo: vi.fn(() => true),
}));

import { redo, undo } from '@codemirror/commands';

const mockedUndo = vi.mocked(undo);
const mockedRedo = vi.mocked(redo);

// jsdom does not implement execCommand, so install a stub per test to observe
// the native-fallback path. Restore the original explicitly afterwards:
// vi.restoreAllMocks() cannot revert a direct property assignment, so leaving it
// would leak the stub into later tests and make the suite order-dependent.
const originalExecCommand = document.execCommand;
let execCommand: ReturnType<typeof vi.fn>;

beforeEach(() => {
  execCommand = vi.fn().mockReturnValue(true);
  document.execCommand = execCommand;
  mockedUndo.mockClear();
  mockedRedo.mockClear();
});

afterEach(() => {
  document.body.innerHTML = '';
  document.execCommand = originalExecCommand;
  vi.restoreAllMocks();
});

const mountFocusedCodeMirror = () => {
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-cm-editor', 'true');
  wrapper.tabIndex = -1;
  const input = document.createElement('textarea');
  wrapper.append(input);
  document.body.append(wrapper);
  input.focus();
  const view = { dom: wrapper } as never;
  (wrapper as unknown as { cmView: typeof view }).cmView = view;
  return view;
};

describe('dispatchEditorUndo', () => {
  it('drives CodeMirror history when focus is inside a CodeMirror editor', () => {
    mountFocusedCodeMirror();

    dispatchEditorUndo('undo');
    dispatchEditorUndo('redo');

    expect(mockedUndo).toHaveBeenCalledTimes(1);
    expect(mockedRedo).toHaveBeenCalledTimes(1);
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('falls back to the native edit command for plain inputs', () => {
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();

    dispatchEditorUndo('undo');
    dispatchEditorUndo('redo');

    expect(execCommand).toHaveBeenNthCalledWith(1, 'undo');
    expect(execCommand).toHaveBeenNthCalledWith(2, 'redo');
  });

  it('falls back to the native edit command when nothing is focused', () => {
    dispatchEditorUndo('undo');

    expect(execCommand).toHaveBeenCalledWith('undo');
  });
});
