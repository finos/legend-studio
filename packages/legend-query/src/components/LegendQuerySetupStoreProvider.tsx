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

import { createContext, useContext } from 'react';
import { useLocalObservable } from 'mobx-react-lite';
import { QuerySetupStore } from '../stores/LegendQuerySetupStore.js';
import { useLegendQueryStore } from './LegendQueryStoreProvider.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

const QuerySetupStoreContext = createContext<QuerySetupStore | undefined>(
  undefined,
);

export const QuerySetupStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const queryStore = useLegendQueryStore();
  const store = useLocalObservable(() => new QuerySetupStore(queryStore));
  return (
    <QuerySetupStoreContext.Provider value={store}>
      {children}
    </QuerySetupStoreContext.Provider>
  );
};

export const useQuerySetupStore = (): QuerySetupStore =>
  guaranteeNonNullable(
    useContext(QuerySetupStoreContext),
    `Can't find Query setup store in context`,
  );
