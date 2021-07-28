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

import type {
  Mapping,
  PackageableElementSelectOption,
  PackageableRuntime,
  ProjectMetadata,
} from '@finos/legend-studio';
import { useApplicationStore } from '@finos/legend-studio';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BlankPanelContent,
  clsx,
  CustomSelectorInput,
  PanelLoadingIndicator,
  PencilIcon,
  PlusIcon,
  RobotIcon,
} from '@finos/legend-studio-components';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { FaQuestionCircle } from 'react-icons/fa';
import { generateCreateNewQueryRoute } from '../../stores/LegendQueryRouter';
import {
  CreateQuerySetupState,
  EditQuerySetupState,
  QuerySetupStoreProvider,
  ServiceQuerySetupState,
  useQuerySetupStore,
} from '../../stores/QuerySetupStore';
import { useQueryStore } from '../../stores/QueryStore';

type ProjectOption = { label: string; value: ProjectMetadata };
const buildProjectOption = (project: ProjectMetadata): ProjectOption => ({
  label: project.projectId,
  value: project,
});

type VersionOption = { label: string; value: string };
const buildVersionOption = (version: string): VersionOption => ({
  label: version,
  value: version,
});

const CreateQuerySetup = observer(
  (props: { querySetupState: CreateQuerySetupState }) => {
    const { querySetupState } = props;
    const applicationStore = useApplicationStore();
    const setupStore = useQuerySetupStore();
    const queryStore = useQueryStore();
    const back = (): void => {
      setupStore.setSetupState(undefined);
      setupStore.queryStore.setCurrentVersionId(undefined);
      setupStore.queryStore.setCurrentProjectMetadata(undefined);
      setupStore.queryStore.editorStore.graphState.resetGraph();
    };
    const next = (): void => {
      if (
        queryStore.currentProjectMetadata &&
        queryStore.currentVersionId &&
        querySetupState.currentMapping &&
        querySetupState.currentRuntime
      ) {
        applicationStore.historyApiClient.push(
          generateCreateNewQueryRoute(
            queryStore.currentProjectMetadata.projectId,
            queryStore.currentVersionId,
            querySetupState.currentMapping.path,
            querySetupState.currentRuntime.path,
          ),
        );
      }
      setupStore.setSetupState(undefined);
    };
    const canProceed =
      queryStore.currentProjectMetadata &&
      queryStore.currentVersionId &&
      queryStore.editorStore.graphState.graph.buildState.hasSucceeded &&
      !queryStore.editorStore.graphState.isInitializingGraph &&
      querySetupState.currentMapping &&
      querySetupState.currentRuntime;

    // project
    const projectOptions =
      querySetupState.projectMetadatas.map(buildProjectOption);
    const selectedProjectOption = queryStore.currentProjectMetadata
      ? buildProjectOption(queryStore.currentProjectMetadata)
      : null;
    const projectSelectorPlaceholder = querySetupState.loadProjectMetadataState
      .isInProgress
      ? 'Loading projects'
      : querySetupState.loadProjectMetadataState.hasFailed
      ? 'Error fetching projects'
      : querySetupState.projectMetadatas.length
      ? 'Choose a project'
      : 'You have no projects, please create or acquire access for at least one';
    const onProjectOptionChange = (option: ProjectOption | null): void => {
      if (option?.value !== queryStore.currentProjectMetadata) {
        queryStore.setCurrentProjectMetadata(option?.value);
        // cascade
        queryStore.setCurrentVersionId(undefined);
        querySetupState.setCurrentMapping(undefined);
        querySetupState.setCurrentRuntime(undefined);
        if (queryStore.currentProjectMetadata) {
          flowResult(querySetupState.loadProjectVersions()).catch(
            applicationStore.alertIllegalUnhandledError,
          );
        }
      }
    };

    // version
    const versionOptions = (
      queryStore.currentProjectMetadata?.versions ?? []
    ).map(buildVersionOption);
    const selectedVersionOption = queryStore.currentVersionId
      ? buildVersionOption(queryStore.currentVersionId)
      : null;
    const versionSelectorPlaceholder = querySetupState.loadVersionsState
      .isInProgress
      ? 'Loading versions'
      : !queryStore.currentProjectMetadata
      ? 'No project selected'
      : querySetupState.loadVersionsState.hasFailed
      ? 'Error fetching versions'
      : queryStore.currentProjectMetadata.versions.length
      ? 'Choose a version'
      : 'The specified project has no published version';
    const onVersionOptionChange = (option: VersionOption | null): void => {
      if (option?.value !== queryStore.currentVersionId) {
        queryStore.setCurrentVersionId(option?.value);
        // cascade
        queryStore.editorStore.graphState.resetGraph();
        querySetupState.setCurrentMapping(undefined);
        querySetupState.setCurrentRuntime(undefined);
        if (queryStore.currentVersionId) {
          flowResult(queryStore.buildGraph()).catch(
            applicationStore.alertIllegalUnhandledError,
          );
        }
      }
    };

    // mapping
    const mappingOptions = queryStore.editorStore.mappingOptions;
    const selectedMappingOption = querySetupState.currentMapping
      ? {
          label: querySetupState.currentMapping.name,
          value: querySetupState.currentMapping,
        }
      : null;
    const mappingSelectorPlaceholder = mappingOptions.length
      ? 'Choose a mapping'
      : 'No mapping available';
    const onMappingOptionChange = (
      option: PackageableElementSelectOption<Mapping> | null,
    ): void => {
      querySetupState.setCurrentMapping(option?.value);
      // cascade
      if (querySetupState.currentMapping) {
        if (querySetupState.runtimeOptions.length) {
          querySetupState.setCurrentRuntime(
            querySetupState.runtimeOptions[0].value,
          );
        }
      } else {
        querySetupState.setCurrentRuntime(undefined);
      }
    };

    // runtime
    const runtimeOptions = querySetupState.runtimeOptions;
    const selectedRuntimeOption = querySetupState.currentRuntime
      ? {
          label: querySetupState.currentRuntime.name,
          value: querySetupState.currentRuntime,
        }
      : null;
    const runtimeSelectorPlaceholder = !querySetupState.currentMapping
      ? 'No mapping specified'
      : runtimeOptions.length
      ? 'Choose a runtime'
      : 'No runtime available';
    const onRuntimeOptionChange = (
      option: PackageableElementSelectOption<PackageableRuntime> | null,
    ): void => {
      querySetupState.setCurrentRuntime(option?.value);
    };

    useEffect(() => {
      flowResult(querySetupState.loadProjects());
    }, [querySetupState]);

    return (
      <div className="query-setup__create-query">
        <div className="query-setup__create-query__header">
          <button
            className="query-setup__create-query__header__btn"
            onClick={back}
            title="Back to Main Menu"
          >
            <ArrowLeftIcon />
          </button>
          <div className="query-setup__create-query__header__title">
            Creating a new query...
          </div>
          <button
            className={clsx('query-setup__create-query__header__btn', {
              'query-setup__create-query__header__btn--ready': canProceed,
            })}
            onClick={next}
            disabled={!canProceed}
            title="Proceed"
          >
            <ArrowRightIcon />
          </button>
        </div>
        <div className="query-setup__create-query__content">
          <div className="query-setup__create-query__project">
            <div className="query-setup__create-query__group">
              <div className="query-setup__create-query__group__title">
                Project
              </div>
              <CustomSelectorInput
                className="query-setup__create-query__selector"
                options={projectOptions}
                disabled={
                  querySetupState.loadProjectMetadataState.isInProgress ||
                  !projectOptions.length
                }
                isLoading={
                  querySetupState.loadProjectMetadataState.isInProgress
                }
                onChange={onProjectOptionChange}
                value={selectedProjectOption}
                placeholder={projectSelectorPlaceholder}
                isClearable={true}
                escapeClearsValue={true}
                darkMode={true}
              />
            </div>
            <div className="query-setup__create-query__group">
              <div className="query-setup__create-query__group__title">
                Version
              </div>
              <CustomSelectorInput
                className="query-setup__create-query__selector"
                options={versionOptions}
                disabled={
                  !queryStore.currentProjectMetadata ||
                  querySetupState.loadVersionsState.isInProgress ||
                  !versionOptions.length
                }
                isLoading={querySetupState.loadVersionsState.isInProgress}
                onChange={onVersionOptionChange}
                value={selectedVersionOption}
                placeholder={versionSelectorPlaceholder}
                isClearable={true}
                escapeClearsValue={true}
                darkMode={true}
              />
            </div>
          </div>
          <div className="query-setup__create-query__graph">
            {(!queryStore.currentProjectMetadata ||
              !queryStore.currentVersionId ||
              !queryStore.editorStore.graphState.graph.buildState
                .hasSucceeded ||
              queryStore.editorStore.graphState.isInitializingGraph) && (
              <div className="query-setup__create-query__graph__loader">
                <PanelLoadingIndicator
                  isLoading={
                    Boolean(queryStore.currentProjectMetadata) &&
                    Boolean(queryStore.currentVersionId) &&
                    !queryStore.editorStore.graphState.graph.buildState
                      .hasSucceeded &&
                    !queryStore.editorStore.graphState.isInitializingGraph
                  }
                />
                <BlankPanelContent>
                  {queryStore.editorStore.graphState.graph.buildState.hasFailed
                    ? `Can't build graph`
                    : queryStore.editorStore.graphState.isInitializingGraph
                    ? `Building graph...`
                    : 'Project and version must be specified'}
                </BlankPanelContent>
              </div>
            )}
            {queryStore.currentProjectMetadata &&
              queryStore.currentVersionId &&
              queryStore.editorStore.graphState.graph.buildState.hasSucceeded &&
              !queryStore.editorStore.graphState.isInitializingGraph && (
                <>
                  <div className="query-setup__create-query__group">
                    <div className="query-setup__create-query__group__title">
                      Mapping
                    </div>
                    <CustomSelectorInput
                      className="query-setup__create-query__selector"
                      options={mappingOptions}
                      disabled={!mappingOptions.length}
                      onChange={onMappingOptionChange}
                      value={selectedMappingOption}
                      placeholder={mappingSelectorPlaceholder}
                      isClearable={true}
                      escapeClearsValue={true}
                      darkMode={true}
                    />
                  </div>
                  <div className="query-setup__create-query__group">
                    <div className="query-setup__create-query__group__title">
                      Runtime
                    </div>
                    <CustomSelectorInput
                      className="query-setup__create-query__selector"
                      options={runtimeOptions}
                      disabled={
                        !mappingOptions.length ||
                        !querySetupState.currentMapping
                      }
                      onChange={onRuntimeOptionChange}
                      value={selectedRuntimeOption}
                      placeholder={runtimeSelectorPlaceholder}
                      isClearable={true}
                      escapeClearsValue={true}
                      darkMode={true}
                    />
                  </div>
                </>
              )}
          </div>
        </div>
      </div>
    );
  },
);

