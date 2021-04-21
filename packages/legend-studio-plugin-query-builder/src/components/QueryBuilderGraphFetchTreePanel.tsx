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
import { BlankPanelPlaceholder } from '@finos/legend-studio-components';
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import { QueryBuilderGraphFetchTreeExplorer } from './QueryBuilderGraphFetchTreeExplorer';
import type { GraphFetchTreeData } from '../stores/QueryBuilderGraphFetchTreeUtil';
import { QUERY_BUILDER_TEST_ID } from '../QueryBuilder_Constants';

export const QueryBuilderGraphFetchTreePanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const _class = queryBuilderState.querySetupState._class;
    const _mapping = queryBuilderState.querySetupState.mapping;
    const fetchStructureState = queryBuilderState.fetchStructureState;
    const graphFetchState = fetchStructureState.graphFetchTreeState;
    const graphFetchTree = graphFetchState.graphFetchTree;
    // Deep/Graph Fetch Tree
    const updateTreeData = (data: GraphFetchTreeData): void => {
      graphFetchState.setGraphFetchTree(data);
    };

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_GRAPH_FETCH}
        className="panel__content"
      >
        {!_class && (
          <BlankPanelPlaceholder
            placeholderText="No class selected for graph fetch tree"
            tooltipText="Please select class to get a graph fetch tree"
          />
        )}
        {graphFetchTree && (
          <div className="mapping-test-editor-panel__target-panel__query-container">
            <QueryBuilderGraphFetchTreeExplorer
              treeData={graphFetchTree}
              isReadOnly={false}
              updateTreeData={updateTreeData}
              parentMapping={_mapping}
            />
          </div>
        )}
      </div>
    );
  },
);
