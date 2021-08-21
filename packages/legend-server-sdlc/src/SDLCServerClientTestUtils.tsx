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

import { SDLCServerClient } from './SDLCServerClient';
import { SDLCServerClientProvider } from './SDLCServerClientProvider';

export const TEST__getTestSDLCServerClient = (): SDLCServerClient =>
  new SDLCServerClient({
    serverUrl: '',
    env: '',
  });

export const TEST__provideMockedSDLCServerClient = (): SDLCServerClient => {
  const mock = TEST__getTestSDLCServerClient();
  const MockedSDLCServerClientProvider = require('./SDLCServerClientProvider'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MockedSDLCServerClientProvider.useSDLCServerClient = jest.fn();
  MockedSDLCServerClientProvider.useSDLCServerClient.mockReturnValue(mock);
  return mock;
};

export const TEST__SDLCServerClientProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => (
  <SDLCServerClientProvider config={{ serverUrl: '', env: '' }}>
    {children}
  </SDLCServerClientProvider>
);
