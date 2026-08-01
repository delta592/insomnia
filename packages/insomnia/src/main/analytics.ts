import crypto from 'node:crypto';

import * as Sentry from '@sentry/electron/main';
import { net } from 'electron';
import { AnalyticsEvent, InsomniaAnalytics } from 'insomnia-analytics';
import { services } from 'insomnia-data';
import { v4 as uuidv4 } from 'uuid';

import {
  getApiBaseURL,
  getAppVersion,
  getClientString,
  getProductName,
  getSegmentWriteKey,
  PLAYWRIGHT_TEST,
} from '../common/constants';

export { AnalyticsEvent };

type SegmentHttpRequest = {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body: string;
  httpRequestTimeout: number;
};

type SegmentHttpResponse = {
  status: number;
  statusText: string;
  headers?: Headers;
};

let _currentOrganizationId: string | undefined;

export function setCurrentOrganizationId(id: string | undefined): void {
  _currentOrganizationId = id;
}

let segmentUnavailableLogged = false;

function logSegmentUnavailable(error: unknown) {
  if (segmentUnavailableLogged) {
    return;
  }
  segmentUnavailableLogged = true;
  console.warn('[analytics] Segment unreachable; analytics disabled for this session.', error);
}

const segmentHttpClient = {
  makeRequest(options: SegmentHttpRequest): Promise<SegmentHttpResponse> {
    if (analytics.isDisabled) {
      return Promise.resolve({ status: 204, statusText: 'Analytics Disabled' });
    }

    return net
      .fetch(options.url, {
        method: options.method,
        headers: options.headers,
        body: options.body,
        signal: AbortSignal.timeout(options.httpRequestTimeout ?? 5000),
      })
      .then(response => ({
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      }))
      .catch((error: unknown) => {
        analytics.disable(error);
        return { status: 204, statusText: 'Analytics Unavailable' };
      });
  },
};

const analytics = new InsomniaAnalytics({
  writeKey: getSegmentWriteKey(),
  app: {
    appName: getProductName(),
    appVersion: getAppVersion(),
    osVersion: () => process.getSystemVersion(),
    platform: 'app',
  },
  settings: {
    maxRetries: 0,
    maxTotalBackoffDuration: 0,
    httpRequestTimeout: 5000,
    httpClient: segmentHttpClient,
  },
  onError: error => {
    logSegmentUnavailable(error);
  },
});

const getDeviceId = async () => {
  const settings = await services.settings.get();
  return settings.deviceId || (await services.settings.update(settings, { deviceId: uuidv4() })).deviceId;
};

function hashString(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function trackAnalyticsEvent(event: AnalyticsEvent, properties?: Record<string, any>) {
  if (PLAYWRIGHT_TEST || analytics.isDisabled) {
    return;
  }
  const settings = await services.settings.getOrCreate();
  const userSession = await services.userSession.get();
  if (!userSession?.hashedAccountId) {
    userSession.hashedAccountId = userSession?.accountId ? hashString(userSession.accountId) : '';
  }
  const allowAnalytics = settings.enableAnalytics || userSession?.hashedAccountId;
  if (!allowAnalytics) {
    return;
  }

  try {
    const anonymousId = (await getDeviceId()) ?? '';
    analytics.track({
      event,
      properties: {
        ...(_currentOrganizationId && { organization_id: _currentOrganizationId }),
        ...properties,
      },
      anonymousId,
      userId: userSession?.hashedAccountId || '',
    });
  } catch (error: unknown) {
    logSegmentUnavailable(error);
    analytics.disable(error);
  } finally {
    if (!userSession?.hashedAccountId && [AnalyticsEvent.unitTestRun, AnalyticsEvent.unitTestRunAll].includes(event)) {
      Sentry.captureException(`Run tests by anonymous`, {
        tags: {
          source: 'main/analytics',
        },
        extra: {
          organizationId: properties?.organizationId || '',
          projectId: properties?.projectId || '',
        },
      });
    }
  }
}

export async function trackPageView(name: string) {
  if (PLAYWRIGHT_TEST || analytics.isDisabled) {
    return;
  }
  const settings = await services.settings.getOrCreate();
  const userSession = await services.userSession.get();
  if (!userSession?.hashedAccountId) {
    userSession.hashedAccountId = userSession?.accountId ? hashString(userSession.accountId) : '';
  }

  const allowAnalytics = settings.enableAnalytics || userSession?.hashedAccountId;
  if (!allowAnalytics) {
    return;
  }

  try {
    const anonymousId = (await getDeviceId()) ?? '';
    analytics.page({ name, anonymousId, userId: userSession?.hashedAccountId });

    if (userSession?.id) {
      net
        .fetch(getApiBaseURL() + '/v1/telemetry/', {
          method: 'POST',
          headers: new Headers({
            'X-Session-Id': userSession?.id,
            'X-Insomnia-Client': getClientString(),
          }),
        })
        .catch(error => {
          console.warn('[analytics] Failed to send telemetry event', error);
        });
    }
  } catch (error: unknown) {
    logSegmentUnavailable(error);
    analytics.disable(error);
  }
}
