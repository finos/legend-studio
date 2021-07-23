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

import type { ProjectMetadata } from '@finos/legend-studio';
import { useApplicationStore } from '@finos/legend-studio';
import {
  CustomSelectorInput,
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
    const applicationStore = useApplicationStore();
    const setupStore = useQuerySetupStore();
    const queryStore = useQueryStore();

    // project
    const projectOptions = setupStore.projectMetadatas.map(buildProjectOption);
    const selectedProjectOption = queryStore.currentProjectMetadata
      ? buildProjectOption(queryStore.currentProjectMetadata)
      : null;

    const onProjectOptionChange = (option: ProjectOption | null): void => {
      if (option?.value !== queryStore.currentProjectMetadata) {
        queryStore.setCurrentProjectMetadata(option?.value);
        if (queryStore.currentProjectMetadata) {
          queryStore.setCurrentVersionId(undefined);
          flowResult(setupStore.loadProjectVersions()).catch(
            applicationStore.alertIllegalUnhandledError,
          );
        } else {
          queryStore.setCurrentVersionId(undefined);
        }
      }
    };

    // version
    const versionOptions =
      queryStore.currentProjectMetadata?.versions?.map(buildVersionOption) ??
      [];
    const selectedVersionOption = queryStore.currentVersionId
      ? buildVersionOption(queryStore.currentVersionId)
      : null;

    const onVersionOptionChange = (option: VersionOption | null): void => {
      if (option?.value !== queryStore.currentVersionId) {
        queryStore.setCurrentVersionId(option?.value);
        if (queryStore.currentVersionId) {
          flowResult(queryStore.buildGraph()).catch(
            applicationStore.alertIllegalUnhandledError,
          );
        } else {
          queryStore.editorStore.graphState.resetGraph();
        }
      }
    };

    useEffect(() => {
      setupStore.init();
    }, [setupStore]);

    return (
      <div className="query-setup__create-query">
        <div className="query-setup__create-query__header">
          <div className="query-setup__create-query__header__title">
            Creating a new query...
          </div>
        </div>
        <div className="query-setup__create-query__content">
          <div className="query-setup__create-query__group">
            <div className="query-setup__create-query__group__title">
              Project
            </div>
            <CustomSelectorInput
              className="query-setup__create-query__selector"
              options={projectOptions}
              disabled={
                setupStore.loadProjectMetadataState.isInProgress ||
                !projectOptions.length
              }
              isLoading={setupStore.loadProjectMetadataState.isInProgress}
              onChange={onProjectOptionChange}
              value={selectedProjectOption}
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
                setupStore.loadVersionsState.isInProgress ||
                !versionOptions.length
              }
              isLoading={setupStore.loadVersionsState.isInProgress}
              onChange={onVersionOptionChange}
              value={selectedVersionOption}
              isClearable={true}
              escapeClearsValue={true}
              darkMode={true}
            />
          </div>
          <div className="query-setup__create-query__graph">
            {/* {queryStore.editorStore.graphState.graph.isBuilt} */}
            <div className="query-setup__create-query__group">
              <div className="query-setup__create-query__group__title">
                Mapping
              </div>
              <CustomSelectorInput
                className="query-setup__create-query__selector"
                options={versionOptions}
                disabled={
                  !queryStore.currentProjectMetadata ||
                  setupStore.loadVersionsState.isInProgress ||
                  !versionOptions.length
                }
                isLoading={setupStore.loadVersionsState.isInProgress}
                onChange={onVersionOptionChange}
                value={selectedVersionOption}
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
                options={versionOptions}
                disabled={
                  !queryStore.currentProjectMetadata ||
                  setupStore.loadVersionsState.isInProgress ||
                  !versionOptions.length
                }
                isLoading={setupStore.loadVersionsState.isInProgress}
                onChange={onVersionOptionChange}
                value={selectedVersionOption}
                isClearable={true}
                escapeClearsValue={true}
                darkMode={true}
              />
            </div>
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
            Edit existing query
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
