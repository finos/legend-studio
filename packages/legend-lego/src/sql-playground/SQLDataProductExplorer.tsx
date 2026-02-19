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
  PURE_DatabaseSchemaIcon,
  PURE_DatabaseIcon,
  AccessPointIcon,
  PURE_FlatDataStoreIcon,
  PURE_DatabaseTableIcon,
  PanelLoadingIndicator,
  type TreeData,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import {
  type DataProductExplorerTreeNodeData,
  DataProductExplorerTreeColumnNodeData,
  DataProductExplorerTreeDataProductNodeData,
  DataProductExplorerTreeIngestNodeData,
  DataProductExplorerTreeAccessPointNodeData,
  DataProductExplorerTreeAccessPointGroupNodeData,
  DataProductExplorerTreeDatasetNodeData,
  DataProductExplorerTreeHeaderNodeData,
  type SQLPlaygroundDataProductExplorerState,
  type DataProductExplorerTreeNodeContainerProps,
} from './store/SqlPlaygroundDataProductExplorerState.js';
import {
  PRECISE_PRIMITIVE_TYPE,
  type V1_RelationTypeColumn,
  V1_PackageableType,
  V1_RelationalDataTypeType,
  PRIMITIVE_TYPE,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { useApplicationStore } from '@finos/legend-application';
import { useDrag } from 'react-dnd';

const SQL_DROP_NODE_DND_TYPE = 'SQL_DROP_NODE_DND_TYPE';

type SqlEditorNodeDragType = { text: string };

export const renderColumnTypeIcon = (
  type: V1_RelationTypeColumn,
): React.ReactNode => {
  const rawType = type.genericType.rawType;
  if (rawType instanceof V1_PackageableType) {
    const typePath = rawType.fullPath;

    if (
      typePath === PRECISE_PRIMITIVE_TYPE.VARCHAR ||
      typePath === V1_RelationalDataTypeType.VARCHAR ||
      typePath === V1_RelationalDataTypeType.CHAR
    ) {
      return (
        <StringTypeIcon className="relation-source-tree__icon relation-source-tree__icon__string" />
      );
    }

    if (
      typePath === PRECISE_PRIMITIVE_TYPE.BIG_INT ||
      typePath === PRECISE_PRIMITIVE_TYPE.DECIMAL ||
      typePath === PRECISE_PRIMITIVE_TYPE.DOUBLE ||
      typePath === PRECISE_PRIMITIVE_TYPE.FLOAT ||
      typePath === PRECISE_PRIMITIVE_TYPE.INT ||
      typePath === PRECISE_PRIMITIVE_TYPE.NUMERIC ||
      typePath === PRECISE_PRIMITIVE_TYPE.SMALL_INT ||
      typePath === PRECISE_PRIMITIVE_TYPE.TINY_INT ||
      typePath === PRECISE_PRIMITIVE_TYPE.U_BIG_INT ||
      typePath === V1_RelationalDataTypeType.BIGINT ||
      typePath === V1_RelationalDataTypeType.DOUBLE ||
      typePath === V1_RelationalDataTypeType.SMALLINT ||
      typePath === V1_RelationalDataTypeType.INTEGER ||
      typePath === 'Int'
    ) {
      return (
        <HashtagIcon className="relation-source-tree__icon relation-source-tree__icon__number" />
      );
    }
    if (
      typePath === PRECISE_PRIMITIVE_TYPE.STRICTDATE ||
      typePath === PRECISE_PRIMITIVE_TYPE.STRICTTIME ||
      typePath === PRECISE_PRIMITIVE_TYPE.DATETIME ||
      typePath === PRECISE_PRIMITIVE_TYPE.TIMESTAMP ||
      typePath === V1_RelationalDataTypeType.TIMESTAMP ||
      typePath === V1_RelationalDataTypeType.DATE ||
      typePath === PRIMITIVE_TYPE.STRICTDATE
    ) {
      return (
        <ClockIcon className="relation-source-tree__icon relation-source-tree__icon__time" />
      );
    }
  }
  return (
    <QuestionCircleIcon className="relation-source-tree__icon relation-source-tree__icon__unknown" />
  );
};

const getDataProductNodeIcon = (
  node: DataProductExplorerTreeNodeData,
): React.ReactNode => {
  if (node instanceof DataProductExplorerTreeColumnNodeData) {
    return renderColumnTypeIcon(node.column);
  }
  if (node instanceof DataProductExplorerTreeDataProductNodeData) {
    return (
      <div className="dataproduct-schema-explorer__icon--schema">
        <PURE_DatabaseSchemaIcon />
      </div>
    );
  }
  if (node instanceof DataProductExplorerTreeIngestNodeData) {
    return (
      <div className="dataproduct-schema-explorer__icon--schema">
        <PURE_DatabaseIcon />
      </div>
    );
  }
  if (node instanceof DataProductExplorerTreeAccessPointGroupNodeData) {
    return (
      <div className="dataproduct-schema-explorer__icon--table">
        <PURE_FlatDataStoreIcon />
      </div>
    );
  }
  if (node instanceof DataProductExplorerTreeAccessPointNodeData) {
    return (
      <div className="dataproduct-schema-explorer__icon--table">
        <AccessPointIcon />
      </div>
    );
  }
  if (node instanceof DataProductExplorerTreeDatasetNodeData) {
    return (
      <div className="dataproduct-schema-explorer__icon--table">
        <PURE_DatabaseTableIcon />
      </div>
    );
  }
  return null;
};

export const DataProductExplorerTreeNodeContainer = observer(
  forwardRef<HTMLDivElement, DataProductExplorerTreeNodeContainerProps>(
    function DataProductExplorerTreeNodeContainer(props, ref) {
      const { node, level, onNodeSelect, innerProps } = props;
      const { toggleCheckedNode } = innerProps;
      const isExpandable =
        Boolean(!node.childrenIds || node.childrenIds.length) &&
        !(node instanceof DataProductExplorerTreeColumnNodeData);
      const nodeExpandIcon = isExpandable ? (
        node.isOpen ? (
          <ChevronDownIcon />
        ) : (
          <ChevronRightIcon />
        )
      ) : (
        <div />
      );
      const nodeTypeIcon = getDataProductNodeIcon(node);
      const toggleExpandNode = (): void => {
        onNodeSelect?.(node);
        if (!isExpandable) {
          toggleCheckedNode(node);
        }
      };

      return (
        <div
          className={`tree-view__node__container dataproduct-schema-explorer__node__container dataproduct-schema-explorer__node__container--level-${Math.min(level, 6)}`}
          ref={ref}
          onClick={toggleExpandNode}
        >
          <div className="tree-view__node__icon dataproduct-schema-explorer__node__icon__group">
            <div className="dataproduct-schema-explorer__expand-icon">
              {nodeExpandIcon}
            </div>
          </div>
          {nodeTypeIcon && (
            <div className="dataproduct-schema-explorer__type-icon">
              {nodeTypeIcon}
            </div>
          )}
          <div className="tree-view__node__label dataproduct-schema-explorer__node__label">
            {node.label}
          </div>
        </div>
      );
    },
  ),
);

export const DataProductSchemaExplorer = observer(
  (props: {
    schemaExplorerState: SQLPlaygroundDataProductExplorerState;
    treeData: TreeData<DataProductExplorerTreeNodeData>;
    isReadOnly?: boolean;
    treeNodeContainerComponent?:
      | React.FC<DataProductExplorerTreeNodeContainerProps>
      | undefined;
  }) => {
    const { treeData, schemaExplorerState, treeNodeContainerComponent } = props;
    const applicationStore = useApplicationStore();
    const onNodeSelect = (node: DataProductExplorerTreeNodeData): void => {
      flowResult(schemaExplorerState.onNodeSelect(node, treeData)).catch(
        applicationStore.alertUnhandledError,
      );
    };
    const getChildNodes = (
      node: DataProductExplorerTreeNodeData,
    ): DataProductExplorerTreeNodeData[] =>
      schemaExplorerState.getChildNodes(node, treeData)?.sort(compareLabelFn) ??
      [];
    const isPartiallySelected = (
      node: DataProductExplorerTreeNodeData,
    ): boolean => {
      if (
        node instanceof DataProductExplorerTreeDataProductNodeData &&
        !node.isChecked
      ) {
        return (
          schemaExplorerState
            .getChildNodes(node, treeData)
            ?.some((childNode) => childNode.isChecked) ?? false
        );
      }
      return false;
    };
    const toggleCheckedNode = (node: DataProductExplorerTreeNodeData): void =>
      schemaExplorerState.toggleCheckedNode(node, treeData);

    return (
      <TreeView
        className="dataproduct-schema-explorer"
        components={{
          TreeNodeContainer:
            treeNodeContainerComponent ?? DataProductExplorerTreeNodeContainer,
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

const SQLPlaygroundDataProductExplorerTreeNodeContainer = observer(
  (props: DataProductExplorerTreeNodeContainerProps) => {
    const { node } = props;
    const ref = useRef<HTMLDivElement | null>(null);

    const isDraggable =
      !(node instanceof DataProductExplorerTreeHeaderNodeData) &&
      !(node instanceof DataProductExplorerTreeAccessPointGroupNodeData);

    const dragText =
      node instanceof DataProductExplorerTreeColumnNodeData
        ? 'name' in node.owner
          ? `${node.owner.name}.${node.label}`
          : `${node.parentId}.${node.label}`
        : node instanceof DataProductExplorerTreeAccessPointNodeData
          ? `${node.dataProductPath}.${node.accessPoint.id}`
          : node instanceof DataProductExplorerTreeDatasetNodeData
            ? `${node.parentId}.${node.dataset.name}`
            : node instanceof DataProductExplorerTreeDataProductNodeData
              ? node.id
              : node instanceof DataProductExplorerTreeIngestNodeData
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

    return <DataProductExplorerTreeNodeContainer {...props} ref={ref} />;
  },
);

export const SQLPlaygroundExplorer = observer(
  (props: {
    dataProductSchemaState: SQLPlaygroundDataProductExplorerState;
  }) => {
    const { dataProductSchemaState } = props;

    return (
      <div className="sql-playground__explorer">
        <PanelLoadingIndicator
          isLoading={Boolean(dataProductSchemaState.isGeneratingDataProduct)}
        />
        {dataProductSchemaState.treeData && (
          <DataProductSchemaExplorer
            treeData={dataProductSchemaState.treeData}
            schemaExplorerState={dataProductSchemaState}
            treeNodeContainerComponent={
              SQLPlaygroundDataProductExplorerTreeNodeContainer
            }
          />
        )}
      </div>
    );
  },
);
