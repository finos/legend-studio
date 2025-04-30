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
  type TreeNodeContainerProps,
  TreeView,
  PURE_DatabaseSchemaIcon,
  PURE_DatabaseTableIcon,
  PURE_DatabaseTabularFunctionIcon,
  CircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  EmptyCircleIcon,
  KeyIcon,
  EyeIcon,
  compareLabelFn,
} from '@finos/legend-art';
import {
  type DatabaseExplorerTreeData,
  type DatabaseSchemaExplorerTreeNodeData,
  DatabaseSchemaExplorerTreeColumnNodeData,
  DatabaseSchemaExplorerTreeSchemaNodeData,
  DatabaseSchemaExplorerTreeTableNodeData,
  DatabaseSchemaExplorerTreeTabularFunctionNodeData,
  type DatabaseSchemaExplorerState,
} from '../../../../stores/editor/editor-state/element-editor-state/connection/DatabaseBuilderState.js';
import { useApplicationStore } from '@finos/legend-application';
import { renderColumnTypeIcon } from './DatabaseEditorHelper.js';
import { flowResult } from 'mobx';
import { stringifyDataType, Table } from '@finos/legend-graph';
import { forwardRef } from 'react';

const getDatabaseSchemaNodeIcon = (
  node: DatabaseSchemaExplorerTreeNodeData,
): React.ReactNode => {
  if (node instanceof DatabaseSchemaExplorerTreeSchemaNodeData) {
    return (
      <div className="database-schema-explorer__icon--schema">
        <PURE_DatabaseSchemaIcon />
      </div>
    );
  } else if (node instanceof DatabaseSchemaExplorerTreeTableNodeData) {
    return (
      <div className="database-schema-explorer__icon--table">
        <PURE_DatabaseTableIcon />
      </div>
    );
  } else if (
    node instanceof DatabaseSchemaExplorerTreeTabularFunctionNodeData
  ) {
    return (
      <div className="database-schema-explorer__icon--tabularFunction">
        <PURE_DatabaseTabularFunctionIcon />
      </div>
    );
  } else if (node instanceof DatabaseSchemaExplorerTreeColumnNodeData) {
    return renderColumnTypeIcon(node.column.type);
  }
  return null;
};

export type DatabaseSchemaExplorerTreeNodeContainerProps =
  TreeNodeContainerProps<
    DatabaseSchemaExplorerTreeNodeData,
    {
      toggleCheckedNode: (node: DatabaseSchemaExplorerTreeNodeData) => void;
      isPartiallySelected: (
        node: DatabaseSchemaExplorerTreeNodeData,
      ) => boolean;
      previewData: (node: DatabaseSchemaExplorerTreeNodeData) => void;
      isPreviewDataDisabled: (
        node: DatabaseSchemaExplorerTreeNodeData,
      ) => boolean;
    }
  >;

