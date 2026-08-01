import { type Diagnostic,linter } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';

let openapiLintValidator: ((contents: string) => Promise<Diagnostic[]>) | null = null;

export const setOpenapiLintValidator = (validator: ((contents: string) => Promise<Diagnostic[]>) | null) => {
  openapiLintValidator = validator;
};

export const openapiLintExtension = (): Extension =>
  linter(async view => {
    if (!openapiLintValidator) {
      return [];
    }
    return openapiLintValidator(view.state.doc.toString());
  });
