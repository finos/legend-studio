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

import { createMock } from '@finos/legend-shared';
import { DepotServerClient } from './DepotServerClient.js';
import { DepotServerClientProvider } from './DepotServerClientProvider.js';

export const TEST__getTestDepotServerClient = (): DepotServerClient =>
  new DepotServerClient({
    serverUrl: '',
  });

export const TEST__provideMockedDepotServerClient = (customization?: {
  mock?: DepotServerClient;
}): DepotServerClient => {
  const value = customization?.mock ?? TEST__getTestDepotServerClient();
  const MockedDepotServerClientProvider = require('./DepotServerClientProvider.js'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MockedDepotServerClientProvider.useDepotServerClient = createMock();
  MockedDepotServerClientProvider.useDepotServerClient.mockReturnValue(value);
  return value;
};

export const TEST__DepotServerClientProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <DepotServerClientProvider config={{ serverUrl: '' }}>
    {children}
  </DepotServerClientProvider>
);
