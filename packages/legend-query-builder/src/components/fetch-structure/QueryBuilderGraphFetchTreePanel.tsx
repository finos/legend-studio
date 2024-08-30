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

import { useCallback, useEffect } from 'react';
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
  ResizablePanel,
  ResizablePanelSplitter,
  ResizablePanelGroup,
  BufferIcon,
  CustomSelectorInput,
  FolderIcon,
  PURE_UnknownElementTypeIcon,
} from '@finos/legend-art';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import {
  deepClone,
  filterByType,
  guaranteeNonNullable,
  isNonNullable,
  prettyCONSTName,
} from '@finos/legend-shared';
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
  type GraphFetchSerializationState,
  GraphFetchExternalFormatSerializationState,
  GraphFetchPureSerializationState,
  PureSerializationConfig,
  SERIALIZATION_TYPE,
  type QueryBuilderGraphFetchTreeState,
} from '../../stores/fetch-structure/graph-fetch/QueryBuilderGraphFetchTreeState.js';
import { QueryBuilderTextEditorMode } from '../../stores/QueryBuilderTextEditorState.js';
import {
  type PackageableElement,
  Binding,
  Package,
  getAllDescendantsOfPackage,
  PropertyGraphFetchTree,
  RootGraphFetchTree,
} from '@finos/legend-graph';
import {
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import {
  buildElementOption,
  getClassPropertyIcon,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import { QueryBuilderTelemetryHelper } from '../../__lib__/QueryBuilderTelemetryHelper.js';

const getBindingFormatter = (props: {
  darkMode?: boolean;
}): ((
  option: PackageableElementOption<PackageableElement>,
) => React.ReactNode) =>
  function BindingLabel(
    option: PackageableElementOption<PackageableElement>,
  ): React.ReactNode {
    const className = props.darkMode
      ? 'packageable-element-option-label--dark'
      : 'packageable-element-option-label';
    return (
      <div className={className}>
        <div className={`${className}__name`}>{option.label}</div>
        {option.value.package && (
          <div className={`${className}__tag`}>{option.value.path}</div>
        )}
        <div className={`${className}__tag`}>
          {(option.value as Binding).contentType}
        </div>
      </div>
    );
  };

export const QueryBuilderGraphFetchTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    QueryBuilderGraphFetchTreeNodeData,
    {
      isReadOnly: boolean;
      removeNode?: (node: QueryBuilderGraphFetchTreeNodeData) => void;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  const { isReadOnly, removeNode } = innerProps;
  let property, type, subType;
  if (node.tree instanceof PropertyGraphFetchTree) {
    property = node.tree.property.value;
    type = property.genericType.value.rawType;
    subType = node.tree.subType?.value;
  } else if (node.tree instanceof RootGraphFetchTree) {
    type = node.tree.class.value;
  }

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
  const nodeTypeIcon = type ? (
    getClassPropertyIcon(type)
  ) : (
    <PURE_UnknownElementTypeIcon />
  );
  const toggleExpandNode = (): void => onNodeSelect?.(node);
  const deleteNode = (): void => removeNode?.(node);

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
                {type?.name}
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
          disabled={isReadOnly}
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
                <PanelFormTextField
                  name="Date Time Format"
                  value={config.dateTimeFormat}
                  isReadOnly={false}
                  update={(value: string | undefined): void =>
                    config.setDateTimeFormat(value === '' ? undefined : value)
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
            <ModalFooterButton
              className="modal__footer__close-btn"
              onClick={handleAction}
              type={toAdd ? 'primary' : 'secondary'}
            >
              {toAdd ? 'Add Config' : 'Close'}
            </ModalFooterButton>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

export const QueryBuilderGraphFetchExternalConfig = observer(
  (props: {
    graphFetchState: QueryBuilderGraphFetchTreeState;
    serializationState: GraphFetchExternalFormatSerializationState;
    serializationTreeData: QueryBuilderGraphFetchTreeData;
    bindings: Binding[];
    isReadOnly: boolean;
  }) => {
    const {
      graphFetchState,
      serializationState,
      serializationTreeData,
      bindings,
      isReadOnly,
    } = props;
    const bindingOptions = bindings.map((result) => buildElementOption(result));
    const selectedBinding = {
      value: serializationState.targetBinding,
      label: serializationState.targetBinding.name,
    };
    const applicationStore = graphFetchState.queryBuilderState.applicationStore;
    const onBindingChange = (
      val: PackageableElementOption<Binding> | null,
    ): void => {
      if (val !== null) {
        serializationState.setBinding(val.value);
        serializationState.setGraphFetchTree(serializationTreeData);
      }
    };
    const onNodeSelect = (node: QueryBuilderGraphFetchTreeNodeData): void => {
      if (node.childrenIds.length) {
        node.isOpen = !node.isOpen;
      }
    };
    const getChildNodes = (
      node: QueryBuilderGraphFetchTreeNodeData,
    ): QueryBuilderGraphFetchTreeNodeData[] =>
      node.childrenIds
        .map((id) => serializationTreeData.nodes.get(id))
        .filter(isNonNullable);
    const removeNode = (node: QueryBuilderGraphFetchTreeNodeData): void => {
      if (serializationTreeData.nodes.size === 1) {
        graphFetchState.queryBuilderState.applicationStore.notificationService.notifyWarning(
          'externalize serialization tree can not be empty',
        );
      } else {
        removeNodeRecursively(serializationTreeData, node);
        serializationState.setGraphFetchTree({ ...serializationTreeData });
      }
    };

    return (
      <div className="query-builder-graph-fetch-external-format">
        <div className="service-execution-editor__configuration__items">
          <div className="service-execution-editor__configuration__item">
            <div className="btn--sm service-execution-editor__configuration__item__label">
              <BufferIcon />
            </div>
            <CustomSelectorInput
              className="panel__content__form__section__dropdown service-execution-editor__configuration__item__dropdown"
              disabled={isReadOnly}
              options={bindingOptions}
              onChange={onBindingChange}
              value={selectedBinding}
              formatOptionLabel={getBindingFormatter({
                darkMode:
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled,
              })}
              darkMode={
                !applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
              }
            />
          </div>
          <div className="service-execution-editor__configuration__item">
            <div className="btn--sm service-execution-editor__configuration__item__label">
              <FolderIcon />
            </div>
            <TreeView
              components={{
                TreeNodeContainer: QueryBuilderGraphFetchTreeNodeContainer,
              }}
              className="query-builder-graph-fetch-tree__container__tree"
              treeData={serializationTreeData}
              onNodeSelect={onNodeSelect}
              getChildNodes={getChildNodes}
              innerProps={{
                isReadOnly,
                removeNode,
              }}
            />
          </div>
        </div>
      </div>
    );
  },
);

export const QueryBuilderGraphFetchTreeExplorer = observer(
  (props: {
    graphFetchState: QueryBuilderGraphFetchTreeState;
    serializationState: GraphFetchSerializationState;
    treeData: QueryBuilderGraphFetchTreeData;
    updateTreeData: (data: QueryBuilderGraphFetchTreeData) => void;
    isReadOnly: boolean;
  }) => {
    const {
      graphFetchState,
      serializationState,
      treeData,
      updateTreeData,
      isReadOnly,
    } = props;

    // Retrieve all bindings whose packageableElementIncludes contain the root class of main graph fetch tree
    const compatibleBindings =
      graphFetchState.queryBuilderState.graphManagerState.usableStores
        .filter(filterByType(Binding))
        .filter((b) => {
          const elements = b.modelUnit.packageableElementIncludes.map(
            (p) => p.value,
          );
          return elements
            .filter(filterByType(Package))
            .map((p) =>
              Array.from(
                getAllDescendantsOfPackage(
                  p,
                  graphFetchState.queryBuilderState.graphManagerState.graph,
                ),
              ),
            )
            .flat()
            .concat(elements.filter((e) => !(e instanceof Package)))
            .includes(treeData.tree.class.value);
        });

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
      if (treeData.nodes.size === 0) {
        graphFetchState.setSerializationState(
          new GraphFetchPureSerializationState(graphFetchState),
        );
      }
      // Remove node from external format serialization tree as well
      if (
        serializationState instanceof
          GraphFetchExternalFormatSerializationState &&
        serializationState.treeData?.nodes.get(node.id)
      ) {
        removeNodeRecursively(
          serializationState.treeData,
          guaranteeNonNullable(serializationState.treeData.nodes.get(node.id)),
        );
        updateTreeData({ ...serializationState.treeData });
      }
      updateTreeData({ ...treeData });
    };

    const toggleChecked = (): void =>
      graphFetchState.setChecked(!graphFetchState.isChecked);

    const openConfigModal = (): void => {
      if (serializationState instanceof GraphFetchPureSerializationState) {
        serializationState.setConfigModal(true);
      }
    };

    const onChangeSerializationType =
      (implementationType: SERIALIZATION_TYPE): (() => void) =>
      (): void => {
        if (implementationType !== serializationState.getLabel()) {
          graphFetchState.queryBuilderState.applicationStore.alertService.setActionAlertInfo(
            {
              message:
                'Current graph-fetch will be lost when switching to a different serialization mode. Do you still want to proceed?',
              type: ActionAlertType.CAUTION,
              actions: [
                {
                  label: 'Proceed',
                  type: ActionAlertActionType.PROCEED_WITH_CAUTION,
                  handler:
                    graphFetchState.queryBuilderState.applicationStore.guardUnhandledError(
                      async () => {
                        switch (implementationType) {
                          case SERIALIZATION_TYPE.EXTERNAL_FORMAT:
                            if (
                              compatibleBindings.length > 0 &&
                              compatibleBindings[0]
                            ) {
                              const externalizeState =
                                new GraphFetchExternalFormatSerializationState(
                                  graphFetchState,
                                  compatibleBindings[0],
                                  undefined,
                                );
                              graphFetchState.setGraphFetchTree(treeData);
                              externalizeState.setGraphFetchTree(
                                deepClone(treeData),
                              );
                              graphFetchState.setSerializationState(
                                externalizeState,
                              );
                            } else {
                              graphFetchState.queryBuilderState.applicationStore.notificationService.notifyWarning(
                                `Can't switch to external format serialization: No compatible bindings found`,
                              );
                            }
                            break;
                          case SERIALIZATION_TYPE.PURE:
                          default:
                            graphFetchState.setSerializationState(
                              new GraphFetchPureSerializationState(
                                graphFetchState,
                              ),
                            );
                            break;
                        }
                      },
                    ),
                },
                {
                  label: 'Cancel',
                  type: ActionAlertActionType.PROCEED,
                  default: true,
                },
              ],
            },
          );
        }
      };

    return (
      <div className="query-builder-graph-fetch-tree">
        <div className="query-builder-graph-fetch-tree__toolbar">
          <div className="query-builder__fetch__structure__modes">
            {Object.values(SERIALIZATION_TYPE).map((type) => (
              <button
                onClick={onChangeSerializationType(type)}
                className={clsx('query-builder__fetch__structure__mode', {
                  'query-builder__fetch__structure__mode--selected':
                    type === serializationState.getLabel(),
                })}
                key={type}
              >
                {prettyCONSTName(type)}
              </button>
            ))}
          </div>
          <div className="query-builder-graph-fetch-tree__actions">
            {serializationState instanceof GraphFetchPureSerializationState && (
              <div className="query-builder-graph-fetch-tree__actions__action">
                <button
                  className="query-builder-graph-fetch-tree__actions__action-btn__label"
                  onClick={openConfigModal}
                  title={`${
                    serializationState.config
                      ? 'Edit pure serialization config'
                      : 'Add pure serialization config'
                  }`}
                  tabIndex={-1}
                >
                  <SerializeIcon className="query-builder-graph-fetch-tree__actions__action-btn__label__icon" />
                  <div className="query-builder-graph-fetch-tree__actions__action-btn__label__title">
                    {serializationState.config ? 'Edit Config' : 'Add Config'}
                  </div>
                </button>
              </div>
            )}
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
                {graphFetchState.isChecked ? (
                  <CheckSquareIcon />
                ) : (
                  <SquareIcon />
                )}
              </button>
              <div className="panel__content__form__section__toggler__prompt">
                Check graph fetch
              </div>
              <div className="query-builder-graph-fetch-tree__toolbar__hint-icon">
                <InfoCircleIcon title="With this enabled, while executing, violations of constraints will reported as part of the result, rather than causing a failure" />
              </div>
            </div>
          </div>
        </div>
        <div className="query-builder-graph-fetch-tree__container">
          {serializationState instanceof GraphFetchPureSerializationState &&
            serializationState.configModal && (
              <PureSerializationConfigModal
                pureSerializationState={serializationState}
                graphFetchState={graphFetchState}
                config={
                  serializationState.config ??
                  PureSerializationConfig.createDefault()
                }
              />
            )}
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel>
              <div className="query-builder-graph-fetch-external-format__config-group">
                <div className="query-builder-graph-fetch-external-format__config-group__header">
                  <div className="query-builder-graph-fetch-external-format__config-group__header__title">
                    Graph Fetch Tree
                  </div>
                </div>
                <div className="query-builder-graph-fetch-external-format__config-group__content">
                  <div className="query-builder-graph-fetch-external-format__config-group__item">
                    <TreeView
                      components={{
                        TreeNodeContainer:
                          QueryBuilderGraphFetchTreeNodeContainer,
                      }}
                      className="query-builder-graph-fetch-tree__container__tree"
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
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter />
            {serializationState instanceof
              GraphFetchExternalFormatSerializationState &&
              serializationState.treeData && (
                <ResizablePanel>
                  <div className="query-builder-graph-fetch-external-format__config-group">
                    <div className="query-builder-graph-fetch-external-format__config-group__header">
                      <div className="query-builder-graph-fetch-external-format__config-group__header__title">
                        Externalize
                      </div>
                    </div>
                    <div className="query-builder-graph-fetch-external-format__config-group__content">
                      <div className="query-builder-graph-fetch-external-format_config-group__item">
                        <QueryBuilderGraphFetchExternalConfig
                          graphFetchState={graphFetchState}
                          serializationState={serializationState}
                          serializationTreeData={serializationState.treeData}
                          bindings={compatibleBindings}
                          isReadOnly={false}
                        />
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
              )}
          </ResizablePanelGroup>
        </div>
      </div>
    );
  },
);

const QueryBuilderGraphFetchTreePanel = observer(
  (props: {
    graphFetchTreeState: QueryBuilderGraphFetchTreeState;
    serializationState: GraphFetchSerializationState;
  }) => {
    const { graphFetchTreeState, serializationState } = props;
    const treeData = graphFetchTreeState.treeData;

    // Deep/Graph Fetch Tree
    const updateTreeData = (data: QueryBuilderGraphFetchTreeData): void => {
      graphFetchTreeState.setGraphFetchTree(data);
    };

    // Drag and Drop
    const handleDrop = useCallback(
      (item: QueryBuilderExplorerTreeDragSource): void => {
        graphFetchTreeState.addProperty(item.node, { refreshTreeData: true });
        // If serializationState is GraphFetchExternalFormatSerializationState, we should add this node to
        // the external format serialization tree as well
        if (
          serializationState instanceof
          GraphFetchExternalFormatSerializationState
        ) {
          serializationState.addProperty(deepClone(item.node), {
            refreshTreeData: true,
          });
        }
      },
      [graphFetchTreeState, serializationState],
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

    useEffect(() => {
      QueryBuilderTelemetryHelper.logEvent_RenderGraphFetchPanel(
        graphFetchTreeState.queryBuilderState.applicationStore.telemetryService,
        {
          serializationType: serializationState.getLabel(),
        },
      );
    }, [
      graphFetchTreeState.queryBuilderState.applicationStore,
      serializationState,
    ]);

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_GRAPH_FETCH}
        className="panel__content"
      >
        <PanelDropZone
          isDragOver={isDragOver}
          dropTargetConnector={dropTargetConnector}
          contentClassName="query-builder-graph-fetch-panel"
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
              serializationState={serializationState}
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
    if (
      serializationState instanceof GraphFetchPureSerializationState ||
      serializationState instanceof GraphFetchExternalFormatSerializationState
    ) {
      return (
        <QueryBuilderGraphFetchTreePanel
          graphFetchTreeState={graphFetchTreeState}
          serializationState={serializationState}
        />
      );
    }
    return (
      <div data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_GRAPH_FETCH}>
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
