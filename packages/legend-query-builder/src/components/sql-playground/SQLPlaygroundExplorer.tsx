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

import React, { forwardRef, useRef } from 'react';
import {
  TreeView,
  StringTypeIcon,
  HashtagIcon,
  ClockIcon,
  QuestionCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  compareLabelFn,
  AccessPointIcon,
  PURE_FlatDataStoreIcon,
  PURE_DatabaseTableIcon,
  PURE_IngestIcon,
  PanelLoadingIndicator,
  type TreeData,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import {
  type AccessorExplorerTreeNodeData,
  AccessorExplorerTreeColumnNodeData,
  AccessorExplorerTreeDataProductNodeData,
  AccessorExplorerTreeIngestNodeData,
  AccessorExplorerTreeAccessPointNodeData,
  AccessorExplorerTreeAccessPointGroupNodeData,
  AccessorExplorerTreeDatasetNodeData,
  AccessorExplorerTreeHeaderNodeData,
  type SQLPlaygroundAccessorExplorerState,
  type AccessorExplorerTreeNodeContainerProps,
} from '../../stores/sql-playground/SqlPlaygroundAccessorExplorerState.js';
import {
  PRECISE_PRIMITIVE_TYPE,
  type V1_RelationTypeColumn,
  V1_PackageableType,
  PRIMITIVE_TYPE,
  V1_AccessPoint,
  extractElementNameFromPath,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { useApplicationStore } from '@finos/legend-application';
import { useDrag } from 'react-dnd';

const SQL_DROP_NODE_DND_TYPE = 'SQL_DROP_NODE_DND_TYPE';

type SqlEditorNodeDragType = { text: string };

const STRING_TYPE_NAMES = new Set([
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.VARCHAR),
]);

const NUMERIC_TYPE_NAMES = new Set([
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.BIG_INT),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.DECIMAL),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.DOUBLE),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.FLOAT),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.INT),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.NUMERIC),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.SMALL_INT),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.TINY_INT),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.U_BIG_INT),
]);

const DATE_TYPE_NAMES = new Set([
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.STRICTDATE),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.STRICTTIME),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.DATETIME),
  extractElementNameFromPath(PRECISE_PRIMITIVE_TYPE.TIMESTAMP),
  extractElementNameFromPath(PRIMITIVE_TYPE.STRICTDATE),
]);

export const renderColumnTypeIcon = (
  type: V1_RelationTypeColumn,
): React.ReactNode => {
  const rawType = type.genericType.rawType;
  if (rawType instanceof V1_PackageableType) {
    const typeName = extractElementNameFromPath(rawType.fullPath);

    if (STRING_TYPE_NAMES.has(typeName)) {
      return (
        <StringTypeIcon className="relation-source-tree__icon relation-source-tree__icon__string" />
      );
    }
    if (NUMERIC_TYPE_NAMES.has(typeName)) {
      return (
        <HashtagIcon className="relation-source-tree__icon relation-source-tree__icon__number" />
      );
    }
    if (DATE_TYPE_NAMES.has(typeName)) {
      return (
        <ClockIcon className="relation-source-tree__icon relation-source-tree__icon__time" />
      );
    }
  }
  return (
    <QuestionCircleIcon className="relation-source-tree__icon relation-source-tree__icon__unknown" />
  );
};

const getAccessorNodeIcon = (
  node: AccessorExplorerTreeNodeData,
): React.ReactNode => {
  if (node instanceof AccessorExplorerTreeColumnNodeData) {
    return renderColumnTypeIcon(node.column);
  }
  if (node instanceof AccessorExplorerTreeDataProductNodeData) {
    return (
      <div className="Accessor-schema-explorer__icon--schema">
        <AccessPointIcon />
      </div>
    );
  }
  if (node instanceof AccessorExplorerTreeIngestNodeData) {
    return (
      <div className="Accessor-schema-explorer__icon--schema">
        <PURE_IngestIcon />
      </div>
    );
  }
  if (node instanceof AccessorExplorerTreeAccessPointGroupNodeData) {
    return (
      <div className="Accessor-schema-explorer__icon--table">
        <PURE_FlatDataStoreIcon />
      </div>
    );
  }
  if (
    node instanceof AccessorExplorerTreeAccessPointNodeData ||
    node instanceof AccessorExplorerTreeDatasetNodeData
  ) {
    return (
      <div className="Accessor-schema-explorer__icon--table">
        <PURE_DatabaseTableIcon />
      </div>
    );
  }
  return null;
};

