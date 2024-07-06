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
import type { DataQualityState } from './states/DataQualityState.js';
import {
  type QueryBuilderFilterState,
  QueryBuilderFilterPanel,
} from '@finos/legend-query-builder';
import { useEffect } from 'react';
import { reaction } from 'mobx';

export const DataQualityFilterPanel = observer(
  (props: {
    dataQualityState: DataQualityState;
    filterState: QueryBuilderFilterState;
  }) => {
    const { dataQualityState } = props;
    const { dataQualityQueryBuilderState } = dataQualityState;

    useEffect(() => {
      const disposer = reaction(
        () => dataQualityQueryBuilderState.filterState.hashCode,
        () => {
          dataQualityState.updateFilterElement();
        },
      );
      return () => disposer();
    }, [dataQualityState, dataQualityQueryBuilderState.filterState.hashCode]);

    return (
      <QueryBuilderFilterPanel
        queryBuilderState={dataQualityQueryBuilderState}
      />
    );
  },
);
