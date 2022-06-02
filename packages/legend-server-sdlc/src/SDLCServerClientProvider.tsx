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

import { guaranteeNonNullable } from '@finos/legend-shared';
import { useLocalObservable } from 'mobx-react-lite';
import { createContext, useContext } from 'react';
import {
  type SDLCServerClientConfig,
  SDLCServerClient,
} from './SDLCServerClient.js';

const SDLCServerClientContext = createContext<SDLCServerClient | undefined>(
  undefined,
);

export const SDLCServerClientProvider: React.FC<{
  children: React.ReactNode;
  config: SDLCServerClientConfig;
}> = ({ children, config }) => {
  const sdlcServerClient = useLocalObservable(
    () => new SDLCServerClient(config),
  );
  return (
    <SDLCServerClientContext.Provider value={sdlcServerClient}>
      {children}
    </SDLCServerClientContext.Provider>
  );
};

export const useSDLCServerClient = (): SDLCServerClient =>
  guaranteeNonNullable(
    useContext(SDLCServerClientContext),
    `Can't find SDLC server client in context`,
  );
