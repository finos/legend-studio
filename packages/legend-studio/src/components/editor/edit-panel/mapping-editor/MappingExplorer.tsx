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

import { useState, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from '../../../../stores/EditorStore';
import type {
  MappingExplorerDropTarget,
  ElementDragSource,
} from '../../../../stores/shared/DnDUtil';
import {
  CORE_DND_TYPE,
  MappingElementDragSource,
} from '../../../../stores/shared/DnDUtil';
import type { TreeNodeContainerProps } from '@finos/legend-studio-components';
import { clsx, TreeView, ContextMenu } from '@finos/legend-studio-components';
import { MappingElementState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingElementState';
import { useDrop, useDrag } from 'react-dnd';
import { toSentenceCase } from '@finos/legend-studio-shared';
import type { MappingElementTreeNodeData } from '../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { MappingEditorState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { MdVerticalAlignBottom, MdAdd } from 'react-icons/md';
import {
  FaPlus,
  FaLock,
  FaFire,
  FaArrowCircleRight,
  FaChevronRight,
  FaChevronDown,
} from 'react-icons/fa';
import { CORE_TEST_ID } from '../../../../const';
import { getElementIcon } from '../../../shared/Icon';
import { NewMappingElementModal } from '../../../editor/edit-panel/mapping-editor/NewMappingElementModal';
import { useApplicationStore } from '../../../../stores/ApplicationStore';
import { MappingElementDecorateVisitor } from '../../../../stores/editor-state/element-editor-state/mapping/MappingElementDecorateVisitor';
import type { MappingElement } from '../../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import {
  getMappingElementType,
  getMappingElementTarget,
} from '../../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { SetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/mapping/SetImplementation';
import { EnumerationMapping } from '../../../../models/metamodels/pure/model/packageableElements/mapping/EnumerationMapping';
import { PropertyMapping } from '../../../../models/metamodels/pure/model/packageableElements/mapping/PropertyMapping';
import type { PackageableElement } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElement';

export const MappingExplorerContextMenu = observer(
  (
    props: {
      mappingElement?: MappingElement;
      openNewMapingModal?: () => void;
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
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
        mappingEditorState
          .deleteMappingElement(mappingElement)
          .catch(applicationStore.alertIllegalUnhandledError);
      }
      if (currentMappingElement instanceof EnumerationMapping) {
        new MappingElementDecorateVisitor().visitEnumerationMapping(
          currentMappingElement,
        );
      } else if (currentMappingElement instanceof SetImplementation) {
        currentMappingElement.accept_SetImplementationVisitor(
          new MappingElementDecorateVisitor(),
        );
      }
      mappingEditorState.reprocessMappingElementTree();
    };
    return (
      <div ref={ref} className="mapping-explorer__context-menu">
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
  },
  { forwardRef: true },
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
              {mappingElement.label.value}
            </div>
          </button>
        </div>
      </ContextMenu>
    );
  },
);

type MappingElementTreeNodeContainerProps = TreeNodeContainerProps<
  MappingElementTreeNodeData,
  {
    isReadOnly: boolean;
    onNodeExpand: (node: MappingElementTreeNodeData) => void;
  }
>;

const MappingElementTreeNodeContainer = observer(
  (props: MappingElementTreeNodeContainerProps) => {
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
        <FaChevronDown />
      ) : (
        <FaChevronRight />
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
              {mappingElement.label.value}
            </div>
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
  const mappingElements = mapping
    .getAllMappingElements()
    .sort((a, b) =>
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
  const visitGenerationParentElement = (): void => {
    if (mapping.generationParentElement) {
      editorStore.openElement(mapping.generationParentElement);
    }
  };
  // explorer tree data
  const mappingElementsTreeData = mappingEditorState.mappingElementsTreeData;
  const onNodeSelect = (node: MappingElementTreeNodeData): void =>
    mappingEditorState.onNodeSelect(node);
  const onNodeExpand = (node: MappingElementTreeNodeData): void =>
    mappingEditorState.onNodeExpand(node);
  const getMappingElementTreeChildNodes = (
    node: MappingElementTreeNodeData,
  ): MappingElementTreeNodeData[] =>
    mappingEditorState.getMappingElementTreeChildNodes(node);

  return (
    <div
      data-testid={CORE_TEST_ID.MAPPING_EXPLORER}
      className="panel mapping-explorer"
    >
      <div className="panel__header">
        <div
          className={clsx('panel__header__title', {
            'panel__header__title--with-generation-origin':
              mapping.generationParentElement,
          })}
        >
          {isReadOnly && (
            <div title="Read Only" className="mapping-explorer__header__lock">
              <FaLock />
            </div>
          )}
          <div className="panel__header__title__label">mapping</div>
          <div className="panel__header__title__content">{mapping.name}</div>
        </div>
        <div className="panel__header__actions">
          {!mapping.generationParentElement && (
            <button
              className="panel__header__action"
              onClick={openNewMapingModal}
              disabled={isReadOnly}
              tabIndex={-1}
              title={'Create new mapping element'}
            >
              <FaPlus />
            </button>
          )}
          {mapping.generationParentElement && (
            <button
              className="mapping-explorer__header__generation-origin"
              onClick={visitGenerationParentElement}
              tabIndex={-1}
              title={`Visit generation parent '${mapping.generationParentElement.path}'`}
            >
              <div className="mapping-explorer__header__generation-origin__label">
                <FaFire />
              </div>
              <div className="mapping-explorer__header__generation-origin__parent-name">
                {mapping.generationParentElement.name}
              </div>
              <div className="mapping-explorer__header__generation-origin__visit-btn">
                <FaArrowCircleRight />
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
                <MdVerticalAlignBottom className="mapping-explorer__content__adder__action__dnd-icon" />
                <MdAdd className="mapping-explorer__content__adder__action__add-icon" />
              </div>
            </div>
          )}
          <NewMappingElementModal />
        </div>
      </ContextMenu>
    </div>
  );
});