export const AccessorExplorerTreeNodeContainer = observer(
  forwardRef<HTMLDivElement, AccessorExplorerTreeNodeContainerProps>(
    function AccessorExplorerTreeNodeContainer(props, ref) {
      const { node, level, onNodeSelect, innerProps } = props;
      const { toggleCheckedNode } = innerProps;
      const isExpandable =
        Boolean(!node.childrenIds || node.childrenIds.length) &&
        !(node instanceof AccessorExplorerTreeColumnNodeData);
      const nodeExpandIcon = isExpandable ? (
        node.isOpen ? (
          <ChevronDownIcon />
        ) : (
          <ChevronRightIcon />
        )
      ) : (
        <div />
      );
      const nodeTypeIcon = getAccessorNodeIcon(node);
      const toggleExpandNode = (): void => {
        onNodeSelect?.(node);
        if (!isExpandable) {
          toggleCheckedNode(node);
        }
      };

      return (
        <div
          className={`tree-view__node__container Accessor-schema-explorer__node__container Accessor-schema-explorer__node__container--level-${Math.min(level, 6)}`}
          ref={ref}
          onClick={toggleExpandNode}
        >
          <div className="tree-view__node__icon Accessor-schema-explorer__node__icon__group">
            <div className="Accessor-schema-explorer__expand-icon">
              {nodeExpandIcon}
            </div>
          </div>
          {nodeTypeIcon && (
            <div className="Accessor-schema-explorer__type-icon">
              {nodeTypeIcon}
            </div>
          )}
          <div className="tree-view__node__label Accessor-schema-explorer__node__label">
            {node.label}
          </div>
        </div>
      );
    },
  ),
);

export const SQLAccessorExplorer = observer(
  (props: {
    accessorExplorerState: SQLPlaygroundAccessorExplorerState;
    treeData: TreeData<AccessorExplorerTreeNodeData>;
    isReadOnly?: boolean;
    treeNodeContainerComponent?:
      | React.FC<AccessorExplorerTreeNodeContainerProps>
      | undefined;
  }) => {
    const { treeData, accessorExplorerState, treeNodeContainerComponent } =
      props;
    const applicationStore = useApplicationStore();
    const onNodeSelect = (node: AccessorExplorerTreeNodeData): void => {
      flowResult(accessorExplorerState.onNodeSelect(node, treeData)).catch(
        applicationStore.alertUnhandledError,
      );
    };
    const getChildNodes = (
      node: AccessorExplorerTreeNodeData,
    ): AccessorExplorerTreeNodeData[] =>
      accessorExplorerState
        .getChildNodes(node, treeData)
        ?.sort(compareLabelFn) ?? [];
    const isPartiallySelected = (
      node: AccessorExplorerTreeNodeData,
    ): boolean => {
      if (
        node instanceof AccessorExplorerTreeDataProductNodeData &&
        !node.isChecked
      ) {
        return (
          accessorExplorerState
            .getChildNodes(node, treeData)
            ?.some((childNode) => childNode.isChecked) ?? false
        );
      }
      return false;
    };
    const toggleCheckedNode = (node: AccessorExplorerTreeNodeData): void =>
      accessorExplorerState.toggleCheckedNode(node, treeData);

    return (
      <TreeView
        className="Accessor-schema-explorer"
        components={{
          TreeNodeContainer:
            treeNodeContainerComponent ?? AccessorExplorerTreeNodeContainer,
        }}
        innerProps={{
          toggleCheckedNode,
          isPartiallySelected,
        }}
        treeData={treeData}
        onNodeSelect={onNodeSelect}
        getChildNodes={getChildNodes}
      />
    );
  },
);

const SQLPlaygroundAccessorExplorerTreeNodeContainer = observer(
  (props: AccessorExplorerTreeNodeContainerProps) => {
    const { node } = props;
    const ref = useRef<HTMLDivElement | null>(null);

    const isDraggable =
      !(node instanceof AccessorExplorerTreeHeaderNodeData) &&
      !(node instanceof AccessorExplorerTreeAccessPointGroupNodeData);

    const dragText =
      node instanceof AccessorExplorerTreeColumnNodeData
        ? node.owner instanceof V1_AccessPoint
          ? `${node.parentId}.${node.label}`
          : `${node.owner.name}.${node.label}`
        : node instanceof AccessorExplorerTreeAccessPointNodeData
          ? `${node.dataProductPath}.${node.accessPoint.id}`
          : node instanceof AccessorExplorerTreeDatasetNodeData
            ? `${node.parentId}.${node.dataset.name}`
            : node instanceof AccessorExplorerTreeDataProductNodeData
              ? node.id
              : node instanceof AccessorExplorerTreeIngestNodeData
                ? node.id
                : node.id;

    const [, dragConnector] = useDrag<SqlEditorNodeDragType>(
      () => ({
        type: SQL_DROP_NODE_DND_TYPE,
        item: {
          text: dragText,
        },
        canDrag: isDraggable,
      }),
      [node, isDraggable],
    );

    if (isDraggable) {
      dragConnector(ref);
    }

    return <AccessorExplorerTreeNodeContainer {...props} ref={ref} />;
  },
);

export const SQLPlaygroundExplorer = observer(
  (props: { accessorExplorerState: SQLPlaygroundAccessorExplorerState }) => {
    const { accessorExplorerState } = props;

    return (
      <div className="sql-playground__explorer">
        <PanelLoadingIndicator
          isLoading={Boolean(accessorExplorerState.isGeneratingAccessor)}
        />
        {accessorExplorerState.treeData && (
          <SQLAccessorExplorer
            treeData={accessorExplorerState.treeData}
            accessorExplorerState={accessorExplorerState}
            treeNodeContainerComponent={
              SQLPlaygroundAccessorExplorerTreeNodeContainer
            }
          />
        )}
      </div>
    );
  },
);