export const DatabaseSchemaExplorerTreeNodeContainer = observer(
  forwardRef<HTMLDivElement, DatabaseSchemaExplorerTreeNodeContainerProps>(
    function DatabaseSchemaExplorerTreeNodeContainer(props, ref) {
      const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
      const {
        toggleCheckedNode,
        isPartiallySelected,
        isPreviewDataDisabled,
        previewData,
      } = innerProps;
      const isExpandable =
        Boolean(!node.childrenIds || node.childrenIds.length) &&
        !(node instanceof DatabaseSchemaExplorerTreeColumnNodeData);
      const nodeExpandIcon = isExpandable ? (
        node.isOpen ? (
          <ChevronDownIcon />
        ) : (
          <ChevronRightIcon />
        )
      ) : (
        <div />
      );
      const nodeTypeIcon = getDatabaseSchemaNodeIcon(node);
      const toggleExpandNode = (): void => {
        onNodeSelect?.(node);
        if (!isExpandable) {
          toggleCheckedNode(node);
        }
      };
      const isPrimaryKeyColumn =
        node instanceof DatabaseSchemaExplorerTreeColumnNodeData &&
        node.owner instanceof Table &&
        node.owner.primaryKey.includes(node.column);

      const renderCheckedIcon = (
        _node: DatabaseSchemaExplorerTreeNodeData,
      ): React.ReactNode => {
        if (_node instanceof DatabaseSchemaExplorerTreeColumnNodeData) {
          return null;
        } else if (isPartiallySelected(_node)) {
          return <CircleIcon />;
        } else if (_node.isChecked) {
          return <CheckCircleIcon />;
        }
        return <EmptyCircleIcon />;
      };

      return (
        <div
          className="tree-view__node__container"
          ref={ref}
          style={{
            paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
            display: 'flex',
          }}
          onClick={toggleExpandNode}
        >
          <div className="tree-view__node__icon database-schema-explorer__node__icon__group">
            <div className="database-schema-explorer__expand-icon">
              {nodeExpandIcon}
            </div>
            <div
              className="database-schema-explorer__checker-icon"
              onClick={(event) => {
                event.stopPropagation();
                toggleCheckedNode(node);
              }}
            >
              {renderCheckedIcon(node)}
            </div>
            <div className="database-schema-explorer__type-icon">
              {nodeTypeIcon}
            </div>
          </div>
          <div className="tree-view__node__label database-schema-explorer__node__label">
            {node.label}
            {node instanceof DatabaseSchemaExplorerTreeColumnNodeData && (
              <div className="database-schema-explorer__node__type">
                <div className="database-schema-explorer__node__type__label">
                  {stringifyDataType(node.column.type)}
                </div>
              </div>
            )}
            {isPrimaryKeyColumn && (
              <div
                className="database-schema-explorer__node__pk"
                title="Primary Key"
              >
                <KeyIcon />
              </div>
            )}
            {!isPreviewDataDisabled(node) && (
              <button
                className="query-builder-explorer-tree__node__action"
                tabIndex={-1}
                onClick={(event) => {
                  event.stopPropagation();
                  previewData(node);
                }}
                title="Preview Table Data"
              >
                <EyeIcon />
              </button>
            )}
          </div>
        </div>
      );
    },
  ),
);

export const DatabaseSchemaExplorer = observer(
  (props: {
    schemaExplorerState: DatabaseSchemaExplorerState;
    treeData: DatabaseExplorerTreeData;
    isReadOnly?: boolean | undefined;
    treeNodeContainerComponent?:
      | React.FC<DatabaseSchemaExplorerTreeNodeContainerProps>
      | undefined;
  }) => {
    const { treeData, schemaExplorerState, treeNodeContainerComponent } = props;
    const applicationStore = useApplicationStore();
    const onNodeSelect = (node: DatabaseSchemaExplorerTreeNodeData): void => {
      flowResult(schemaExplorerState.onNodeSelect(node, treeData)).catch(
        applicationStore.alertUnhandledError,
      );
    };
    const getChildNodes = (
      node: DatabaseSchemaExplorerTreeNodeData,
    ): DatabaseSchemaExplorerTreeNodeData[] =>
      schemaExplorerState.getChildNodes(node, treeData)?.sort(compareLabelFn) ??
      [];
    const isPartiallySelected = (
      node: DatabaseSchemaExplorerTreeNodeData,
    ): boolean => {
      if (
        node instanceof DatabaseSchemaExplorerTreeSchemaNodeData &&
        !node.isChecked
      ) {
        return Boolean(
          schemaExplorerState
            .getChildNodes(node, treeData)
            ?.find((childNode) => childNode.isChecked === true),
        );
      }
      return false;
    };
    const toggleCheckedNode = (
      node: DatabaseSchemaExplorerTreeNodeData,
    ): void => schemaExplorerState.toggleCheckedNode(node, treeData);

    const previewData = (node: DatabaseSchemaExplorerTreeNodeData): void => {
      flowResult(schemaExplorerState.previewData(node)).catch(
        applicationStore.alertUnhandledError,
      );
    };

    const isPreviewDataDisabled = (
      node: DatabaseSchemaExplorerTreeNodeData,
    ): boolean =>
      !(
        node instanceof DatabaseSchemaExplorerTreeTableNodeData ||
        node instanceof DatabaseSchemaExplorerTreeColumnNodeData ||
        node instanceof DatabaseSchemaExplorerTreeTabularFunctionNodeData
      );

    return (
      <TreeView
        className="database-schema-explorer"
        components={{
          TreeNodeContainer:
            treeNodeContainerComponent ??
            DatabaseSchemaExplorerTreeNodeContainer,
        }}
        innerProps={{
          toggleCheckedNode,
          isPartiallySelected,
          previewData,
          isPreviewDataDisabled,
        }}
        treeData={treeData}
        onNodeSelect={onNodeSelect}
        getChildNodes={getChildNodes}
      />
    );
  },
);
