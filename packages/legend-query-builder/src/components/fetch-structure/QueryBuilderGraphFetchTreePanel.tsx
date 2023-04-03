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

import { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { useDrop } from 'react-dnd';
import {
  type TreeNodeContainerProps,
  clsx,
  TreeView,
  BlankPanelPlaceholder,
  ChevronDownIcon,
  ChevronRightIcon,
  TimesIcon,
  CheckSquareIcon,
  SquareIcon,
  InfoCircleIcon,
  PanelDropZone,
  BlankPanelContent,
  Dialog,
  ModalHeader,
  Modal,
  ModalBody,
  Panel,
  PanelForm,
  PanelFormTextField,
  PanelFormBooleanField,
  ModalFooterButton,
  ModalFooter,
  SerializeIcon,
} from '@finos/legend-art';
import { QUERY_BUILDER_TEST_ID } from '../../application/QueryBuilderTesting.js';
import { isNonNullable } from '@finos/legend-shared';
import {
  type QueryBuilderGraphFetchTreeData,
  type QueryBuilderGraphFetchTreeNodeData,
  removeNodeRecursively,
  isGraphFetchTreeDataEmpty,
} from '../../stores/fetch-structure/graph-fetch/QueryBuilderGraphFetchTreeUtil.js';
import {
  type QueryBuilderExplorerTreeDragSource,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
} from '../../stores/explorer/QueryBuilderExplorerState.js';
import {
  GraphFetchPureSerializationState,
  PureSerializationConfig,
  type QueryBuilderGraphFetchTreeState,
} from '../../stores/fetch-structure/graph-fetch/QueryBuilderGraphFetchTreeState.js';
import { getClassPropertyIcon } from '../shared/ElementIconUtils.js';
import { QueryBuilderTextEditorMode } from '../../stores/QueryBuilderTextEditorState.js';

const QueryBuilderGraphFetchTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    QueryBuilderGraphFetchTreeNodeData,
    {
      isReadOnly: boolean;
      removeNode: (node: QueryBuilderGraphFetchTreeNodeData) => void;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  const { removeNode } = innerProps;
  const property = node.tree.property.value;
  const type = property.genericType.value.rawType;
  const subType = node.tree.subType?.value;
  const isExpandable = Boolean(node.childrenIds.length);
  const nodeExpandIcon = isExpandable ? (
    node.isOpen ? (
      <ChevronDownIcon />
    ) : (
      <ChevronRightIcon />
    )
  ) : (
    <div />
  );
  const nodeTypeIcon = getClassPropertyIcon(type);
  const toggleExpandNode = (): void => onNodeSelect?.(node);
  const deleteNode = (): void => removeNode(node);

  return (
    <div
      className="tree-view__node__container query-builder-graph-fetch-tree__node__container"
      style={{
        paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 2)}rem`,
        display: 'flex',
      }}
    >
      <div className="query-builder-graph-fetch-tree__node__content">
        <div className="tree-view__node__icon query-builder-graph-fetch-tree__node__icon">
          <div
            className="query-builder-graph-fetch-tree__expand-icon"
            onClick={toggleExpandNode}
          >
            {nodeExpandIcon}
          </div>
          <div
            className="query-builder-graph-fetch-tree__type-icon"
            onClick={toggleExpandNode}
          >
            {nodeTypeIcon}
          </div>
        </div>
        <div
          className="tree-view__node__label query-builder-graph-fetch-tree__node__label"
          onClick={toggleExpandNode}
        >
          {node.label}
          {/* TODO: support alias */}
          {/* TODO: qualified properties */}
          {/* TODO: think of a better layout to represent subtype */}
          {subType && (
            <div className="query-builder-graph-fetch-tree__node__sub-type">
              <div className="query-builder-graph-fetch-tree__node__sub-type__label">
                {subType.name}
              </div>
            </div>
          )}
          {
            <div className="query-builder-graph-fetch-tree__node__type">
              <div className="query-builder-graph-fetch-tree__node__type__label">
                {type.name}
              </div>
            </div>
          }
        </div>
      </div>
      <div className="query-builder-graph-fetch-tree__node__actions">
        <button
          className="query-builder-graph-fetch-tree__node__action"
          title="Remove"
          tabIndex={-1}
          onClick={deleteNode}
        >
          <TimesIcon />
        </button>
      </div>
    </div>
  );
};

const PureSerializationConfigModal = observer(
  (props: {
    pureSerializationState: GraphFetchPureSerializationState;
    graphFetchState: QueryBuilderGraphFetchTreeState;
    config: PureSerializationConfig;
  }) => {
    const { pureSerializationState, graphFetchState, config } = props;
    const applicationStore = graphFetchState.queryBuilderState.applicationStore;
    const toAdd = !pureSerializationState.config;
    const handleAction = (): void => {
      if (toAdd) {
        pureSerializationState.setConfig(config);
      }
      pureSerializationState.setConfigModal(false);
    };
    const removeConfig = (): void => {
      pureSerializationState.setConfig(undefined);
      pureSerializationState.setConfigModal(false);
      graphFetchState.queryBuilderState.applicationStore.notificationService.notifySuccess(
        'Serialization config removed',
      );
    };
    const close = (): void => pureSerializationState.setConfigModal(false);
    return (
      <Dialog
        open={pureSerializationState.configModal}
        onClose={close}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="query-builder-graph-fetch-config"
        >
          <ModalHeader
            title={`${
              toAdd ? 'Add Serialization Config' : 'Edit Serialization Config'
            }`}
          />
          <ModalBody className="query-builder-graph-fetch-config__content">
            <Panel>
              <PanelForm>
                <PanelFormTextField
                  name="Type Key Name"
                  value={config.typeKeyName}
                  isReadOnly={false}
                  update={(value: string | undefined): void =>
                    config.setTypeName(value ?? '')
                  }
                  errorMessage={
                    config.typeKeyName === ''
                      ? `Type key name can't be empty`
                      : undefined
                  }
                />
                <PanelFormBooleanField
                  name="Include Type"
                  value={config.includeType}
                  isReadOnly={false}
                  update={(value: boolean | undefined): void =>
                    config.setIncludeType(Boolean(value))
                  }
                />

                <PanelFormBooleanField
                  name="Include Enum Type"
                  value={config.includeEnumType}
                  isReadOnly={false}
                  update={(value: boolean | undefined): void =>
                    config.setInclueEnumType(Boolean(value))
                  }
                />

                <PanelFormBooleanField
                  name="Remove Properties With Null Values"
                  value={config.removePropertiesWithNullValues}
                  isReadOnly={false}
                  update={(value: boolean | undefined): void =>
                    config.setRemovePropertiesWithNullValues(Boolean(value))
                  }
                />

                <PanelFormBooleanField
                  name="Remove properties with empty sets"
                  value={config.removePropertiesWithEmptySets}
                  isReadOnly={false}
                  update={(value: boolean | undefined): void =>
                    config.setRemovePropertiesWithEmptySets(Boolean(value))
                  }
                />

                <PanelFormBooleanField
                  name="Use Fully Qualified Type Path"
                  value={config.fullyQualifiedTypePath}
                  isReadOnly={false}
                  update={(value: boolean | undefined): void =>
                    config.setFullyQualifiedTypePath(Boolean(value))
                  }
                />
                <PanelFormBooleanField
                  name="Include Object Reference"
                  value={config.includeObjectReference}
                  isReadOnly={false}
                  update={(value: boolean | undefined): void =>
                    config.setIncludeObjectReference(Boolean(value))
                  }
                />
              </PanelForm>
            </Panel>
          </ModalBody>
          <ModalFooter>
            {!toAdd && (
              <ModalFooterButton
                className="btn--caution"
                text="Remove Config"
                onClick={removeConfig}
              />
            )}
            <button
              className="btn modal__footer__close-btn btn--dark"
              onClick={handleAction}
            >
              {toAdd ? 'Add Config' : 'Close'}
            </button>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

export const QueryBuilderGraphFetchTreeExplorer = observer(
  (props: {
    graphFetchState: QueryBuilderGraphFetchTreeState;
    pureSerializationState: GraphFetchPureSerializationState;
    treeData: QueryBuilderGraphFetchTreeData;
    updateTreeData: (data: QueryBuilderGraphFetchTreeData) => void;
    isReadOnly: boolean;
  }) => {
    const {
      graphFetchState,
      pureSerializationState,
      treeData,
      updateTreeData,
      isReadOnly,
    } = props;

    const onNodeSelect = (node: QueryBuilderGraphFetchTreeNodeData): void => {
      if (node.childrenIds.length) {
        node.isOpen = !node.isOpen;
      }
      updateTreeData({ ...treeData });
    };

    const getChildNodes = (
      node: QueryBuilderGraphFetchTreeNodeData,
    ): QueryBuilderGraphFetchTreeNodeData[] =>
      node.childrenIds
        .map((id) => treeData.nodes.get(id))
        .filter(isNonNullable);

    const removeNode = (node: QueryBuilderGraphFetchTreeNodeData): void => {
      removeNodeRecursively(treeData, node);
      updateTreeData({ ...treeData });
    };

    const toggleChecked = (): void =>
      graphFetchState.setChecked(!graphFetchState.isChecked);

    const openConfigModal = (): void => {
      pureSerializationState.setConfigModal(true);
    };

    return (
      <div className="query-builder-graph-fetch-tree">
        <div className="query-builder-graph-fetch-tree__toolbar">
          <div className="query-builder-graph-fetch-tree__actions">
            <button
              className="query-builder-graph-fetch-tree__actions__action-btn__label"
              onClick={openConfigModal}
              title={`${
                pureSerializationState.config
                  ? 'Edit pure serialization config'
                  : 'Add pure serialization config'
              }`}
              tabIndex={-1}
            >
              <SerializeIcon className="query-builder-graph-fetch-tree__actions__action-btn__label__icon" />
              <div className="query-builder-graph-fetch-tree__actions__action-btn__label__title">
                {pureSerializationState.config ? 'Edit Config' : 'Add Config'}
              </div>
            </button>
          </div>
          <div
            className={clsx('panel__content__form__section__toggler')}
            onClick={toggleChecked}
          >
            <button
              className={clsx('panel__content__form__section__toggler__btn', {
                'panel__content__form__section__toggler__btn--toggled':
                  graphFetchState.isChecked,
              })}
            >
              {graphFetchState.isChecked ? <CheckSquareIcon /> : <SquareIcon />}
            </button>
            <div className="panel__content__form__section__toggler__prompt">
              Check graph fetch
            </div>
            <div className="query-builder-graph-fetch-tree__toolbar__hint-icon">
              <InfoCircleIcon title="With this enabled, while executing, violations of constraints will reported as part of the result, rather than causing a failure" />
            </div>
          </div>
        </div>
        <div className="query-builder-graph-fetch-tree__container">
          {pureSerializationState.configModal && (
            <PureSerializationConfigModal
              pureSerializationState={pureSerializationState}
              graphFetchState={graphFetchState}
              config={
                pureSerializationState.config ?? new PureSerializationConfig()
              }
            />
          )}
          <TreeView
            components={{
              TreeNodeContainer: QueryBuilderGraphFetchTreeNodeContainer,
            }}
            treeData={treeData}
            onNodeSelect={onNodeSelect}
            getChildNodes={getChildNodes}
            innerProps={{
              isReadOnly,
              removeNode,
            }}
          />
        </div>
      </div>
    );
  },
);

const QueryBuilderGraphFetchTreePanel = observer(
  (props: {
    graphFetchTreeState: QueryBuilderGraphFetchTreeState;

    pureSerializationState: GraphFetchPureSerializationState;
  }) => {
    const { graphFetchTreeState, pureSerializationState } = props;
    const treeData = graphFetchTreeState.treeData;

    // Deep/Graph Fetch Tree
    const updateTreeData = (data: QueryBuilderGraphFetchTreeData): void => {
      graphFetchTreeState.setGraphFetchTree(data);
    };

    // Drag and Drop
    const handleDrop = useCallback(
      (item: QueryBuilderExplorerTreeDragSource): void => {
        graphFetchTreeState.addProperty(item.node, { refreshTreeData: true });
      },
      [graphFetchTreeState],
    );
    const [{ isDragOver }, dropTargetConnector] = useDrop<
      QueryBuilderExplorerTreeDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: [
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
        ],
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item);
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_GRAPH_FETCH}
        className="panel__content"
      >
        <PanelDropZone
          isDragOver={isDragOver}
          dropTargetConnector={dropTargetConnector}
        >
          {(!treeData || isGraphFetchTreeDataEmpty(treeData)) && (
            <BlankPanelPlaceholder
              text="Add a graph fetch property"
              tooltipText="Drag and drop properties here"
            />
          )}
          {treeData && !isGraphFetchTreeDataEmpty(treeData) && (
            <QueryBuilderGraphFetchTreeExplorer
              graphFetchState={graphFetchTreeState}
              pureSerializationState={pureSerializationState}
              treeData={treeData}
              isReadOnly={false}
              updateTreeData={updateTreeData}
            />
          )}
        </PanelDropZone>
      </div>
    );
  },
);

export const QueryBuilderGraphFetchPanel = observer(
  (props: { graphFetchTreeState: QueryBuilderGraphFetchTreeState }) => {
    const { graphFetchTreeState } = props;
    const serializationState = graphFetchTreeState.serializationState;
    const handleTextModeClick = (): void =>
      graphFetchTreeState.queryBuilderState.textEditorState.openModal(
        QueryBuilderTextEditorMode.TEXT,
      );
    if (serializationState instanceof GraphFetchPureSerializationState) {
      return (
        <QueryBuilderGraphFetchTreePanel
          graphFetchTreeState={graphFetchTreeState}
          pureSerializationState={serializationState}
        />
      );
    }
    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_GRAPH_FETCH}
        className="panel__content"
      >
        <BlankPanelContent>
          <div className="unsupported-element-editor__main">
            <div className="unsupported-element-editor__summary">
              Unsupported Graph Fetch Serialization Type
            </div>

            <button
              className="btn--dark unsupported-element-editor__to-text-mode__btn"
              onClick={handleTextModeClick}
            >
              Edit in text mode
            </button>
          </div>
        </BlankPanelContent>
      </div>
    );
  },
);
