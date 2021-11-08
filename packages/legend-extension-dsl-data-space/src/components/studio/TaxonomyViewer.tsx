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
import type {
  RawDataSpace,
  TaxonomyViewerState,
} from '../../stores/studio/EnterpriseModelExplorerStore';
import { generateDataSpaceRoute } from '../../stores/studio/EnterpriseModelExplorerStore';
import {
  BlankPanelContent,
  clsx,
  PanelLoadingIndicator,
  SquareIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ContextMenu,
  MenuContent,
  MenuContentItem,
} from '@finos/legend-art';
import { DataSpaceViewer } from '../DataSpaceViewer';
import { flowResult } from 'mobx';
import { useApplicationStore } from '@finos/legend-application';
import { generateGAVCoordinates } from '@finos/legend-server-depot';

const TaxonomyDataSpaceItem = observer(
  (props: {
    rawDataSpace: RawDataSpace;
    taxonomyViewerState: TaxonomyViewerState;
    selectDataSpace: () => void;
  }) => {
    const { rawDataSpace, taxonomyViewerState, selectDataSpace } = props;
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const applicationStore = useApplicationStore();
    const isSelected = rawDataSpace === taxonomyViewerState.currentDataSpace;
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    const copyLink = (): void => {
      applicationStore
        .copyTextToClipboard(
          applicationStore.navigator.generateLocation(
            generateDataSpaceRoute(
              taxonomyViewerState.taxonomyNode.id,
              generateGAVCoordinates(
                rawDataSpace.groupId,
                rawDataSpace.artifactId,
                rawDataSpace.versionId,
              ),
              rawDataSpace.path,
            ),
          ),
        )
        .then(() =>
          applicationStore.notifySuccess('Copied data space link to clipboard'),
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
        key={rawDataSpace.id}
      >
        <button
          className={clsx(
            'taxonomy-viewer__explorer__entry',
            {
              'menu__trigger--on-menu-open':
                !isSelected && isSelectedFromContextMenu,
            },
            {
              'taxonomy-viewer__explorer__entry--active': isSelected,
            },
          )}
          tabIndex={-1}
          onClick={selectDataSpace}
          title={rawDataSpace.id}
        >
          <div className="taxonomy-viewer__explorer__entry__icon">
            <SquareIcon />
          </div>
          <div className="taxonomy-viewer__explorer__entry__path">
            {rawDataSpace.path}
          </div>
        </button>
      </ContextMenu>
    );
  },
);

const TaxonomyViewerExplorer = observer(
  (props: { taxonomyViewerState: TaxonomyViewerState }) => {
    const { taxonomyViewerState } = props;
    const applicationStore = useApplicationStore();
    const taxonomyNode = taxonomyViewerState.taxonomyNode;
    const selectDataSpace =
      (rawDataSpace: RawDataSpace): (() => void) =>
      (): void => {
        flowResult(
          taxonomyViewerState.initializeDataSpaceViewer(rawDataSpace),
        ).catch(applicationStore.alertIllegalUnhandledError);
      };

    return (
      <div className="panel taxonomy-viewer__explorer">
        <div className="panel__header taxonomy-viewer__explorer__header">
          <div className="panel__header__title taxonomy-viewer__explorer__header__title">
            Dataspaces ({taxonomyNode.rawDataSpaces.length})
          </div>
        </div>
        <div className="panel__content taxonomy-viewer__explorer__content">
          {taxonomyNode.rawDataSpaces.length === 0 && (
            <BlankPanelContent>No data space available</BlankPanelContent>
          )}
          {taxonomyNode.rawDataSpaces.length !== 0 &&
            taxonomyNode.rawDataSpaces.map((rawDataSpace) => (
              <TaxonomyDataSpaceItem
                key={rawDataSpace.id}
                rawDataSpace={rawDataSpace}
                selectDataSpace={selectDataSpace(rawDataSpace)}
                taxonomyViewerState={taxonomyViewerState}
              />
            ))}
        </div>
      </div>
    );
  },
);

export const TaxonomyViewer = observer(
  (props: { taxonomyViewerState: TaxonomyViewerState }) => {
    const { taxonomyViewerState } = props;

    return (
      <div className="taxonomy-viewer">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel minSize={300} size={300}>
            <TaxonomyViewerExplorer taxonomyViewerState={taxonomyViewerState} />
          </ResizablePanel>
          <ResizablePanelSplitter />
          <ResizablePanel minSize={300}>
            {taxonomyViewerState.dataSpaceViewerState && (
              <DataSpaceViewer
                dataSpaceViewerState={taxonomyViewerState.dataSpaceViewerState}
              />
            )}
            {!taxonomyViewerState.dataSpaceViewerState &&
              taxonomyViewerState.initDataSpaceViewerState.isInProgress && (
                <div className="taxonomy-viewer__content-placeholder">
                  <PanelLoadingIndicator isLoading={true} />
                  <BlankPanelContent>Loading data space...</BlankPanelContent>
                </div>
              )}
            {!taxonomyViewerState.dataSpaceViewerState && (
              <div className="taxonomy-viewer__content-placeholder">
                <BlankPanelContent>No data space selected</BlankPanelContent>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);
