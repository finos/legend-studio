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

import { DepotServerClient } from './DepotServerClient';
import { DepotServerClientProvider } from './DepotServerClientProvider';

export const TEST__getTestDepotServerClient = (): DepotServerClient =>
  new DepotServerClient({
    serverUrl: '',
  });

export const TEST__getMockedDepotServerClient = (): DepotServerClient => {
  const mock = TEST__getTestDepotServerClient();
  const MockedDepotServerClientProvider = require('./DepotServerClientProvider'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MockedDepotServerClientProvider.useDepotServerClient = jest.fn();
  MockedDepotServerClientProvider.useDepotServerClient.mockReturnValue(mock);
  return mock;
};

export const TEST__DepotServerClientProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => (
  <DepotServerClientProvider config={{ serverUrl: '' }}>
    {children}
  </DepotServerClientProvider>
);
