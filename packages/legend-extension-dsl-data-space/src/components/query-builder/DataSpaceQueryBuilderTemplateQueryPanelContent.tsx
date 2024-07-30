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
  BasePopover,
  ClickAwayListener,
  ShareIcon,
  TagIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useRef } from 'react';
import {
  ActionAlertActionType,
  ActionAlertType,
  useApplicationStore,
} from '@finos/legend-application';
import { DocumentationLink } from '@finos/legend-lego/application';
import { DataSpaceExecutableTemplate } from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import type { DataSpaceQueryBuilderState } from '../../stores/query-builder/DataSpaceQueryBuilderState.js';
import { DSL_DATA_SPACE_LEGEND_QUERY_DOCUMENTATION_KEY } from '../../__lib__/query/DSL_DataSpace_LegendQueryDocumentation.js';

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

    const loadTemplateQuery = (template: DataSpaceExecutableTemplate): void => {
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

    const loadQuery = (template: DataSpaceExecutableTemplate): void => {
      if (queryBuilderState.changeDetectionState.hasChanged) {
        applicationStore.alertService.setActionAlertInfo({
          message:
            'Unsaved changes will be lost if you continue. Do you still want to proceed?',
          type: ActionAlertType.CAUTION,
          actions: [
            {
              label: 'Proceed',
              type: ActionAlertActionType.PROCEED_WITH_CAUTION,
              handler: (): void => loadTemplateQuery(template),
            },
            {
              label: 'Abort',
              type: ActionAlertActionType.PROCEED,
              default: true,
            },
          ],
        });
      } else {
        loadTemplateQuery(template);
      }
    };

    const visitTemplateQuery = (
      template: DataSpaceExecutableTemplate,
    ): void => {
      if (queryBuilderState.dataSpaceRepo.canVisitTemplateQuery) {
        queryBuilderState.dataSpaceRepo.visitTemplateQuery(
          queryBuilderState.dataSpace,
          template,
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
                <DocumentationLink
                  documentationKey={
                    DSL_DATA_SPACE_LEGEND_QUERY_DOCUMENTATION_KEY.CURATED_TEMPLATE_QUERY
                  }
                />
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
                    title="Visit..."
                    disabled={
                      !queryBuilderState.dataSpaceRepo.canVisitTemplateQuery
                    }
                    onClick={() => visitTemplateQuery(query)}
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

const DataSpaceQueryBuilderTemplateQueryPanel = observer(
  (props: { queryBuilderState: DataSpaceQueryBuilderState }) => {
    const { queryBuilderState } = props;
    const templateQueryButtonRef = useRef<HTMLButtonElement>(null);
    const templateQueries = queryBuilderState.dataSpace.executables?.filter(
      (e) => e instanceof DataSpaceExecutableTemplate,
    );

    const showTemplateQueries = (): void => {
      queryBuilderState.setTemplateQueryDialogOpen(true);
    };

    return (
      <>
        {!templateQueries || templateQueries.length === 0 ? (
          <PanelHeader className="query-builder__data-space__template-query">
            <button
              className="query-builder__data-space__template-query__btn"
              ref={templateQueryButtonRef}
              onClick={showTemplateQueries}
              disabled={true}
            >
              Templates ( 0 )
            </button>
          </PanelHeader>
        ) : (
          <PanelHeader className="query-builder__data-space__template-query">
            <button
              className="query-builder__data-space__template-query__btn"
              ref={templateQueryButtonRef}
              onClick={showTemplateQueries}
            >
              Templates ( {templateQueries.length} )
            </button>
            {queryBuilderState.isTemplateQueryDialogOpen && (
              <DataSpaceTemplateQueryDialog
                triggerElement={templateQueryButtonRef.current}
                queryBuilderState={queryBuilderState}
                templateQueries={templateQueries}
              />
            )}
          </PanelHeader>
        )}
      </>
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
