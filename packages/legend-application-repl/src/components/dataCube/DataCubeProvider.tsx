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

import { createContext, useContext, useEffect } from 'react';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { DataCubeState } from '../../stores/dataCube/DataCubeState.js';
import type { DataCubeApplicationEngine } from '../../stores/dataCube/engine/DataCubeApplicationEngine.js';
import type { DataCubeEngine } from '../../stores/dataCube/engine/DataCubeEngine.js';

const DataCubeStateContext = createContext<DataCubeState | undefined>(
  undefined,
);

export const DataCubeProvider = observer(
  (props: {
    children: React.ReactNode;
    application: DataCubeApplicationEngine;
    engine: DataCubeEngine;
  }): React.ReactElement => {
    const { children, application, engine } = props;
    const store = useLocalObservable(
      () => new DataCubeState(application, engine),
    );

    useEffect(() => {
      store.initialize().catch((error) => application.logUnhandledError(error));
    }, [store, application]);

    if (!store.initState.hasSucceeded) {
      return <></>;
    }
    return (
      <DataCubeStateContext.Provider value={store}>
        {children}
      </DataCubeStateContext.Provider>
    );
  },
);

export const useDataCube = () =>
  guaranteeNonNullable(
    useContext(DataCubeStateContext),
    `Can't find Data Cube in context`,
  );
