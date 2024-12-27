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
import { LegendDataCubeQueryBuilderStore } from '../../stores/query-builder/LegendDataCubeQueryBuilderStore.js';
import { useLegendDataCubeBaseStore } from '../LegendDataCubeFrameworkProvider.js';

const LegendDataCubeQueryBuilderStoreContext = createContext<
  LegendDataCubeQueryBuilderStore | undefined
>(undefined);
const LegendDataCubeQueryBuilderStoreProvider = (props: {
  children: React.ReactNode;
}) => {
  const { children } = props;
  const baseStore = useLegendDataCubeBaseStore();
  const store = useLocalObservable(
    () => new LegendDataCubeQueryBuilderStore(baseStore),
  );
  return (
    <LegendDataCubeQueryBuilderStoreContext.Provider value={store}>
      {children}
    </LegendDataCubeQueryBuilderStoreContext.Provider>
  );
};

export const useLegendDataCubeQueryBuilderStore = () =>
  guaranteeNonNullable(
    useContext(LegendDataCubeQueryBuilderStoreContext),
    `Can't find query builder store in context`,
  );

export const withLegendDataCubeQueryBuilderStore = (
  WrappedComponent: React.FC,
) =>
  function WithLegendDataCubeQueryBuilderStore() {
    return (
      <LegendDataCubeQueryBuilderStoreProvider>
        <WrappedComponent />
      </LegendDataCubeQueryBuilderStoreProvider>
    );
  };
