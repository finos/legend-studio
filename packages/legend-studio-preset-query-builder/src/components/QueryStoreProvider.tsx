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
import { QueryStore } from '../stores/QueryStore';
import { EditorStore, useApplicationStore } from '@finos/legend-studio';
import { guaranteeNonNullable } from '@finos/legend-shared';

const QueryStoreContext = createContext<QueryStore | undefined>(undefined);

export const QueryStoreProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const applicationStore = useApplicationStore();
  const store = useLocalObservable(
    () => new QueryStore(new EditorStore(applicationStore)),
  );
  return (
    <QueryStoreContext.Provider value={store}>
      {children}
    </QueryStoreContext.Provider>
  );
};

export const useQueryStore = (): QueryStore =>
  guaranteeNonNullable(
    useContext(QueryStoreContext),
    'useQueryStore() hook must be used inside QueryBuilderStore context provider',
  );
