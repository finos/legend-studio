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

import { observer } from 'mobx-react-lite';
import type { DataCubeViewState } from '../stores/view/DataCubeViewState.js';
import { DataCubeGrid } from './view/grid/DataCubeGrid.js';
import { DataCubeStatusBar } from './DataCubeStatusBar.js';
import {
  DataCubePlaceholderErrorDisplay,
  DataCubeViewPlaceholder,
} from './DataCubePlaceholder.js';
import { useEffect } from 'react';

export const DataCubeView = observer((props: { view: DataCubeViewState }) => {
  const { view } = props;

  useEffect(() => {
    return () => view.dispose();
  }, [view]);

  if (view.initializeState.hasFailed) {
    return (
      <DataCubeViewPlaceholder>
        <DataCubePlaceholderErrorDisplay
          message="Initialization Failure"
          prompt="Resolve the issue and reload."
        />
      </DataCubeViewPlaceholder>
    );
  }
  return (
    <>
      <DataCubeGrid view={view} />
      <DataCubeStatusBar view={view} />
    </>
  );
});
