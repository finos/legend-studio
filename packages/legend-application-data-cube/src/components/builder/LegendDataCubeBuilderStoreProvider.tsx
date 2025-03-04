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
import { LegendDataCubeBuilderStore } from '../../stores/builder/LegendDataCubeBuilderStore.js';
import { useLegendDataCubeBaseStore } from '../LegendDataCubeFrameworkProvider.js';
import { LegendDataCubeBlockingWindow } from '../LegendDataCubeBlockingWindow.js';

const LegendDataCubeBuilderStoreContext = createContext<
  LegendDataCubeBuilderStore | undefined
>(undefined);
const LegendDataCubeBuilderStoreProvider = (props: {
  children: React.ReactNode;
}) => {
  const { children } = props;
  const baseStore = useLegendDataCubeBaseStore();
  const store = useLocalObservable(
    () => new LegendDataCubeBuilderStore(baseStore),
  );
  return (
    <LegendDataCubeBuilderStoreContext.Provider value={store}>
      {children}
      <LegendDataCubeBlockingWindow windowState={store.saverDisplay} />
      <LegendDataCubeBlockingWindow
        windowState={store.deleteConfirmationDisplay}
      />
      <LegendDataCubeBlockingWindow
        windowState={store.loader.sourceLoaderState.display}
        closeModal={() => {
          store.loader.sourceLoaderDisplay.close();
          store.loadPartialSourceDataCube();
        }}
      />
    </LegendDataCubeBuilderStoreContext.Provider>
  );
};

export const useLegendDataCubeBuilderStore = () =>
  guaranteeNonNullable(
    useContext(LegendDataCubeBuilderStoreContext),
    `Can't find builder store in context`,
  );

export const withLegendDataCubeBuilderStore = (WrappedComponent: React.FC) =>
  function WithLegendDataCubeBuilderStore() {
    return (
      <LegendDataCubeBuilderStoreProvider>
        <WrappedComponent />
      </LegendDataCubeBuilderStoreProvider>
    );
  };