const QuerySetupLandingPage = observer(() => {
  const setupStore = useQuerySetupStore();
  const queryStore = useQueryStore();
  const editQuery = (): void =>
    setupStore.setSetupState(new EditQuerySetupState(queryStore));
  const loadServiceQuery = (): void =>
    setupStore.setSetupState(new ServiceQuerySetupState(queryStore));
  const createQuery = (): void =>
    setupStore.setSetupState(new CreateQuerySetupState(queryStore));

  return (
    <div className="query-setup__landing-page">
      <div className="query-setup__landing-page__title">
        What do you want to do today
        <FaQuestionCircle
          className="query-setup__landing-page__title__question-mark"
          title="Choose one of the option below to start"
        />
      </div>
      <div className="query-setup__landing-page__options">
        <button
          className="query-setup__landing-page__option query-setup__landing-page__option--edit"
          onClick={editQuery}
        >
          <div className="query-setup__landing-page__option__icon">
            <PencilIcon className="query-setup__landing-page__icon--edit" />
          </div>
          <div className="query-setup__landing-page__option__label">
            Load an existing query
          </div>
        </button>
        <button
          className="query-setup__landing-page__option query-setup__landing-page__option--load-service"
          onClick={loadServiceQuery}
        >
          <div className="query-setup__landing-page__option__icon">
            <RobotIcon />
          </div>
          <div className="query-setup__landing-page__option__label">
            Load query from a service
          </div>
        </button>
        <button
          className="query-setup__landing-page__option query-setup__landing-page__option--create"
          onClick={createQuery}
        >
          <div className="query-setup__landing-page__option__icon">
            <PlusIcon />
          </div>
          <div className="query-setup__landing-page__option__label">
            Create a new query
          </div>
        </button>
      </div>
    </div>
  );
});

const QuerySetupInner = observer(() => {
  const setupStore = useQuerySetupStore();
  const querySetupState = setupStore.querySetupState;

  return (
    <div className="query-setup">
      {!querySetupState && <QuerySetupLandingPage />}
      {querySetupState instanceof EditQuerySetupState && (
        <QuerySetupLandingPage />
      )}
      {querySetupState instanceof ServiceQuerySetupState && (
        <QuerySetupLandingPage />
      )}
      {querySetupState instanceof CreateQuerySetupState && (
        <CreateQuerySetup querySetupState={querySetupState} />
      )}
    </div>
  );
});

export const QuerySetup: React.FC = () => (
  <QuerySetupStoreProvider>
    <DndProvider backend={HTML5Backend}>
      <QuerySetupInner />
    </DndProvider>
  </QuerySetupStoreProvider>
);
