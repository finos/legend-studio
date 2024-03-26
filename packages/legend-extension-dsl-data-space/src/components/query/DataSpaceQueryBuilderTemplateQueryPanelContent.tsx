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

import {
  PanelHeader,
  FilterIcon,
  BasePopover,
  ClickAwayListener,
  ShareIcon,
  TagIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useRef } from 'react';
import { DataSpaceExecutableTemplate } from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import type { DataSpaceQueryBuilderState } from '../../stores/query/DataSpaceQueryBuilderState.js';
import { useApplicationStore } from '@finos/legend-application';
import { generateDataSpaceTemplateQueryCreatorRoute } from '../../__lib__/query/DSL_DataSpace_LegendQueryNavigation.js';

const DataSpaceTemplateQueryDialog = observer(
  (props: {
    triggerElement: HTMLElement | null;
    queryBuilderState: DataSpaceQueryBuilderState;
    templateQueries: DataSpaceExecutableTemplate[];
  }) => {
    const { triggerElement, queryBuilderState, templateQueries } = props;
    const applicationStore = useApplicationStore();
    const handleClose = (): void => {
      queryBuilderState.setTemplateQueryDialogOpen(false);
    };
    const loadQuery = (template: DataSpaceExecutableTemplate): void => {
      const executionContext =
        queryBuilderState.dataSpace.executionContexts.find(
          (c) => c.name === template.executionContextKey,
        );
      if (
        executionContext &&
        executionContext.hashCode !==
          queryBuilderState.executionContext.hashCode
      ) {
        queryBuilderState.setExecutionContext(executionContext);
        queryBuilderState.propagateExecutionContextChange(executionContext);
        queryBuilderState.initializeWithQuery(template.query);
        queryBuilderState.onExecutionContextChange?.(executionContext);
      } else {
        queryBuilderState.initializeWithQuery(template.query);
      }
      handleClose();
    };

    const shareTemplateQuery = (
      template: DataSpaceExecutableTemplate,
    ): void => {
      if (queryBuilderState.projectInfo?.groupId) {
        applicationStore.navigationService.navigator.visitAddress(
          applicationStore.navigationService.navigator.generateAddress(
            generateDataSpaceTemplateQueryCreatorRoute(
              queryBuilderState.projectInfo.groupId,
              queryBuilderState.projectInfo.artifactId,
              queryBuilderState.projectInfo.versionId,
              queryBuilderState.dataSpace.path,
              template.title,
            ),
          ),
        );
      }
    };

    return (
      <ClickAwayListener onClickAway={handleClose}>
        <div>
          <BasePopover
            open={queryBuilderState.isTemplateQueryDialogOpen}
            PaperProps={{
              classes: {
                root: '"query-builder__data-space__template-query-panel__container__root',
              },
            }}
            className="query-builder__data-space__template-query-panel__container"
            onClose={handleClose}
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
                Curated Template Queries
              </div>
              {templateQueries.map((query) => (
                <div
                  key={query.title}
                  className="query-builder__data-space__template-query-panel__query"
                >
                  <TagIcon className="query-builder__data-space__template-query-panel__query__icon" />
                  <button
                    className="query-builder__data-space__template-query-panel__query__entry"
                    title="click to load template query"
                    onClick={() => loadQuery(query)}
                  >
                    <div className="query-builder__data-space__template-query-panel__query__entry__content">
                      <div className="query-builder__data-space__template-query-panel__query__entry__content__title">
                        {query.title}
                      </div>
                      {query.description && (
                        <div className="query-builder__data-space__template-query-panel__query__entry__content__description">
                          {query.description}
                        </div>
                      )}
                    </div>
                  </button>
                  <button
                    className="query-builder__data-space__template-query-panel__query__share"
                    title="Share..."
                    onClick={() => shareTemplateQuery(query)}
                  >
                    <ShareIcon />
                    <div className="query-builder__data-space__template-query-panel__query__share__label">
                      Share
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

const DataSpaceQueryBuilderTemplateQueryPanel = observer(
  (props: { queryBuilderState: DataSpaceQueryBuilderState }) => {
    const { queryBuilderState } = props;
    const templateQueryButtonRef = useRef<HTMLButtonElement>(null);
    const templateQueries = queryBuilderState.dataSpace.executables?.filter(
      (e) => e instanceof DataSpaceExecutableTemplate,
    ) as DataSpaceExecutableTemplate[];

    const showTemplateQueries = (): void => {
      queryBuilderState.setTemplateQueryDialogOpen(true);
    };

    return (
      <PanelHeader className="query-builder__data-space__template-query">
        <div className="query-builder__data-space__template-query__title">
          <FilterIcon />
        </div>
        <button
          className="query-builder__data-space__template-query__btn"
          ref={templateQueryButtonRef}
          disabled={templateQueries.length <= 0}
          onClick={showTemplateQueries}
        >
          Template ( {templateQueries.length} )
        </button>
        {queryBuilderState.isTemplateQueryDialogOpen && (
          <DataSpaceTemplateQueryDialog
            triggerElement={templateQueryButtonRef.current}
            queryBuilderState={queryBuilderState}
            templateQueries={templateQueries}
          />
        )}
      </PanelHeader>
    );
  },
);

export const renderDataSpaceQueryBuilderTemplateQueryPanelContent = (
  queryBuilderState: DataSpaceQueryBuilderState,
): React.ReactNode => (
  <DataSpaceQueryBuilderTemplateQueryPanel
    queryBuilderState={queryBuilderState}
  />
);
