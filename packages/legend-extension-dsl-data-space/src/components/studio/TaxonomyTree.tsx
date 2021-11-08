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

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import type { TaxonomyTreeNodeData } from '../../stores/studio/EnterpriseModelExplorerStore';
import {
  generateTaxonomyNodeRoute,
  TaxonomyViewerState,
} from '../../stores/studio/EnterpriseModelExplorerStore';
import type { TreeData, TreeNodeContainerProps } from '@finos/legend-art';
import {
  ContextMenu,
  MenuContent,
  MenuContentItem,
  CircleIcon,
  EmptyCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  clsx,
  TreeView,
} from '@finos/legend-art';
import { useEnterpriseModelExplorerStore } from './EnterpriseModelExplorerStoreProvider';
import { isNonNullable } from '@finos/legend-shared';
import { useApplicationStore } from '@finos/legend-application';

const TaxonomyTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      TaxonomyTreeNodeData,
      {
        treeData: TreeData<TaxonomyTreeNodeData>;
      }
    >,
  ) => {
    const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
    const { treeData } = innerProps;
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const applicationStore = useApplicationStore();
    const enterpriseModelExplorerStore = useEnterpriseModelExplorerStore();
    const expandIcon = !node.childrenIds.length ? (
      <div />
    ) : node.isOpen ? (
      <ChevronDownIcon />
    ) : (
      <ChevronRightIcon />
    );
    const selectNode = (): void => onNodeSelect?.(node);
    const toggleExpand = (event: React.MouseEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      if (node.childrenIds.length) {
        node.isOpen = !node.isOpen;
      }
      enterpriseModelExplorerStore.setTreeData({
        ...treeData,
      });
    };
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    const copyLink = (): void => {
      applicationStore
        .copyTextToClipboard(
          applicationStore.navigator.generateLocation(
            generateTaxonomyNodeRoute(node.id),
          ),
        )
        .then(() =>
          applicationStore.notifySuccess(
            'Copied taxonomy node link to clipboard',
          ),
        )
        .catch(applicationStore.alertIllegalUnhandledError);
    };

    return (
      <ContextMenu
        content={
          <MenuContent>
            <MenuContentItem onClick={copyLink}>Copy Link</MenuContentItem>
          </MenuContent>
        }
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <div
          className={clsx(
            'tree-view__node__container enterprise-taxonomy-tree__node__container',
            {
              'menu__trigger--on-menu-open':
                !node.isSelected && isSelectedFromContextMenu,
            },
            {
              'enterprise-taxonomy-tree__node__container--selected':
                node ===
                enterpriseModelExplorerStore.currentTaxonomyViewerState
                  ?.taxonomyNode,
            },
          )}
          onClick={selectNode}
          style={{
            paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
            display: 'flex',
          }}
        >
          <div className="tree-view__node__icon enterprise-taxonomy-tree__node__icon">
            <button
              className="enterprise-taxonomy-tree__node__icon__expand"
              tabIndex={-1}
              onClick={toggleExpand}
            >
              {expandIcon}
            </button>
            <div className="enterprise-taxonomy-tree__node__icon__type">
              {node.childrenIds.length ? <CircleIcon /> : <EmptyCircleIcon />}
            </div>
          </div>
          <button
            className="tree-view__node__label enterprise-taxonomy-tree__node__label"
            tabIndex={-1}
          >
            {node.label}
          </button>
        </div>
      </ContextMenu>
    );
  },
);

export const TaxonomyTree = observer(
  (props: { treeData: TreeData<TaxonomyTreeNodeData> }) => {
    const { treeData } = props;
    const enterpriseModelExplorerStore = useEnterpriseModelExplorerStore();

    const onNodeSelect = (node: TaxonomyTreeNodeData): void => {
      enterpriseModelExplorerStore.setCurrentTaxonomyViewerState(
        new TaxonomyViewerState(enterpriseModelExplorerStore, node),
      );
      enterpriseModelExplorerStore.setTreeData({ ...treeData });
    };

    const getChildNodes = (
      node: TaxonomyTreeNodeData,
    ): TaxonomyTreeNodeData[] =>
      node.childrenIds
        .map((id) => treeData.nodes.get(id))
        .filter(isNonNullable)
        .sort((a, b) => a.label.localeCompare(b.label));

    return (
      <TreeView
        components={{
          TreeNodeContainer: TaxonomyTreeNodeContainer,
        }}
        treeData={treeData}
        onNodeSelect={onNodeSelect}
        getChildNodes={getChildNodes}
        innerProps={{
          treeData,
        }}
      />
    );
  },
);
