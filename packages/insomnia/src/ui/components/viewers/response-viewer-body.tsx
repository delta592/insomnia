import { PREVIEW_MODE_FRIENDLY, PREVIEW_MODE_RAW } from 'insomnia-data/common';
import { Fragment, useCallback, useRef, useState, type ReactNode } from 'react';

import { bytesToBase64, utf8StringFromBytes } from '~/common/utils/utf8-bytes';
import { AnalyticsEvent } from '~/ui/analytics';
import { CodeEditor, type CodeEditorHandle } from '~/ui/components/.client/codemirror/code-editor';

import { HUGE_RESPONSE_MB, LARGE_RESPONSE_MB } from '../../../common/constants';
import { unescapeForwardSlash } from '../../../common/misc';
import { useDocBodyKeyboardShortcuts } from '../keydown-binder';
import { ResponseCSVViewer } from './response-csv-viewer';
import { ResponseErrorViewer } from './response-error-viewer';
import { ResponsePDFViewer } from './response-pdf-viewer';
import { ResponseWebView } from './response-web-view';

const CHARSET_ALIASES: Record<string, string> = {
  'utf8': 'utf8',
  'utf16le': 'utf-16le',
  'ucs2': 'utf-16le',
  'ucs-2': 'utf-16le',
  'latin1': 'iso-8859-1',
  'binary': 'iso-8859-1',
  'ascii': 'ascii',
  'win1250': 'windows-1250',
  'win1251': 'windows-1251',
  'win1252': 'windows-1252',
  'win1253': 'windows-1253',
  'win1254': 'windows-1254',
  'win1255': 'windows-1255',
  'win1256': 'windows-1256',
  'win1257': 'windows-1257',
  'win1258': 'windows-1258',
};

let alwaysShowLargeResponses = false;

export interface ResponseViewerHandle {
  refresh: () => void;
}

export function xmlDecode(input: string) {
  const ESCAPED_CHARACTERS_MAP = {
    '&amp;': '&',
    '&quot;': '"',
    '&lt;': '<',
    '&gt;': '>',
  };

  return input.replace(
    /(&quot;|&lt;|&gt;|&amp;)/g,
    (_: string, item: keyof typeof ESCAPED_CHARACTERS_MAP) => ESCAPED_CHARACTERS_MAP[item],
  );
}

export interface ResponseViewerProps {
  bytes: number;
  contentType: string;
  disableHtmlPreviewJs: boolean;
  disablePreviewLinks: boolean;
  download: (...args: any[]) => any;
  editorFontSize: number;
  filter: string;
  filterHistory: string[];
  bodyBuffer?: Uint8Array;
  getBody?: (...args: any[]) => Promise<Uint8Array | string>;
  previewMode: string;
  responseId: string;
  url: string;
  updateFilter?: (filter: string) => void;
  error?: string | null;
  renderMultipart?: (props: {
    bodyBuffer: Uint8Array;
    contentType: string;
    disableHtmlPreviewJs: boolean;
    disablePreviewLinks: boolean;
    download: (...args: any[]) => any;
    editorFontSize: number;
    filter: string;
    filterHistory: string[];
    responseId: string;
    url: string;
  }) => ReactNode;
}

