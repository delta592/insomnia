import { vi } from 'vitest';

import { nodeLibcurlMock } from '../insomnia/src/__mocks__/@getinsomnia/node-libcurl';

vi.mock('@getinsomnia/node-libcurl', () => nodeLibcurlMock);
