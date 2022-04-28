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

import { useState, useCallback, forwardRef } from 'react';
import { observer } from 'mobx-react-lite';
import {
  type MappingExplorerDropTarget,
  type ElementDragSource,
  CORE_DND_TYPE,
  MappingElementDragSource,
} from '../../../../stores/shared/DnDUtil';
import {
  type TreeNodeContainerProps,
  clsx,
  TreeView,
  ContextMenu,
  VerticalAlignBottomIcon,
  AddIcon,
  PlusIcon,
  LockIcon,
  FireIcon,
  StickArrowCircleRightIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  FilterIcon,
} from '@finos/legend-art';
import { MappingElementState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingElementState';
import { useDrop, useDrag } from 'react-dnd';
import { toSentenceCase } from '@finos/legend-shared';
import {
  type MappingElement,
  type MappingExplorerTreeNodeData,
  getAllMappingElements,
  getMappingElementTarget,
  getMappingElementType,
  MappingEditorState,
  getMappingElementLabel,
} from '../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { LEGEND_STUDIO_TEST_ID } from '../../../LegendStudioTestID';
import { getElementIcon } from '../../../shared/ElementIconUtils';
import { NewMappingElementModal } from '../../../editor/edit-panel/mapping-editor/NewMappingElementModal';
import { MappingElementDecorator } from '../../../../stores/editor-state/element-editor-state/mapping/MappingElementDecorator';
import { flowResult } from 'mobx';
import { useEditorStore } from '../../EditorStoreProvider';
import {
  type PackageableElement,
  SetImplementation,
  EnumerationMapping,
  PropertyMapping,
  PureInstanceSetImplementation,
  RawLambda,
} from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import {
  PureInstanceSetImplementationFilterState,
  PureInstanceSetImplementationState,
} from '../../../../stores/editor-state/element-editor-state/mapping/PureInstanceSetImplementationState';
import { pureInstanceSetImpl_setMappingFilter } from '../../../../stores/graphModifier/DSLMapping_GraphModifierHelper';

export const MappingExplorerContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      mappingElement?: MappingElement;
      openNewMapingModal?: () => void;
    }
  >(function MappingExplorerContextMenu(props, ref) {
    const { mappingElement, openNewMapingModal } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const mappingEditorState =
      editorStore.getCurrentEditorState(MappingEditorState);
    const currentMappingElement =
      mappingEditorState.currentTabState instanceof MappingElementState
        ? mappingEditorState.currentTabState.mappingElement
        : undefined;
    const removeMappingElement = (): void => {
      if (mappingElement) {
        flowResult(
          mappingEditorState.deleteMappingElement(mappingElement),
        ).catch(applicationStore.alertUnhandledError);
      }
      if (currentMappingElement instanceof EnumerationMapping) {
        new MappingElementDecorator(editorStore).visitEnumerationMapping(
          currentMappingElement,
        );
      } else if (currentMappingElement instanceof SetImplementation) {
        const mappingElementDecorator = new MappingElementDecorator(
          editorStore,
        );
        mappingElementDecorator.editorStore = editorStore;
        currentMappingElement.accept_SetImplementationVisitor(
          new MappingElementDecorator(editorStore),
        );
      }
      mappingEditorState.reprocessMappingExplorerTree();
    };
    const executeMappingElement = (): void => {
      if (mappingElement instanceof SetImplementation) {
        flowResult(mappingEditorState.buildExecution(mappingElement)).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };
    const createTestForMappingElement = (): void => {
      if (mappingElement instanceof SetImplementation) {
        flowResult(mappingEditorState.createNewTest(mappingElement)).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };

    const addMappingFilter = (): void => {
      if (mappingElement instanceof PureInstanceSetImplementation) {
        if (!mappingElement.filter) {
          const stubLambda = RawLambda.createStub();
          pureInstanceSetImpl_setMappingFilter(mappingElement, stubLambda);
        }
        if (
          mappingEditorState.currentTabState instanceof
          PureInstanceSetImplementationState
        ) {
          mappingEditorState.currentTabState.mappingFilterState =
            new PureInstanceSetImplementationFilterState(
              mappingElement,
              editorStore,
            );
        }
      }
    };
    const removeMappingFilter = applicationStore.guardUnhandledError(
      async () => {
        if (
          mappingEditorState.currentTabState instanceof
          PureInstanceSetImplementationState
        ) {
          await flowResult(
            mappingEditorState.currentTabState.mappingFilterState?.convertLambdaObjectToGrammarString(
              false,
            ),
          );
          mappingEditorState.currentTabState.mappingFilterState = undefined;
          if (mappingElement instanceof PureInstanceSetImplementation) {
            pureInstanceSetImpl_setMappingFilter(mappingElement, undefined);
          }
        }
      },
    );

    const allowAddFilter =
      mappingElement instanceof PureInstanceSetImplementation &&
      !mappingElement.filter;

    const allowRemoveFilter =
      mappingElement instanceof PureInstanceSetImplementation &&
      !!mappingElement.filter;

    return (
      <div ref={ref} className="mapping-explorer__context-menu">
        {mappingElement instanceof SetImplementation && (
          <div
            className="mapping-explorer__context-menu__item"
            onClick={executeMappingElement}
          >
            Execute
          </div>
        )}
        {mappingElement instanceof SetImplementation && (
          <div
            className="mapping-explorer__context-menu__item"
            onClick={createTestForMappingElement}
          >
            Test
          </div>
        )}
        {allowAddFilter && (
          <div
            className="mapping-explorer__context-menu__item"
            onClick={addMappingFilter}
          >
            Add Filter
          </div>
        )}
        {allowRemoveFilter && (
          <div
            className="mapping-explorer__context-menu__item"
            onClick={removeMappingFilter}
          >
            Remove Filter
          </div>
        )}
        {mappingElement && (
          <div
            className="mapping-explorer__context-menu__item"
            onClick={removeMappingElement}
          >
            Delete
          </div>
        )}
        {!mappingElement && openNewMapingModal && (
          <div
            className="mapping-explorer__context-menu__item"
            onClick={openNewMapingModal}
          >
            Create new mapping element
          </div>
        )}
      </div>
    );
  }),
);

export const MappingElementExplorer = observer(
  (props: {
    mappingElement: MappingElement;
    openNewMapingModal: () => void;
    isReadOnly: boolean;
  }) => {
    const { mappingElement, openNewMapingModal, isReadOnly } = props;
    const editorStore = useEditorStore();
    const mappingEditorState =
      editorStore.getCurrentEditorState(MappingEditorState);
    const currentMappingElement =
      mappingEditorState.currentTabState instanceof MappingElementState
        ? mappingEditorState.currentTabState.mappingElement
        : undefined;
    const openMappingElement = (): void =>
      mappingEditorState.openMappingElement(mappingElement, false);
    const mappingElementTarget = getMappingElementTarget(mappingElement);
    // Drag and Drop
    const [, dragRef] = useDrag(
      () => ({
        type:
          mappingElement instanceof SetImplementation
            ? CORE_DND_TYPE.MAPPING_EXPLORER_CLASS_MAPPING
            : CORE_DND_TYPE.NONE,
        item: new MappingElementDragSource(mappingElement),
      }),
      [mappingElement],
    );
    // Selection
    const isActive =
      currentMappingElement?.id.value === mappingElement.id.value;
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);

    return (
      <ContextMenu
        disabled={isReadOnly}
        content={
          <MappingExplorerContextMenu
            mappingElement={mappingElement}
            openNewMapingModal={openNewMapingModal}
          />
        }
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <div
          ref={dragRef}
          className={clsx(
            'mapping-explorer__item',
            {
              'mapping-explorer__item--selected-from-context-menu':
                !isActive && isSelectedFromContextMenu,
            },
            { 'mapping-explorer__item--active': isActive },
          )}
        >
          <button
            className="mapping-explorer__item__label"
            onClick={openMappingElement}
            tabIndex={-1}
            title={`${toSentenceCase(
              getMappingElementType(mappingElement),
            ).toLowerCase()} mapping '${mappingElement.id.value}' for '${
              mappingElementTarget.name
            }'`}
          >
            <div className="mapping-explorer__item__label__icon">
              {getElementIcon(editorStore, mappingElementTarget)}
            </div>
            <div className="mapping-explorer__item__label__text">
              {getMappingElementLabel(mappingElement, editorStore).value}
            </div>
          </button>
        </div>
      </ContextMenu>
    );
  },
);

const MappingElementTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      MappingExplorerTreeNodeData,
      {
        isReadOnly: boolean;
        onNodeExpand: (node: MappingExplorerTreeNodeData) => void;
      }
    >,
  ) => {
    const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
    const { isReadOnly, onNodeExpand } = innerProps;
    const mappingElement = node.mappingElement;
    const editorStore = useEditorStore();
    const mappingEditorState =
      editorStore.getCurrentEditorState(MappingEditorState);
    const currentMappingElement =
      mappingEditorState.currentTabState instanceof MappingElementState
        ? mappingEditorState.currentTabState.mappingElement
        : undefined;
    const isExpandable = Boolean(node.childrenIds?.length);
    const nodeExpandIcon = isExpandable ? (
      node.isOpen ? (
        <ChevronDownIcon />
      ) : (
        <ChevronRightIcon />
      )
    ) : (
      <div />
    );
    const mappingElementTarget = getMappingElementTarget(mappingElement);
    const mappingElementTooltipText =
      mappingElement instanceof PropertyMapping && mappingElement.isEmbedded
        ? `Embedded class mapping '${mappingElement.id.value}' for property '${mappingElement.property.value.name}' (${mappingElement.property.value.genericType.value.rawType.name}) of type '${mappingElement.sourceSetImplementation.class.value.name}'`
        : `${toSentenceCase(
            getMappingElementType(mappingElement).toLowerCase(),
          )} mapping '${mappingElement.id.value}' for '${
            mappingElementTarget.name
          }'`;
    // Drag and Drop
    const [, dragRef] = useDrag(
      () => ({
        type:
          mappingElement instanceof SetImplementation
            ? CORE_DND_TYPE.MAPPING_EXPLORER_CLASS_MAPPING
            : CORE_DND_TYPE.NONE,
        item: new MappingElementDragSource(mappingElement),
      }),
      [mappingElement],
    );
    const selectNode = (): void => onNodeSelect?.(node);
    const onExpandIconClick = (): void => onNodeExpand(node);
    // Selection
    const isActive =
      currentMappingElement?.id.value === mappingElement.id.value;
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);

    return (
      <ContextMenu
        disabled={isReadOnly}
        content={<MappingExplorerContextMenu mappingElement={mappingElement} />}
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <div
          className={clsx(
            'tree-view__node__container',
            {
              'mapping-explorer__item--selected-from-context-menu':
                !isActive && isSelectedFromContextMenu,
            },
            { 'mapping-explorer__item--active': isActive },
          )}
          onClick={selectNode}
          ref={dragRef}
          style={{
            paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 1) + 0.5}rem`,
            display: 'flex',
          }}
        >
          <button
            className="mapping-explorer__item__label"
            tabIndex={-1}
            title={mappingElementTooltipText}
          >
            <div className="type-tree__expand-icon" onClick={onExpandIconClick}>
              {nodeExpandIcon}
            </div>
            <div className="mapping-explorer__item__label__icon">
              {getElementIcon(editorStore, mappingElementTarget)}
            </div>
            <div className="mapping-explorer__item__label__text">
              {getMappingElementLabel(mappingElement, editorStore).value}
            </div>
            {mappingElement instanceof PureInstanceSetImplementation &&
              !!mappingElement.filter && (
                <div className="mapping-explorer__item__label__filter-icon">
                  <FilterIcon />
                </div>
              )}
          </button>
        </div>
      </ContextMenu>
    );
  },
);

const getMappingIdentitySortString = (
  me: MappingElement,
  type: PackageableElement,
): string => `${type.name}-${type.path}-${me.id.value}`;

export const MappingExplorer = observer((props: { isReadOnly: boolean }) => {
  const { isReadOnly } = props;
  const editorStore = useEditorStore();
  const mappingEditorState =
    editorStore.getCurrentEditorState(MappingEditorState);
  const mapping = mappingEditorState.mapping;
  const mappingElements = getAllMappingElements(mapping).sort((a, b) =>
    getMappingIdentitySortString(a, getMappingElementTarget(a)).localeCompare(
      getMappingIdentitySortString(b, getMappingElementTarget(b)),
    ),
  );
  const openNewMapingModal = (): void =>
    mappingEditorState.createMappingElement({
      showTarget: true,
      openInAdjacentTab: false,
    });
  // Drag and Drop
  const handleDrop = useCallback(
    (item: MappingExplorerDropTarget): void =>
      isReadOnly
        ? undefined
        : mappingEditorState.createMappingElement({
            showTarget: true,
            openInAdjacentTab: false,
            target: item.data.packageableElement,
          }),
    [isReadOnly, mappingEditorState],
  );
  const [{ isDragOver }, dropRef] = useDrop(
    () => ({
      accept: [
        CORE_DND_TYPE.PROJECT_EXPLORER_ENUMERATION,
        CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
        CORE_DND_TYPE.PROJECT_EXPLORER_ASSOCIATION,
      ],
      drop: (item: ElementDragSource): void => handleDrop(item),
      collect: (monitor): { isDragOver: boolean } => ({
        isDragOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [handleDrop],
  );
  // Generation
  const generationParentElementPath =
    editorStore.graphState.graphGenerationState.findGenerationParentPath(
      mapping.path,
    );
  const generationParentElement = generationParentElementPath
    ? editorStore.graphManagerState.graph.getNullableElement(
        generationParentElementPath,
      )
    : undefined;
  const visitGenerationParentElement = (): void => {
    if (generationParentElement) {
      editorStore.openElement(generationParentElement);
    }
  };
  // explorer tree data
  const mappingElementsTreeData = mappingEditorState.mappingExplorerTreeData;
  const onNodeSelect = (node: MappingExplorerTreeNodeData): void =>
    mappingEditorState.onMappingExplorerTreeNodeSelect(node);
  const onNodeExpand = (node: MappingExplorerTreeNodeData): void =>
    mappingEditorState.onMappingExplorerTreeNodeExpand(node);
  const getMappingElementTreeChildNodes = (
    node: MappingExplorerTreeNodeData,
  ): MappingExplorerTreeNodeData[] =>
    mappingEditorState.getMappingExplorerTreeChildNodes(node);

  return (
    <div
      data-testid={LEGEND_STUDIO_TEST_ID.MAPPING_EXPLORER}
      className="panel mapping-explorer"
    >
      <div className="panel__header">
        <div
          className={clsx('panel__header__title', {
            'panel__header__title--with-generation-origin':
              generationParentElement,
          })}
        >
          {isReadOnly && (
            <div title="Read Only" className="mapping-explorer__header__lock">
              <LockIcon />
            </div>
          )}
          <div className="panel__header__title__label">mapping</div>
          <div className="panel__header__title__content">{mapping.name}</div>
        </div>
        <div className="panel__header__actions">
          {!generationParentElement && (
            <button
              className="panel__header__action"
              onClick={openNewMapingModal}
              disabled={isReadOnly}
              tabIndex={-1}
              title={'Create new mapping element'}
            >
              <PlusIcon />
            </button>
          )}
          {generationParentElement && (
            <button
              className="mapping-explorer__header__generation-origin"
              onClick={visitGenerationParentElement}
              tabIndex={-1}
              title={`Visit generation parent '${generationParentElement.path}'`}
            >
              <div className="mapping-explorer__header__generation-origin__label">
                <FireIcon />
              </div>
              <div className="mapping-explorer__header__generation-origin__parent-name">
                {generationParentElement.name}
              </div>
              <div className="mapping-explorer__header__generation-origin__visit-btn">
                <StickArrowCircleRightIcon />
              </div>
            </button>
          )}
        </div>
      </div>
      <ContextMenu
        className="panel__content"
        disabled={isReadOnly}
        content={
          <MappingExplorerContextMenu openNewMapingModal={openNewMapingModal} />
        }
        menuProps={{ elevation: 7 }}
      >
        <div
          ref={dropRef}
          className={clsx('mapping-explorer__content', {
            'mapping-explorer__content--dnd-over': isDragOver && !isReadOnly,
          })}
        >
          <TreeView
            components={{
              TreeNodeContainer: MappingElementTreeNodeContainer,
            }}
            treeData={mappingElementsTreeData}
            onNodeSelect={onNodeSelect}
            getChildNodes={getMappingElementTreeChildNodes}
            innerProps={{
              isReadOnly,
              onNodeExpand,
            }}
          />
          {/* TODO: use BlankPanelPlaceholder */}
          {!isReadOnly && !mappingElements.length && (
            <div
              className="mapping-explorer__content mapping-explorer__content__adder"
              onClick={openNewMapingModal}
            >
              <div className="mapping-explorer__content__adder__text">
                {'Add a mapping element'}
              </div>
              <div className="mapping-explorer__content__adder__action">
                <VerticalAlignBottomIcon className="mapping-explorer__content__adder__action__dnd-icon" />
                <AddIcon className="mapping-explorer__content__adder__action__add-icon" />
              </div>
            </div>
          )}
          <NewMappingElementModal />
        </div>
      </ContextMenu>
    </div>
  );
});