export const ResponseViewerBody = ({
  bytes,
  bodyBuffer,
  getBody,
  contentType: originalContentType,
  disableHtmlPreviewJs,
  disablePreviewLinks,
  download,
  editorFontSize,
  error: responseError,
  filter,
  filterHistory,
  previewMode,
  responseId,
  updateFilter,
  url,
  renderMultipart,
}: ResponseViewerProps) => {
  const largeResponse = bytes > LARGE_RESPONSE_MB * 1024 * 1024;
  const hugeResponse = bytes > HUGE_RESPONSE_MB * 1024 * 1024;
  const [blockingBecauseTooLarge, setBlockingBecauseTooLarge] = useState(!alwaysShowLargeResponses && largeResponse);
  const [parseError, setParseError] = useState('');

  const [overSizedBody, setOversizedBody] = useState<Uint8Array | null>(bodyBuffer || null);

  const editorRef = useRef<CodeEditorHandle>(null);

  const _handleDismissBlocker = useCallback(async () => {
    setBlockingBecauseTooLarge(false);

    try {
      const buffer = await getBody?.();
      if (typeof buffer === 'string') {
        setParseError(`Failed reading response from filesystem: ${buffer}`);
        return setOversizedBody(null);
      }

      return setOversizedBody(buffer || null);
    } catch (err) {
      setParseError(`Failed reading response from filesystem: ${err.stack}`);
    }
  }, [getBody]);

  const _handleDisableBlocker = useCallback(() => {
    alwaysShowLargeResponses = true;

    _handleDismissBlocker();
  }, [_handleDismissBlocker]);

  useDocBodyKeyboardShortcuts({
    response_focus: () => {
      if (editorRef.current) {
        if ('focus' in editorRef.current) {
          editorRef.current.focus();
        }

        if (!largeResponse && 'selectAll' in editorRef.current) {
          editorRef.current.selectAll();
        }
      }
    },
  });

  const _getContentType = useCallback(() => {
    const lowercasedOriginalContentType = originalContentType.toLowerCase();
    if (!overSizedBody || overSizedBody.length === 0) {
      return lowercasedOriginalContentType;
    }
    try {
      if (overSizedBody && overSizedBody.length > 0) {
        JSON.parse(utf8StringFromBytes(overSizedBody));
        return 'application/json';
      }
    } catch {}
    try {
      const isProbablyHTML = utf8StringFromBytes(overSizedBody.slice(0, 100))
        .trim()
        .match(/^<!doctype html.*>/i);

      if (lowercasedOriginalContentType.indexOf('text/html') !== 0 && isProbablyHTML) {
        return 'text/html';
      }
    } catch {}

    return lowercasedOriginalContentType;
  }, [originalContentType, overSizedBody]);

  const getBodyAsString = useCallback(() => {
    if (!overSizedBody) {
      return '';
    }
    const match = _getContentType().match(/charset=([\w-]+)/);
    const charset = match && match.length >= 2 ? match[1] : 'utf8';
    const label = CHARSET_ALIASES[charset.toLowerCase()] ?? charset;
    try {
      return new TextDecoder(label).decode(overSizedBody);
    } catch (err) {
      console.warn('[response] Failed to decode body', err);
      return utf8StringFromBytes(overSizedBody);
    }
  }, [overSizedBody, _getContentType]);

  if (responseError || parseError) {
    return (
      <div className="scrollable tall">
        <ResponseErrorViewer url={url} error={responseError || parseError} />
      </div>
    );
  }

  if (blockingBecauseTooLarge) {
    return (
      <div className="response-pane__notify">
        {hugeResponse ? (
          <Fragment>
            <p className="pad faint">Responses over {HUGE_RESPONSE_MB}MB cannot be shown</p>
            <button onClick={download} className="btn btn--clicky inline-block">
              Save Response To File
            </button>
          </Fragment>
        ) : (
          <Fragment>
            <p className="pad faint">Response over {LARGE_RESPONSE_MB}MB hidden for performance reasons</p>
            <div>
              <button onClick={download} className="btn btn--clicky margin-xs inline-block">
                Save To File
              </button>
              <button
                onClick={_handleDismissBlocker}
                disabled={hugeResponse}
                className="btn btn--clicky margin-xs inline-block"
              >
                Show Anyway
              </button>
            </div>
            <div className="pad-top-sm">
              <button className="faint btn btn--super-compact inline-block" onClick={_handleDisableBlocker}>
                Always Show
              </button>
            </div>
          </Fragment>
        )}
      </div>
    );
  }

  if (!overSizedBody) {
    return <div className="pad faint">Failed to read response body from filesystem</div>;
  }

  if (overSizedBody.length === 0) {
    return <div className="pad faint">No body returned for response</div>;
  }

  const contentType = _getContentType();

  if (previewMode === PREVIEW_MODE_FRIENDLY && contentType === 'application/json') {
    let bodyStr = getBodyAsString();
    try {
      bodyStr = unescapeForwardSlash(bodyStr);
    } catch {}
    return (
      <CodeEditor
        id="json-response-viewer"
        key={`${responseId}-json`}
        ref={editorRef}
        autoPrettify
        defaultValue={bodyStr}
        filter={filter}
        filterHistory={filterHistory}
        mode={contentType}
        noMatchBrackets
        onClickLink={url =>
          !disablePreviewLinks &&
          window.main.openInBrowser(getBodyAsString()?.match(/^\s*<\?xml [^?]*\?>/) ? xmlDecode(url) : url)
        }
        placeholder="..."
        readOnly
        historyKey={responseId}
        truncateLongLines
        updateFilter={filter => {
          updateFilter?.(filter);

          if (filter) {
            window.main.trackAnalyticsEvent({
              event: AnalyticsEvent.filterCreatedResponseBody,
            });
          }
        }}
      />
    );
  }

  if (previewMode === PREVIEW_MODE_FRIENDLY && contentType.indexOf('image/') === 0) {
    const justContentType = contentType.split(';')[0];
    const base64Body = bytesToBase64(overSizedBody);
    return (
      <div className="scrollable-container tall wide">
        <div className="scrollable">
          <img
            src={`data:${justContentType};base64,${base64Body}`}
            className="pad block"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              margin: 'auto',
            }}
          />
        </div>
      </div>
    );
  }

  if (previewMode === PREVIEW_MODE_FRIENDLY && contentType.includes('html')) {
    return (
      <ResponseWebView
        body={getBodyAsString()}
        key={disableHtmlPreviewJs ? 'no-js' : 'yes-js'}
        url={url}
        webpreferences={`disableDialogs=true, javascript=${disableHtmlPreviewJs ? 'no' : 'yes'}`}
      />
    );
  }

  if (previewMode === PREVIEW_MODE_FRIENDLY && contentType.indexOf('application/pdf') === 0) {
    return (
      <div className="tall wide scrollable">
        <ResponsePDFViewer body={overSizedBody} key={responseId} />
      </div>
    );
  }

  if (previewMode === PREVIEW_MODE_FRIENDLY && contentType.indexOf('text/csv') === 0) {
    return (
      <div className="tall wide scrollable">
        <ResponseCSVViewer body={overSizedBody} key={responseId} />
      </div>
    );
  }

  if (previewMode === PREVIEW_MODE_FRIENDLY && contentType.indexOf('multipart/') === 0 && renderMultipart) {
    return renderMultipart({
      bodyBuffer: overSizedBody,
      contentType,
      disableHtmlPreviewJs,
      disablePreviewLinks,
      download,
      editorFontSize,
      filter,
      filterHistory,
      responseId,
      url,
    });
  }

  if (previewMode === PREVIEW_MODE_FRIENDLY && contentType.indexOf('audio/') === 0) {
    const justContentType = contentType.split(';')[0];
    const base64Body = bytesToBase64(overSizedBody);
    return (
      <div className="vertically-center" key={responseId}>
        <audio controls>
          <source src={`data:${justContentType};base64,${base64Body}`} />
        </audio>
      </div>
    );
  }

  if (previewMode === PREVIEW_MODE_RAW) {
    return (
      <CodeEditor
        id="raw-response-viewer"
        key={responseId}
        ref={editorRef}
        className="raw-editor"
        defaultValue={getBodyAsString()}
        hideLineNumbers
        mode="text/plain"
        noMatchBrackets
        placeholder="..."
        readOnly
        historyKey={responseId}
      />
    );
  }

  return (
    <CodeEditor
      id="response-viewer"
      key={disablePreviewLinks ? 'links-disabled' : 'links-enabled'}
      ref={editorRef}
      autoPrettify
      defaultValue={getBodyAsString()}
      filter={filter}
      filterHistory={filterHistory}
      mode={getBodyAsString()?.match(/^\s*<\?xml [^?]*\?>/) ? 'application/xml' : _getContentType()}
      noMatchBrackets
      onClickLink={url =>
        !disablePreviewLinks &&
        window.main.openInBrowser(getBodyAsString()?.match(/^\s*<\?xml [^?]*\?>/) ? xmlDecode(url) : url)
      }
      placeholder="..."
      readOnly
      historyKey={responseId}
      truncateLongLines
      updateFilter={filter => {
        updateFilter?.(filter);

        if (filter) {
          window.main.trackAnalyticsEvent({
            event: AnalyticsEvent.filterCreatedResponseBody,
          });
        }
      }}
    />
  );
};
