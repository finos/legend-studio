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
import {
  type TreeData,
  type TreeNodeContainerProps,
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
import { isNonNullable } from '@finos/legend-shared';
import { generateExploreTaxonomyTreeNodeRoute } from '../stores/LegendTaxonomyRouter.js';
import { useTaxonomyExplorerStore } from './TaxonomyExplorerStoreProvider.js';
import type { TaxonomyTreeNodeData } from '../stores/TaxonomyExplorerStore.js';
import { TaxonomyNodeViewerState } from '../stores/TaxonomyNodeViewerState.js';
import { useLegendTaxonomyApplicationStore } from './LegendTaxonomyBaseStoreProvider.js';

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
    const applicationStore = useLegendTaxonomyApplicationStore();
    const explorerStore = useTaxonomyExplorerStore();
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
      explorerStore.setTreeData({
        ...treeData,
      });
    };
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    const copyGuid = (): void => {
      if (node.taxonomyData) {
        applicationStore
          .copyTextToClipboard(node.taxonomyData.guid)
          .then(() =>
            applicationStore.notificationService.notifySuccess(
              'Copied taxonomy node ID to clipboard',
            ),
          )
          .catch(applicationStore.alertUnhandledError);
      }
    };
    const copyLink = (): void => {
      applicationStore
        .copyTextToClipboard(
          applicationStore.navigationService.generateAddress(
            generateExploreTaxonomyTreeNodeRoute(
              applicationStore.config.currentTaxonomyTreeOption.key,
              node.id,
            ),
          ),
        )
        .then(() =>
          applicationStore.notificationService.notifySuccess(
            'Copied taxonomy node link to clipboard',
          ),
        )
        .catch(applicationStore.alertUnhandledError);
    };

    return (
      <ContextMenu
        content={
          <MenuContent>
            <MenuContentItem disabled={!node.taxonomyData} onClick={copyGuid}>
              Copy ID
            </MenuContentItem>
            <MenuContentItem onClick={copyLink}>Copy Link</MenuContentItem>
          </MenuContent>
        }
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <div
          className={clsx(
            'tree-view__node__container taxonomy-tree__node__container',
            {
              'menu__trigger--on-menu-open':
                !node.isSelected && isSelectedFromContextMenu,
            },
            {
              'taxonomy-tree__node__container--selected':
                node ===
                explorerStore.currentTaxonomyNodeViewerState?.taxonomyNode,
            },
          )}
          onClick={selectNode}
          style={{
            paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
            display: 'flex',
          }}
        >
          <div className="tree-view__node__icon taxonomy-tree__node__icon">
            <button
              className="taxonomy-tree__node__icon__expand"
              tabIndex={-1}
              onClick={toggleExpand}
            >
              {expandIcon}
            </button>
            <div className="taxonomy-tree__node__icon__type">
              {node.childrenIds.length ? <CircleIcon /> : <EmptyCircleIcon />}
            </div>
          </div>
          <button
            className="tree-view__node__label taxonomy-tree__node__label"
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
    const explorerStore = useTaxonomyExplorerStore();

    const onNodeSelect = (node: TaxonomyTreeNodeData): void => {
      explorerStore.setCurrentTaxonomyNodeViewerState(
        new TaxonomyNodeViewerState(explorerStore, node),
      );
      explorerStore.setTreeData({ ...treeData });
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
