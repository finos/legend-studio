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

import { forwardRef, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  type ConceptTreeNode,
  ElementConceptAttribute,
  PropertyConceptAttribute,
  ConceptType,
} from '../../server/models/ConceptTree.js';
import { flowResult } from 'mobx';
import { FileCoordinate } from '../../server/models/File.js';
import { useApplicationStore } from '@finos/legend-application';
import {
  type TreeNodeContainerProps,
  BlankPanelContent,
  clsx,
  ContextMenu,
  PanelLoadingIndicator,
  TreeView,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleNotchIcon,
  RefreshIcon,
  CompressIcon,
  MenuContent,
  MenuContentItem,
  MenuContentDivider,
} from '@finos/legend-art';
import { guaranteeType, isNonNullable } from '@finos/legend-shared';
import { useDrag } from 'react-dnd';
import { usePureIDEStore } from '../PureIDEStoreProvider.js';
import { getConceptIcon } from '../shared/ConceptIconUtils.js';
import { RenameConceptPrompt } from './RenameConceptPrompt.js';
import { extractElementNameFromPath } from '@finos/legend-graph';
import { MoveElementPrompt } from './MoveElementPrompt.js';

const ConceptExplorerContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      node: ConceptTreeNode;
      viewConceptSource: (node: ConceptTreeNode) => void;
    }
  >(function ConceptExplorerContextMenu(props, ref) {
    const { node, viewConceptSource } = props;
    const nodeAttribute = node.data.li_attr;
    const nodeType = nodeAttribute.pureType;
    const ideStore = usePureIDEStore();
    const applicationStore = useApplicationStore();
    const renameConcept = (): void =>
      ideStore.conceptTreeState.setNodeForRenameConcept(node);
    const moveElement = (): void =>
      ideStore.conceptTreeState.setNodeForMoveElement(node);
    const runTests = (): void => {
      flowResult(ideStore.executeTests(node.data.li_attr.pureId)).catch(
        applicationStore.alertUnhandledError,
      );
    };
    const findUsages = (): void => {
      if (
        nodeAttribute instanceof ElementConceptAttribute ||
        nodeAttribute instanceof PropertyConceptAttribute
      ) {
        ideStore.findUsagesFromCoordinate(
          new FileCoordinate(
            nodeAttribute.file,
            Number.parseInt(nodeAttribute.line, 10),
            Number.parseInt(nodeAttribute.column, 10),
          ),
        );
      }
    };
    const viewSource = (): void => viewConceptSource(node);
    const serviceJSON = (): void => {
      applicationStore.navigationService.navigator.visitAddress(
        `${ideStore.client.baseUrl}/execute?func=${nodeAttribute.pureId}&mode=${ideStore.client.mode}`,
      );
    };
    const copyPath = (): void => {
      applicationStore.clipboardService
        .copyTextToClipboard(nodeAttribute.pureId)
        .catch(applicationStore.alertUnhandledError);
    };

    return (
      <MenuContent ref={ref}>
        {nodeAttribute.pureType !== ConceptType.PROPERTY &&
          nodeAttribute.pureType !== ConceptType.QUALIFIED_PROPERTY && (
            <MenuContentItem onClick={copyPath}>Copy Path</MenuContentItem>
          )}
        {nodeType === ConceptType.PACKAGE && (
          <>
            <MenuContentItem onClick={runTests}>Run Tests</MenuContentItem>
            <MenuContentItem
              onClick={() => ideStore.setPCTRunPath(node.data.li_attr.pureId)}
            >
              Run PCTs
            </MenuContentItem>
          </>
        )}
        {nodeType === ConceptType.FUNCTION && (
          <>
            <MenuContentItem onClick={serviceJSON}>
              Service (JSON)
            </MenuContentItem>
            <MenuContentItem
              onClick={() => {
                if (node.data.pct) {
                  ideStore.setPCTRunPath(node.data.li_attr.pureId);
                } else {
                  runTests();
                }
              }}
              disabled={!node.data.test}
            >
              Run Test
            </MenuContentItem>
          </>
        )}
        {(nodeAttribute instanceof PropertyConceptAttribute ||
          nodeAttribute instanceof ElementConceptAttribute) && (
          <MenuContentItem onClick={findUsages}>Find Usages</MenuContentItem>
        )}
        {nodeType !== ConceptType.PACKAGE && (
          <MenuContentItem onClick={viewSource}>View Source</MenuContentItem>
        )}
        <MenuContentDivider />
        <MenuContentItem onClick={renameConcept}>Rename</MenuContentItem>
        {nodeAttribute instanceof ElementConceptAttribute && (
          <MenuContentItem onClick={moveElement}>Move</MenuContentItem>
        )}
      </MenuContent>
    );
  }),
);

