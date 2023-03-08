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
import type { History } from 'history';
import { WebApplicationNavigator } from '../stores/navigation/WebApplicationNavigator.js';
import { useHistory } from 'react-router';

const WebApplicationNavigatorContext = createContext<
  WebApplicationNavigator | undefined
>(undefined);

export const WebApplicationNavigatorProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const history = useHistory() as History;
  const navigator = useLocalObservable(
    () => new WebApplicationNavigator(history),
  );
  return (
    <WebApplicationNavigatorContext.Provider value={navigator}>
      {children}
    </WebApplicationNavigatorContext.Provider>
  );
};

export const useWebApplicationNavigator = (): WebApplicationNavigator =>
  guaranteeNonNullable(
    useContext(WebApplicationNavigatorContext),
    `Can't find web application navigator in context`,
  );
