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
import {
  type ExecutionPlanState,
  EXECUTION_PLAN_VIEW_MODE,
} from '../../stores/execution-plan/ExecutionPlanState.js';
import {
  PartialClassResultType,
  PropertyGraphFetchTree,
  RootGraphFetchTree,
  type StoreMappingGlobalGraphFetchExecutionNode,
} from '@finos/legend-graph';
import {
  PanelListItem,
  PanelDivider,
  Button,
  PanelContent,
  TreeView,
} from '@finos/legend-art';
import { guaranteeType, isNonNullable } from '@finos/legend-shared';
import {
  buildGraphFetchTreeData,
  buildPropertyGraphFetchTreeData,
  type QueryBuilderGraphFetchTreeData,
  type QueryBuilderGraphFetchTreeNodeData,
} from '../../stores/fetch-structure/graph-fetch/QueryBuilderGraphFetchTreeUtil.js';
import { QueryBuilderGraphFetchTreeNodeContainer } from '../fetch-structure/QueryBuilderGraphFetchTreePanel.js';
import { PartialClassResultTypeViewer } from './PartialClassResultViewer.js';

export const StoreMappingGlobalGraphFetchExecutionNodeViewer: React.FC<{
  storeMappingNode: StoreMappingGlobalGraphFetchExecutionNode;
  executionPlanState: ExecutionPlanState;
}> = observer((props) => {
  const { storeMappingNode, executionPlanState } = props;

  let treeData: QueryBuilderGraphFetchTreeData | undefined = undefined;
  try {
    if (storeMappingNode.graphFetchTree instanceof RootGraphFetchTree) {
      treeData = buildGraphFetchTreeData(
        guaranteeType(storeMappingNode.graphFetchTree, RootGraphFetchTree),
        true,
      );
    } else if (
      storeMappingNode.graphFetchTree instanceof PropertyGraphFetchTree
    ) {
      treeData = buildPropertyGraphFetchTreeData(
        storeMappingNode.graphFetchTree,
      );
    }
  } catch {
    //do nothing
  }

  const getChildNodes = (
    node: QueryBuilderGraphFetchTreeNodeData,
  ): QueryBuilderGraphFetchTreeNodeData[] =>
    node.childrenIds
      .map((id) => {
        if (treeData) {
          return treeData.nodes.get(id);
        }
        return null;
      })
      .filter(isNonNullable);

  const isReadOnly = true;
  const applicationStore = executionPlanState.applicationStore;

  return (
    <PanelContent
      darkMode={
        !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
      }
    >
      <div className="query-builder__store-mapping-global-graph-fetch__container">
        <PanelListItem className="query-builder__store-mapping-global-graph-fetch__container__label">
          Store Mapping Global Graph Fetch Execution Node Details
        </PanelListItem>
        <PanelDivider />
        <table className="query-builder__store-mapping-global-graph-fetch__container__table table">
          <thead>
            <tr>
              <th className="table__cell--left">Property</th>
              <th className="table__cell--left">Details</th>
            </tr>
          </thead>
          <tbody>
            {storeMappingNode.parentIndex !== undefined && (
              <tr>
                <td className="table__cell--left"> ParentIndex</td>
                <td className="table__cell--left">
                  {storeMappingNode.parentIndex}
                </td>
              </tr>
            )}
            {storeMappingNode.enableConstraints !== undefined && (
              <tr>
                <td className="table__cell--left">EnableConstraints</td>
                <td className="table__cell--left">
                  {storeMappingNode.enableConstraints.toString()}
                </td>
              </tr>
            )}
            {storeMappingNode.checked !== undefined && (
              <tr>
                <td className="table__cell--left">Checked</td>
                <td className="table__cell--left">
                  {storeMappingNode.checked.toString()}
                </td>
              </tr>
            )}
            {storeMappingNode.authDependent !== undefined && (
              <tr>
                <td className="table__cell--left">AuthDependent</td>
                <td className="table__cell--left">
                  {storeMappingNode.authDependent.toString()}
                </td>
              </tr>
            )}
            {storeMappingNode.store && (
              <tr>
                <td className="table__cell--left">Store</td>
                <td className="table__cell--left">{storeMappingNode.store}</td>
              </tr>
            )}
            <tr>
              <td className="table__cell--left">LocalTreeIndices</td>
              <td className="table__cell--left">{`[${storeMappingNode.localTreeIndices.toString()}]`}</td>
            </tr>
            <tr>
              <td className="table__cell--left">DependencyIndices</td>
              <td className="table__cell--left">{`[${storeMappingNode.dependencyIndices.toString()}]`}</td>
            </tr>
          </tbody>
        </table>
        <PanelDivider />
        {treeData && (
          <>
            <PanelListItem className="query-builder__store-mapping-global-graph-fetch__container__label2">
              Graph Fetch Tree
            </PanelListItem>
            <div className="query-builder__store-mapping-global-graph-fetch__container__config-group__content">
              <div className="query-builder__store-mapping-global-graph-fetch__container__config-group__item">
                <TreeView
                  components={{
                    TreeNodeContainer: QueryBuilderGraphFetchTreeNodeContainer,
                  }}
                  className="query-builder-graph-fetch-tree__container__tree"
                  treeData={treeData}
                  getChildNodes={getChildNodes}
                  innerProps={{
                    isReadOnly,
                  }}
                />
              </div>
            </div>
            <PanelDivider />
          </>
        )}
        {storeMappingNode.xStorePropertyFetchDetails && (
          <>
            <PanelListItem className="query-builder__store-mapping-global-graph-fetch__container__xstore">
              xStorePropertyFetchDetails
            </PanelListItem>
            <PanelDivider />
            <table className="query-builder__store-mapping-global-graph-fetch__container__table table">
              <thead>
                <tr>
                  <th className="table__cell--left">Property</th>
                  <th className="table__cell--left">Details</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="table__cell--left"> propertyPath </td>
                  <td className="table__cell--left">
                    {storeMappingNode.xStorePropertyFetchDetails.propertyPath}
                  </td>
                </tr>
                <tr>
                  <td className="table__cell--left"> sourceMappingId </td>
                  <td className="table__cell--left">
                    {
                      storeMappingNode.xStorePropertyFetchDetails
                        .sourceMappingId
                    }
                  </td>
                </tr>
                <tr>
                  <td className="table__cell--left"> sourceSetId </td>
                  <td className="table__cell--left">
                    {storeMappingNode.xStorePropertyFetchDetails.sourceSetId}
                  </td>
                </tr>
                <tr>
                  <td className="table__cell--left"> subTree </td>
                  <td className="table__cell--left">
                    {storeMappingNode.xStorePropertyFetchDetails.subTree}
                  </td>
                </tr>
                <tr>
                  <td className="table__cell--left"> supportsCaching </td>
                  <td className="table__cell--left">
                    {storeMappingNode.xStorePropertyFetchDetails.supportsCaching.toString()}
                  </td>
                </tr>
                <tr>
                  <td className="table__cell--left"> targetMappingId </td>
                  <td className="table__cell--left">
                    {
                      storeMappingNode.xStorePropertyFetchDetails
                        .targetMappingId
                    }
                  </td>
                </tr>
                <tr>
                  <td className="table__cell--left"> targetSetId</td>
                  <td className="table__cell--left">
                    {storeMappingNode.xStorePropertyFetchDetails.targetSetId}
                  </td>
                </tr>
                <tr>
                  <td className="table__cell--left">targetPropertiesOrdered</td>
                  <td className="table__cell--left">{`[${storeMappingNode.xStorePropertyFetchDetails.targetPropertiesOrdered.toString()}]`}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}
        {storeMappingNode.resultType instanceof PartialClassResultType && (
          <PartialClassResultTypeViewer
            resultType={storeMappingNode.resultType}
          />
        )}
        <PanelDivider />
        <div className="query-builder__store-mapping-global-graph-fetch__container__btn">
          <Button
            className="btn--dark execution-node-viewer__unsupported-view__to-text-mode__btn"
            onClick={(): void =>
              executionPlanState.setViewMode(EXECUTION_PLAN_VIEW_MODE.JSON)
            }
            text="View JSON"
          />
        </div>
        <PanelDivider />
      </div>
    </PanelContent>
  );
});
