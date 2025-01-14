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

import { BlankPanelContent, GitBranchIcon, clsx } from '@finos/legend-art';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { useApplicationStore } from '@finos/legend-application';
import { useParams } from '@finos/legend-application/browser';
import {
  ActivityBarMenu,
  LEGEND_STUDIO_TEST_ID,
  useLegendStudioApplicationStore,
  useLegendStudioBaseStore,
} from '@finos/legend-application-studio';
import { createContext, useContext } from 'react';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { DocumentationLink } from '@finos/legend-lego/application';
import {
  DATA_SPACE_TEMPLATE_QUERY_PROMOTION_ROUTE_PATTERN_TOKEN,
  type DataSpaceTemplateQueryPromotionReviewerPathParams,
} from '@finos/legend-extension-dsl-data-space/application';
import { DSL_DATA_SPACE_LEGEND_STUDIO_DOCUMENTATION_KEY } from '../__lib__/DSL_DataSpace_LegendStudioDocumentation.js';
import { DataSpaceTemplateQueryPromotionReviewerStore } from '../stores/DataSpaceTemplateQueryPromotionReviewerStore.js';

const TemplateQueryPromotionReviewerStoreContext = createContext<
  DataSpaceTemplateQueryPromotionReviewerStore | undefined
>(undefined);

const DataSpaceTemplateQueryPromotionReviewerStoreProvider: React.FC<{
  children: React.ReactNode;
  dataSpacePath: string;
  queryId: string;
}> = ({ children, dataSpacePath, queryId }) => {
  const applicationStore = useLegendStudioApplicationStore();
  const baseStore = useLegendStudioBaseStore();
  const store = useLocalObservable(
    () =>
      new DataSpaceTemplateQueryPromotionReviewerStore(
        applicationStore,
        baseStore.sdlcServerClient,
        baseStore.depotServerClient,
      ),
  );
  store.initialize(queryId, dataSpacePath);
  return (
    <TemplateQueryPromotionReviewerStoreContext.Provider value={store}>
      {children}
    </TemplateQueryPromotionReviewerStoreContext.Provider>
  );
};

const useTemplateQueryPromotionReviewerStore =
  (): DataSpaceTemplateQueryPromotionReviewerStore =>
    guaranteeNonNullable(
      useContext(TemplateQueryPromotionReviewerStoreContext),
      `Can't find query productionizer store in context`,
    );

