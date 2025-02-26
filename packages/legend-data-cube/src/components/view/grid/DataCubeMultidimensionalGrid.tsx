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
import type { DataCubeViewState } from '../../../stores/view/DataCubeViewState.js';

export const DataCubeMultidimensionalGrid = observer(
  (props: { view: DataCubeViewState }) => {
    return (
      <div className="border-t-1 border-b-1 h-[calc(100%_-_48px)] w-full border border-neutral-200 bg-neutral-50" />
    );
  },
);
