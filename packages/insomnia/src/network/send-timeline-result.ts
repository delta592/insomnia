import type { Cookie, ResponseHeader } from 'insomnia-data';

export interface sendCurlAndWriteTimelineError {
  _id: string;
  parentId: string;
  timelinePath: string;
  statusMessage: string;
  url: string;
  error: string;
  elapsedTime: number;
  bytesRead: number;
}

export interface sendCurlAndWriteTimelineResponse {
  _id: string;
  parentId: string;
  timelinePath: string;
  statusMessage: string;
  cookies: Cookie[];
  timeline: string[];
  bytesRead?: number;
  bodyCompression?: 'zip' | null;
  bodyPath?: string;
  elapsedTime: number;
  headers?: ResponseHeader[];
  statusCode?: number;
}