const TemplateQueryPromotionReviewerContent = observer(() => {
  const applicationStore = useApplicationStore();
  const queryPromotionReviewerStore = useTemplateQueryPromotionReviewerStore();
  const isLoadingEditor = !queryPromotionReviewerStore.initState.hasCompleted;

  // workspace name
  const changeWorkspaceName: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => queryPromotionReviewerStore.setWorkspaceName(event.target.value);

  // template query
  const onChangeTemplateQueryId: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => queryPromotionReviewerStore.setTemplateQueryId(event.target.value);

  const onChangeTemplateQueryTitle: React.ChangeEventHandler<
    HTMLInputElement
  > = (event) =>
    queryPromotionReviewerStore.setTemplateQueryTitle(event.target.value);

  const onChangeTemplateQueryDescription: React.ChangeEventHandler<
    HTMLInputElement
  > = (event) =>
    queryPromotionReviewerStore.setTemplateQueryDescription(event.target.value);

  // actions
  const promoteTemplateQuery = (): void => {
    flowResult(queryPromotionReviewerStore.promoteAsTemplateQuery()).catch(
      applicationStore.alertUnhandledError,
    );
  };

  return (
    <div className="app__page">
      {isLoadingEditor && (
        <BlankPanelContent>
          {queryPromotionReviewerStore.initState.message ??
            queryPromotionReviewerStore.editorStore.graphManagerState
              .systemBuildState.message ??
            queryPromotionReviewerStore.editorStore.graphManagerState
              .dependenciesBuildState.message ??
            queryPromotionReviewerStore.editorStore.graphManagerState
              .generationsBuildState.message ??
            queryPromotionReviewerStore.editorStore.graphManagerState
              .graphBuildState.message}
        </BlankPanelContent>
      )}
      <div className="template-query-promotor">
        <div className="template-query-promotor__body">
          <div className="activity-bar">
            <ActivityBarMenu />
          </div>
          <div
            className="template-query-promotor__content"
            data-testid={LEGEND_STUDIO_TEST_ID.SETUP__CONTENT}
          >
            <div className="template-query-promotor__content__main">
              <div className="template-query-promotor__title">
                Promote as Curated Template Query
                <DocumentationLink
                  documentationKey={
                    DSL_DATA_SPACE_LEGEND_STUDIO_DOCUMENTATION_KEY.CURATED_TEMPLATE_QUERY
                  }
                />
              </div>
              <div className="template-query-promotor__title__prompt">
                We will promote this query as a curated template query in data
                product. This automated process will generate a code review and
                workspace. Please get the generated code review reviewed and
                approved.
              </div>
              <div className="template-query-promotor__group template-query-promotor__group--workspace">
                <div className="template-query-promotor__group__header">
                  workspace
                </div>
                <div className="template-query-promotor__group__content">
                  <div className="template-query-promotor__input">
                    <div
                      className="template-query-promotor__input__icon"
                      title="workspace"
                    >
                      <GitBranchIcon className="template-query-promotor__input__icon--workspce" />
                    </div>
                    <div className="input-group template-query-promotor__input__input">
                      <input
                        className={clsx(
                          'input input--dark input-group__input',
                          {
                            'input-group__input--error':
                              !queryPromotionReviewerStore.isWorkspaceNameValid,
                          },
                        )}
                        spellCheck={false}
                        value={queryPromotionReviewerStore.workspaceName}
                        placeholder="Enter a name for your workspace"
                        onChange={changeWorkspaceName}
                      />
                      {!queryPromotionReviewerStore.isWorkspaceNameValid && (
                        <div className="input-group__error-message">
                          Workspace already existed
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="template-query-promotor__group template-query-promotor__group--template">
                <div className="template-query-promotor__group__header">
                  template query
                </div>
                <div className="template-query-promotor__group__content">
                  <div className="template-query-promotor__input">
                    <div className="template-query-promotor__input__label">
                      id
                    </div>
                    <div className="input-group template-query-promotor__input__input">
                      <input
                        className={clsx(
                          'input input--dark input-group__input',
                          {
                            'input-group__input--error':
                              !queryPromotionReviewerStore.isTemplateQueryIdValid,
                          },
                        )}
                        spellCheck={false}
                        placeholder="Create an id for your template query"
                        value={queryPromotionReviewerStore.templateQueryId}
                        onChange={onChangeTemplateQueryId}
                      />
                      {!queryPromotionReviewerStore.isTemplateQueryIdValid && (
                        <div className="input-group__error-message">
                          Invalid template query id
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="template-query-promotor__input">
                    <div className="template-query-promotor__input__label">
                      title
                    </div>
                    <div className="input-group template-query-promotor__input__input">
                      <input
                        className="input input--dark input-group__input"
                        spellCheck={false}
                        placeholder="Create a title for your template query"
                        value={queryPromotionReviewerStore.templateQueryTitle}
                        onChange={onChangeTemplateQueryTitle}
                      />
                    </div>
                  </div>
                  <div className="template-query-promotor__input">
                    <div className="template-query-promotor__input__label">
                      description
                    </div>
                    <div className="input-group template-query-promotor__input__input">
                      <input
                        className="input input--dark input-group__input"
                        spellCheck={false}
                        placeholder="Add some descriptions for your template query"
                        value={
                          queryPromotionReviewerStore.templateQueryDescription
                        }
                        onChange={onChangeTemplateQueryDescription}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="template-query-promotor__actions">
                <button
                  className="template-query-promotor__next-btn btn--dark"
                  onClick={promoteTemplateQuery}
                  disabled={
                    queryPromotionReviewerStore.promoteState.isInProgress ||
                    !queryPromotionReviewerStore.currentQuery ||
                    !queryPromotionReviewerStore.currentQueryInfo ||
                    !queryPromotionReviewerStore.currentProject ||
                    !queryPromotionReviewerStore
                      .currentProjectConfigurationStatus?.isConfigured ||
                    !queryPromotionReviewerStore.workspaceName ||
                    !queryPromotionReviewerStore.templateQueryTitle ||
                    !queryPromotionReviewerStore.isWorkspaceNameValid ||
                    !queryPromotionReviewerStore.isTemplateQueryIdValid
                  }
                >
                  Promote Query
                </button>
              </div>
            </div>
          </div>
        </div>
        <div
          data-testid={LEGEND_STUDIO_TEST_ID.STATUS_BAR}
          className="editor__status-bar"
        />
      </div>
    </div>
  );
});

export const DataSpaceTemplateQueryPromotionReviewer = observer(() => {
  const parameters =
    useParams<DataSpaceTemplateQueryPromotionReviewerPathParams>();
  const dataSpacePath = guaranteeNonNullable(
    parameters[
      DATA_SPACE_TEMPLATE_QUERY_PROMOTION_ROUTE_PATTERN_TOKEN.DATA_SPACE_PATH
    ],
  );
  const queryId = guaranteeNonNullable(
    parameters[
      DATA_SPACE_TEMPLATE_QUERY_PROMOTION_ROUTE_PATTERN_TOKEN.QUERY_ID
    ],
  );

  return (
    <DataSpaceTemplateQueryPromotionReviewerStoreProvider
      dataSpacePath={dataSpacePath}
      queryId={queryId}
    >
      <TemplateQueryPromotionReviewerContent />
    </DataSpaceTemplateQueryPromotionReviewerStoreProvider>
  );
});
