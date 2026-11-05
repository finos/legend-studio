/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { QueryBuilder } from '@finos/legend-query-builder';
import { observer } from 'mobx-react-lite';
import type { LegendAnalyticsDataSpaceEditorSession } from '../../stores/data-space/LegendAnalyticsDataSpaceEditor.js';

/**
 * A data space source's query builder in Legend Cube's node editor (PLAN
 * §11.25), filling the space the editor gives it; nothing until the
 * session's data space has loaded, which the editor says
 */
export const LegendAnalyticsDataSpaceQueryBuilder = observer(
  (props: { session: LegendAnalyticsDataSpaceEditorSession }) => {
    const { queryBuilderState } = props.session;
    return queryBuilderState ? (
      <div
        className="legend-analytics__data-space-query-builder"
        style={{ height: '100%', width: '100%' }}
      >
        <QueryBuilder queryBuilderState={queryBuilderState} />
      </div>
    ) : null;
  },
);