export enum CONCEPT_TREE_DND_TYPE {
  UNSUPPORTED = 'UNSUPPORTED',
  CLASS = 'CLASS',
}

const ConceptTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    ConceptTreeNode,
    {
      onNodeOpen: (node: ConceptTreeNode) => void;
      onNodeExpand: (node: ConceptTreeNode) => void;
      onNodeCompress: (node: ConceptTreeNode) => void;
      viewConceptSource: (node: ConceptTreeNode) => void;
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
  const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
    useState(false);
  const { onNodeOpen, onNodeExpand, onNodeCompress, viewConceptSource } =
    innerProps;
  const isAssociationPropertyNode =
    node.parent &&
    node.data.li_attr instanceof PropertyConceptAttribute &&
    node.data.li_attr.classPath !== node.parent.id;
  const isExpandable = (
    [ConceptType.PACKAGE, ConceptType.CLASS] as string[]
  ).includes(node.data.li_attr.pureType);
  const nodeLabel =
    node.data.li_attr.pureType === ConceptType.QUALIFIED_PROPERTY ? (
      <>
        {node.label}
        <span className="explorer__package-tree__node__label__tag">(...)</span>
      </>
    ) : isAssociationPropertyNode ? (
      <>
        {node.label}
        <span className="explorer__package-tree__node__label__tag">
          {extractElementNameFromPath(
            guaranteeType(node.data.li_attr, PropertyConceptAttribute)
              .classPath,
          )}
        </span>
      </>
    ) : node.label.includes('(') ? (
      <>
        {node.label.substring(0, node.label.indexOf('('))}
        <span className="explorer__package-tree__node__label__tag">
          {node.label.substring(node.label.indexOf('('))}
        </span>
      </>
    ) : (
      node.label
    );
  const selectNode: React.MouseEventHandler = (event) => {
    event.stopPropagation();
    event.preventDefault();
    onNodeSelect?.(node);
  };
  const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
  const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
  const toggleExpansion = (): void => {
    if (node.isLoading) {
      return;
    }
    if (node.isOpen) {
      onNodeCompress(node);
    } else {
      onNodeExpand(node);
    }
  };
  const onDoubleClick: React.MouseEventHandler<HTMLDivElement> = () => {
    if (node.isLoading) {
      return;
    }
    if (isExpandable) {
      toggleExpansion();
    }
    onNodeSelect?.(node);
    onNodeOpen(node);
  };
  const [, dragConnector] = useDrag(
    () => ({
      type:
        node.data.li_attr.pureType === 'Class'
          ? CONCEPT_TREE_DND_TYPE.CLASS
          : CONCEPT_TREE_DND_TYPE.UNSUPPORTED,
      item: node.data,
    }),
    [node],
  );
  const ref = useRef<HTMLDivElement>(null);
  dragConnector(ref);

  return (
    <ContextMenu
      content={
        <ConceptExplorerContextMenu
          node={node}
          viewConceptSource={viewConceptSource}
        />
      }
      menuProps={{ elevation: 7 }}
      onOpen={onContextMenuOpen}
      onClose={onContextMenuClose}
    >
      <div
        id={node.id}
        className={clsx(
          'tree-view__node__container explorer__package-tree__node__container',
          {
            'explorer__package-tree__node__container--selected-from-context-menu':
              !node.isSelected && isSelectedFromContextMenu,
          },
          {
            'explorer__package-tree__node__container--selected':
              node.isSelected,
          },
        )}
        onClick={selectNode}
        ref={ref}
        onDoubleClick={onDoubleClick}
        style={{
          paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
          display: 'flex',
        }}
      >
        <div className="tree-view__node__icon explorer__package-tree__node__icon">
          {node.isLoading && (
            <div className="explorer__package-tree__node__icon__expand explorer__package-tree__node__icon__expand--is-loading">
              <CircleNotchIcon />
            </div>
          )}
          {!node.isLoading && (
            <div
              className="explorer__package-tree__node__icon__expand"
              onClick={toggleExpansion}
            >
              {!isExpandable ? (
                <div />
              ) : node.isOpen ? (
                <ChevronDownIcon />
              ) : (
                <ChevronRightIcon />
              )}
            </div>
          )}
          <div
            className={clsx('explorer__package-tree__node__icon__type', {
              'explorer__package-tree__node__icon__type--property-from-association':
                isAssociationPropertyNode,
            })}
          >
            {getConceptIcon(node.data.li_attr.pureType)}
          </div>
        </div>
        <button
          className="tree-view__node__label explorer__package-tree__node__label"
          tabIndex={-1}
        >
          {nodeLabel}
        </button>
      </div>
    </ContextMenu>
  );
};

