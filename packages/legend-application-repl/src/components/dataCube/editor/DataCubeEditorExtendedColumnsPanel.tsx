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

import { DataCubeIcon } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { FormBadge_WIP } from '../../repl/Form.js';
import type { DataCubeState } from '../../../stores/dataCube/DataCubeState.js';

export const DataCubeEditorExtendedColumnsPanel = observer(
  (props: { dataCube: DataCubeState }) => {
    const { dataCube } = props;
    const panel = dataCube.editor.sorts;

    useEffect(() => {}, [panel]); // TODO: @akphi - remove this dummy useEffect

    return (
      <div className="h-full w-full select-none p-2">
        <div className="flex h-6">
          <div className="flex h-6 items-center text-xl font-medium">
            <DataCubeIcon.TablePlus />
          </div>
          <div className="ml-1 flex h-6 items-center text-xl font-medium">
            Extended Columns
            <FormBadge_WIP />
          </div>
        </div>
        <div className="flex h-[calc(100%_-_24px)] w-full"></div>
      </div>
    );
  },
);
