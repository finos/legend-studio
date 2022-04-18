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
  WindowMaximizeIcon,
  ArrowRightIcon,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import { useApplicationStore } from '@finos/legend-application';
import { generateGAVCoordinates } from '@finos/legend-server-depot';
import type {
  RawDataSpace,
  TaxonomyNodeViewerState,
} from '../stores/LegendTaxonomyStore';
import {
  generateStandaloneDataSpaceViewerRoute,
  generateExploreTaxonomyTreeNodeDataSpaceRoute,
} from '../stores/LegendTaxonomyRouter';
import type { LegendTaxonomyConfig } from '../application/LegendTaxonomyConfig';
import {
  DataSpaceViewer,
  type DataSpaceViewerState,
} from '@finos/legend-extension-dsl-data-space';
import { ELEMENT_PATH_DELIMITER } from '@finos/legend-graph';
import { useLegendTaxonomyStore } from './LegendTaxonomyStoreProvider';

const TaxonomyNodeDataSpaceItem = observer(
  (props: {
    rawDataSpace: RawDataSpace;
    taxonomyNodeViewerState: TaxonomyNodeViewerState;
    selectDataSpace: () => void;
  }) => {
    const { rawDataSpace, taxonomyNodeViewerState, selectDataSpace } = props;
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const applicationStore = useApplicationStore<LegendTaxonomyConfig>();
    const isSelected =
      rawDataSpace === taxonomyNodeViewerState.currentDataSpace;
    const idx = rawDataSpace.path.lastIndexOf(ELEMENT_PATH_DELIMITER);
    const dataSpaceLabel =
      idx === -1 ? (
        <div className="taxonomy-node-viewer__explorer__entry__path taxonomy-node-viewer__explorer__entry__path--simple">
          {rawDataSpace.path}
        </div>
      ) : (
        <div className="taxonomy-node-viewer__explorer__entry__path">
          <div className="taxonomy-node-viewer__explorer__entry__path__package">
            {rawDataSpace.path.substring(
              0,
              idx + ELEMENT_PATH_DELIMITER.length,
            )}
          </div>
          <div className="taxonomy-node-viewer__explorer__entry__path__name">
            {rawDataSpace.path.substring(idx + ELEMENT_PATH_DELIMITER.length)}
          </div>
        </div>
      );
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    const copyLink = (): void => {
      applicationStore
        .copyTextToClipboard(
          applicationStore.navigator.generateLocation(
            generateExploreTaxonomyTreeNodeDataSpaceRoute(
              applicationStore.config.currentTaxonomyTreeOption.key,
              taxonomyNodeViewerState.taxonomyNode.id,
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
        .catch(applicationStore.alertUnhandledError);
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
            'taxonomy-node-viewer__explorer__entry',
            {
              'menu__trigger--on-menu-open':
                !isSelected && isSelectedFromContextMenu,
            },
            {
              'taxonomy-node-viewer__explorer__entry--active': isSelected,
            },
          )}
          tabIndex={-1}
          onClick={selectDataSpace}
          title={rawDataSpace.id}
        >
          <div className="taxonomy-node-viewer__explorer__entry__icon">
            <SquareIcon />
          </div>
          {dataSpaceLabel}
        </button>
      </ContextMenu>
    );
  },
);

const TaxonomyNodeViewerExplorer = observer(
  (props: { taxonomyNodeViewerState: TaxonomyNodeViewerState }) => {
    const { taxonomyNodeViewerState } = props;
    const applicationStore = useApplicationStore();
    const taxonomyNode = taxonomyNodeViewerState.taxonomyNode;
    const dataSpaceOptions = taxonomyNodeViewerState.dataSpaceOptions;
    const updateSearchText: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ): void =>
      taxonomyNodeViewerState.setDataSpaceSearchText(event.target.value);
    const selectDataSpace =
      (rawDataSpace: RawDataSpace): (() => void) =>
      (): void => {
        flowResult(
          taxonomyNodeViewerState.initializeDataSpaceViewer(rawDataSpace),
        ).catch(applicationStore.alertUnhandledError);
      };

    return (
      <div className="panel taxonomy-node-viewer__explorer">
        <div className="panel__header taxonomy-node-viewer__explorer__header">
          <div className="panel__header__title taxonomy-node-viewer__explorer__header__title">
            Dataspaces ({dataSpaceOptions.length}/
            {taxonomyNode.rawDataSpaces.length})
          </div>
        </div>
        <div className="panel__header taxonomy-node-viewer__explorer__search">
          <input
            className="input--dark taxonomy-node-viewer__explorer__search__input"
            value={taxonomyNodeViewerState.dataSpaceSearchText}
            onChange={updateSearchText}
            placeholder="Search for dataspace..."
          />
        </div>
        <div className="panel__content taxonomy-node-viewer__explorer__content">
          {dataSpaceOptions.length === 0 && (
            <BlankPanelContent>No data space available</BlankPanelContent>
          )}
          {taxonomyNode.rawDataSpaces.length !== 0 &&
            dataSpaceOptions.map((dataSpaceOption) => (
              <TaxonomyNodeDataSpaceItem
                key={dataSpaceOption.value.id}
                rawDataSpace={dataSpaceOption.value}
                selectDataSpace={selectDataSpace(dataSpaceOption.value)}
                taxonomyNodeViewerState={taxonomyNodeViewerState}
              />
            ))}
        </div>
      </div>
    );
  },
);