const FileExplorerTree = observer(() => {
  const ideStore = usePureIDEStore();
  const applicationStore = useApplicationStore();
  const treeState = ideStore.conceptTreeState;
  const treeData = ideStore.conceptTreeState.getTreeData();
  const onNodeSelect = (node: ConceptTreeNode): void =>
    treeState.setSelectedNode(node);
  const onNodeOpen = (node: ConceptTreeNode): void => {
    flowResult(treeState.openNode(node)).catch(
      applicationStore.alertUnhandledError,
    );
  };
  const onNodeExpand = (node: ConceptTreeNode): void => {
    flowResult(treeState.expandNode(node)).catch(
      applicationStore.alertUnhandledError,
    );
  };
  const onNodeCompress = (node: ConceptTreeNode): void => {
    node.isOpen = false;
    treeState.refreshTree();
  };
  const getChildNodes = (node: ConceptTreeNode): ConceptTreeNode[] => {
    if (node.isLoading || !node.childrenIds) {
      return [];
    }
    return node.childrenIds
      .map((childId) => treeData.nodes.get(childId))
      .filter(isNonNullable);
  };
  const deselectTreeNode = (): void => treeState.setSelectedNode(undefined);
  const viewConceptSource = (node: ConceptTreeNode): void => {
    const nodeAttribute = node.data.li_attr;
    if (
      nodeAttribute instanceof ElementConceptAttribute ||
      nodeAttribute instanceof PropertyConceptAttribute
    ) {
      flowResult(
        ideStore.directoryTreeState.revealPath(nodeAttribute.file, {
          forceOpenExplorerPanel: true,
          coordinate: new FileCoordinate(
            nodeAttribute.file,
            Number.parseInt(nodeAttribute.line, 10),
            Number.parseInt(nodeAttribute.column, 10),
          ),
        }),
      ).catch(applicationStore.alertUnhandledError);
    }
  };

  return (
    <div className="explorer__content" onClick={deselectTreeNode}>
      <TreeView
        components={{
          TreeNodeContainer: ConceptTreeNodeContainer,
        }}
        treeData={treeData}
        onNodeSelect={onNodeSelect}
        getChildNodes={getChildNodes}
        innerProps={{
          onNodeOpen,
          onNodeExpand,
          onNodeCompress,
          viewConceptSource,
        }}
      />
      {treeState.nodeForRenameConcept && (
        <RenameConceptPrompt node={treeState.nodeForRenameConcept} />
      )}
      {treeState.nodeForMoveElement && (
        <MoveElementPrompt node={treeState.nodeForMoveElement} />
      )}
    </div>
  );
});

export const ConceptTreeExplorer = observer(() => {
  const ideStore = usePureIDEStore();
  const applicationStore = useApplicationStore();
  const treeState = ideStore.conceptTreeState;
  const refreshTree = (): void => {
    flowResult(treeState.refreshTreeData()).catch(
      applicationStore.alertUnhandledError,
    );
  };
  const collapseTree = (): void => {
    const treeData = treeState.getTreeData();
    treeData.nodes.forEach((node) => {
      node.isOpen = false;
    });
    treeState.setSelectedNode(undefined);
    treeState.refreshTree();
  };

  return (
    <div className="panel explorer">
      <div className="panel__header side-bar__header">
        <div className="panel__header__title">
          <div className="panel__header__title__content side-bar__header__title__content">
            CONCEPTS
          </div>
        </div>
      </div>
      <div className="panel__content side-bar__content">
        <div className="panel explorer">
          <div className="panel__header explorer__header">
            <div className="panel__header__title" />
            <div className="panel__header__actions">
              <button
                className="panel__header__action explorer__btn__refresh"
                onClick={refreshTree}
                title="Refresh Tree"
              >
                <RefreshIcon />
              </button>
              <button
                className="panel__header__action"
                onClick={collapseTree}
                title="Collapse All"
              >
                <CompressIcon />
              </button>
            </div>
          </div>
          <div className="panel__content explorer__content__container">
            <PanelLoadingIndicator
              isLoading={treeState.loadInitialDataState.isInProgress}
            />
            {treeState.loadInitialDataState.hasSucceeded && (
              <FileExplorerTree />
            )}
            {!treeState.loadInitialDataState.hasSucceeded &&
              treeState.statusText && (
                <div className="explorer__content__container__message">
                  {treeState.statusText}
                </div>
              )}
            {treeState.loadInitialDataState.hasFailed && (
              <BlankPanelContent>
                Failed to build concept tree. Make sure graph compiles
              </BlankPanelContent>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
