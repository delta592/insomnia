import { StreamLanguage } from '@codemirror/language';
import { graphql } from 'codemirror-graphql/cm6-legacy/mode';

export const graphqlLanguage = StreamLanguage.define(graphql);