const TaxonomyNodeDataSpaceViewer = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const taxonomyStore = useLegendTaxonomyStore();
    const applicationStore = useApplicationStore();
    const queryDataSpace = (): void =>
      taxonomyStore.queryUsingDataSpace(dataSpaceViewerState);
    const viewDataSpace = (): void =>
      applicationStore.navigator.openNewWindow(
        applicationStore.navigator.generateLocation(
          generateStandaloneDataSpaceViewerRoute(
            generateGAVCoordinates(
              dataSpaceViewerState.dataSpaceGroupId,
              dataSpaceViewerState.dataSpaceArtifactId,
              dataSpaceViewerState.dataSpaceVersionId,
            ),
            dataSpaceViewerState.dataSpace.path,
          ),
        ),
      );

    return (
      <div className="panel taxonomy-node-viewer__data-space-viewer">
        <div className="panel__header taxonomy-node-viewer__data-space-viewer__header">
          <div className="panel__header__title"></div>
          <div className="panel__header__actions taxonomy-node-viewer__data-space-viewer__header__actions">
            <button
              className="taxonomy-node-viewer__data-space-viewer__header__action btn--dark"
              onClick={viewDataSpace}
              tabIndex={-1}
              title="View data space in a separate view"
            >
              <WindowMaximizeIcon />
            </button>
            <button
              className="taxonomy-node-viewer__data-space-viewer__header__action btn--dark"
              onClick={queryDataSpace}
              tabIndex={-1}
              title="Query data space..."
            >
              <ArrowRightIcon />
            </button>
          </div>
        </div>
        <div className="panel__content taxonomy-node-viewer__data-space-viewer__content">
          <DataSpaceViewer dataSpaceViewerState={dataSpaceViewerState} />
        </div>
      </div>
    );
  },
);

export const TaxonomyNodeViewer = observer(
  (props: { taxonomyNodeViewerState: TaxonomyNodeViewerState }) => {
    const { taxonomyNodeViewerState } = props;
    const taxonomyStore = useLegendTaxonomyStore();
    const description =
      taxonomyNodeViewerState.taxonomyNode.taxonomyData?.description;

    return (
      <div className="taxonomy-node-viewer">
        <div className="taxonomy-node-viewer__description">
          {description && (
            <div className="taxonomy-node-viewer__description__content">
              {description}
            </div>
          )}
          {!description && (
            <div className="taxonomy-node-viewer__description__content taxonomy-node-viewer__description__content--empty">
              No description
            </div>
          )}
        </div>
        <div className="taxonomy-node-viewer__explorer__panel">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel minSize={300} size={300}>
              <TaxonomyNodeViewerExplorer
                taxonomyNodeViewerState={taxonomyNodeViewerState}
              />
            </ResizablePanel>
            <ResizablePanelSplitter />
            <ResizablePanel minSize={300}>
              {taxonomyNodeViewerState.dataSpaceViewerState && (
                <TaxonomyNodeDataSpaceViewer
                  dataSpaceViewerState={
                    taxonomyNodeViewerState.dataSpaceViewerState
                  }
                />
              )}
              {!taxonomyNodeViewerState.dataSpaceViewerState &&
                taxonomyNodeViewerState.initDataSpaceViewerState
                  .isInProgress && (
                  <div className="taxonomy-node-viewer__content-placeholder">
                    <PanelLoadingIndicator isLoading={true} />
                    <BlankPanelContent>
                      {taxonomyNodeViewerState.initDataSpaceViewerState
                        .message ??
                        taxonomyStore.graphManagerState.graph.systemModel
                          .buildState.message ??
                        taxonomyStore.graphManagerState.graph.dependencyManager
                          .buildState.message ??
                        taxonomyStore.graphManagerState.graph.generationModel
                          .buildState.message ??
                        taxonomyStore.graphManagerState.graph.buildState
                          .message}
                    </BlankPanelContent>
                  </div>
                )}
              {!taxonomyNodeViewerState.dataSpaceViewerState && (
                <div className="taxonomy-node-viewer__content-placeholder">
                  <BlankPanelContent>No data space selected</BlankPanelContent>
                </div>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    );
  },
);
