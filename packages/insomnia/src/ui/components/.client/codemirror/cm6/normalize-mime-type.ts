export const normalizeMimeType = (mode?: string) => {
  const mimeType = mode ? mode.split(';')[0] : 'text/plain';
  if (mimeType.includes('graphql-variables')) {
    return 'application/json';
  } else if (mimeType.includes('graphql')) {
    return 'graphql';
  } else if (mimeType.includes('json')) {
    return 'application/json';
  } else if (mimeType.includes('clojure')) {
    return 'application/edn';
  } else if (mimeType.includes('xml')) {
    return 'application/xml';
  } else if (mimeType.includes('kotlin')) {
    return 'text/x-kotlin';
  } else if (mimeType.includes('yaml')) {
    return 'yaml';
  }
  return mimeType;
};
