/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import {
  PanelHeader,
  BasePopover,
  ClickAwayListener,
  ShareIcon,
  TagIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useRef, useState } from 'react';
import {
  ActionAlertActionType,
  ActionAlertType,
  useApplicationStore,
} from '@finos/legend-application';
import type { V1_SampleQuery } from '@finos/legend-graph';
import { flowResult } from 'mobx';
import type { LegendQueryDataProductQueryBuilderState } from '../../stores/data-product/query-builder/LegendQueryDataProductQueryBuilderState.js';
import { generateDataProductSampleQueryRoute } from '../../__lib__/LegendQueryNavigation.js';

const DataProductSampleQueryDialog = observer(
  (props: {
    triggerElement: HTMLElement | null;
    queryBuilderState: LegendQueryDataProductQueryBuilderState;
    sampleQueries: V1_SampleQuery[];
    onClose: () => void;
  }) => {
    const { triggerElement, queryBuilderState, sampleQueries, onClose } = props;
    const applicationStore = useApplicationStore();

    const loadSampleQuery = async (
      sampleQuery: V1_SampleQuery,
    ): Promise<void> => {
      const query =
        await queryBuilderState.graphManagerState.graphManager.pureCodeToLambda(
          sampleQuery.info.query,
        );
      queryBuilderState.initializeWithQuery(query);
      onClose();
    };

    const loadQuery = async (sampleQuery: V1_SampleQuery): Promise<void> => {
      if (queryBuilderState.changeDetectionState.hasChanged) {
        applicationStore.alertService.setActionAlertInfo({
          message:
            'Unsaved changes will be lost if you continue. Do you still want to proceed?',
          type: ActionAlertType.CAUTION,
          actions: [
            {
              label: 'Proceed',
              type: ActionAlertActionType.PROCEED_WITH_CAUTION,
              handler: (): void => {
                flowResult(loadSampleQuery(sampleQuery));
              },
            },
            {
              label: 'Abort',
              type: ActionAlertActionType.PROCEED,
              default: true,
            },
          ],
        });
      } else {
        flowResult(loadSampleQuery(sampleQuery));
      }
    };

    const visitSampleQuery = (sampleQuery: V1_SampleQuery): void => {
      const id = sampleQuery.info.id;
      if (!id) {
        applicationStore.notificationService.notifyWarning(
          'Sample query does not have an ID and cannot be visited via URL',
        );
        return;
      }
      const project = queryBuilderState.project;
      applicationStore.navigationService.navigator.visitAddress(
        applicationStore.navigationService.navigator.generateAddress(
          generateDataProductSampleQueryRoute(
            project.groupId,
            project.artifactId,
            project.versionId,
            queryBuilderState.dataProduct.path,
            id,
          ),
        ),
      );
    };

    return (
      <ClickAwayListener onClickAway={onClose}>
        <div>
          <BasePopover
            open={true}
            slotProps={{
              paper: {
                classes: {
                  root: '"query-builder__data-space__template-query-panel__container__root',
                },
              },
            }}
            className="query-builder__data-space__template-query-panel__container"
            onClose={onClose}
            anchorEl={triggerElement}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'center',
            }}
          >
            <div className="query-builder__data-space__template-query-panel">
              <div className="query-builder__data-space__template-query-panel__header">
                Sample Queries
              </div>
              {sampleQueries.map((sampleQuery) => (
                <div
                  key={sampleQuery.info.id ?? sampleQuery.title}
                  className="query-builder__data-space__template-query-panel__query"
                >
                  <TagIcon className="query-builder__data-space__template-query-panel__query__icon" />
                  <button
                    className="query-builder__data-space__template-query-panel__query__entry"
                    title="click to load sample query"
                    onClick={() => {
                      flowResult(loadQuery(sampleQuery));
                    }}
                  >
                    <div className="query-builder__data-space__template-query-panel__query__entry__content">
                      <div className="query-builder__data-space__template-query-panel__query__entry__content__title">
                        {sampleQuery.title}
                      </div>
                      {sampleQuery.description && (
                        <div className="query-builder__data-space__template-query-panel__query__entry__content__description">
                          {sampleQuery.description}
                        </div>
                      )}
                    </div>
                  </button>
                  <button
                    className="query-builder__data-space__template-query-panel__query__share"
                    title="Visit..."
                    disabled={!sampleQuery.info.id}
                    onClick={() => visitSampleQuery(sampleQuery)}
                  >
                    <ShareIcon />
                    <div className="query-builder__data-space__template-query-panel__query__share__label">
                      Visit
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </BasePopover>
        </div>
      </ClickAwayListener>
    );
  },
);

export const DataProductSampleQueryPanel = observer(
  (props: { queryBuilderState: LegendQueryDataProductQueryBuilderState }) => {
    const { queryBuilderState } = props;
    const templateQueryButtonRef = useRef<HTMLButtonElement>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const sampleQueries = queryBuilderState.isNativeMode
      ? (queryBuilderState.dataProductArtifact?.nativeModelAccess
          ?.sampleQueries ?? [])
      : [];

    if (sampleQueries.length === 0) {
      return null;
    }

    return (
      <PanelHeader className="query-builder__data-space__template-query">
        <button
          className="query-builder__data-space__template-query__btn"
          ref={templateQueryButtonRef}
          onClick={() => setIsDialogOpen(true)}
        >
          Sample Queries ( {sampleQueries.length} )
        </button>
        {isDialogOpen && (
          <DataProductSampleQueryDialog
            triggerElement={templateQueryButtonRef.current}
            queryBuilderState={queryBuilderState}
            sampleQueries={sampleQueries}
            onClose={() => setIsDialogOpen(false)}
          />
        )}
      </PanelHeader>
    );
  },
);

export const renderDataProductSampleQueryPanelContent = (
  queryBuilderState: LegendQueryDataProductQueryBuilderState,
): React.ReactNode => (
  <DataProductSampleQueryPanel queryBuilderState={queryBuilderState} />
);
