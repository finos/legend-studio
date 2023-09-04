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

import { MenuContentItem } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import type { DataSpace } from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import { useEditorStore } from '@finos/legend-application-studio';
import { queryDataSpace } from '../query/DataSpaceQueryBuilder.js';

export const DataSpaceQueryAction = observer(
  (props: { dataSpace: DataSpace }) => {
    const { dataSpace } = props;
    const editorStore = useEditorStore();
    const buildQuery = editorStore.applicationStore.guardUnhandledError(
      async () => {
        await queryDataSpace(dataSpace, editorStore);
      },
    );
    return <MenuContentItem onClick={buildQuery}>Query...</MenuContentItem>;
  },
);
