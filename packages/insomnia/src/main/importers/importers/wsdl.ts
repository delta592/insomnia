import { DOMParser } from '@xmldom/xmldom';

import type { FilePathConverter } from '../entities';
import { convertWsdlResources } from './wsdl/index';

export const id = 'wsdl';
export const name = 'WSDL';
export const description = 'Importer for WSDL files';
export const acceptFilePath = true;

const wsdlNamespaceUri = 'http://schemas.xmlsoap.org/wsdl/';

function verifyWsdl(fileContent: string) {
  try {
    const mainWsdlDocument = new DOMParser().parseFromString(fileContent, 'text/xml');
    return (
      mainWsdlDocument.documentElement?.namespaceURI === wsdlNamespaceUri &&
      mainWsdlDocument.documentElement.localName === 'definitions'
    );
  } catch {
    return false;
  }
}

export const convert: FilePathConverter = async importEntry => {
  const rawData = importEntry.contentStr;

  try {
    if (!verifyWsdl(rawData)) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const input = importEntry.oriFilePath
      ? importEntry.oriFilePath
      : `<?xml version="1.0" encoding="UTF-8" ?>${rawData}`;
    return await convertWsdlResources(input, rawData);
  } catch (error) {
    console.error(error);
    return {
      convertErrorMessage: error instanceof Error ? error.message : String(error),
    };
  }
};
