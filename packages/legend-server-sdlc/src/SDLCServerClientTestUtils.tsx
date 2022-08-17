/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { jest } from '@jest/globals';
import { SDLCServerClient } from './SDLCServerClient.js';
import { SDLCServerClientProvider } from './SDLCServerClientProvider.js';

export const TEST__getTestSDLCServerClient = (): SDLCServerClient =>
  new SDLCServerClient({
    serverUrl: 'https://testSdlcUrl',
    env: '',
  });

export const TEST__provideMockedSDLCServerClient = (customization?: {
  mock?: SDLCServerClient;
}): SDLCServerClient => {
  const value = customization?.mock ?? TEST__getTestSDLCServerClient();
  const MockedSDLCServerClientProvider = require('./SDLCServerClientProvider.js'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MockedSDLCServerClientProvider.useSDLCServerClient = jest.fn();
  MockedSDLCServerClientProvider.useSDLCServerClient.mockReturnValue(value);
  return value;
};

export const TEST__SDLCServerClientProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <SDLCServerClientProvider config={{ serverUrl: '', env: '' }}>
    {children}
  </SDLCServerClientProvider>
);
