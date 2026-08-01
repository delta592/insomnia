import type { ResponseViewerProps } from './response-viewer-body';
import { ResponseViewerBody } from './response-viewer-body';
import { ResponseMultipartViewer } from './response-multipart-viewer';

export type { ResponseViewerHandle, ResponseViewerProps } from './response-viewer-body';
export { xmlDecode } from './response-viewer-body';

export const ResponseViewer = (props: Omit<ResponseViewerProps, 'renderMultipart'>) => (
  <ResponseViewerBody
    {...props}
    renderMultipart={multipartProps => <ResponseMultipartViewer {...multipartProps} />}
  />
);
