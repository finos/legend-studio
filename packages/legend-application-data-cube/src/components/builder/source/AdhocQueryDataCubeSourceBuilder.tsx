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

import { observer } from 'mobx-react-lite';
import { CustomSelectorInput, WarningIcon } from '@finos/legend-art';
import { useEffect, useState } from 'react';
import { flowResult } from 'mobx';
import { type LegendDataCubeBuilderStore } from '../../../stores/builder/LegendDataCubeBuilderStore.js';
import { LATEST_VERSION_ALIAS } from '@finos/legend-server-depot';
import {
  ActionState,
  assertErrorThrown,
  compareSemVerVersions,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import {
  CORE_PURE_PATH,
  V1_Mapping,
  V1_PackageableRuntime,
  V1_deserializePackageableElement,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import type { AdhocQueryDataCubeSourceBuilderState } from '../../../stores/builder/source/AdhocQueryDataCubeSourceBuilderState.js';
import {
  buildProjectOption,
  buildRuntimeOption,
  buildVersionOption,
  type ProjectOption,
  type RuntimeOption,
  type VersionOption,
} from './UserDefinedFunctionDataCubeSourceBuilder.js';
import { DataCubeCodeEditor } from '@finos/legend-data-cube';

export type MappingOption = {
  label: string;
  value: V1_Mapping;
};
export const buildMappingOption = (mapping: V1_Mapping): MappingOption => ({
  label: mapping.name,
  value: mapping,
});

export const AdhocQueryDataCubeSourceBuilder = observer(
  (props: {
    sourceBuilder: AdhocQueryDataCubeSourceBuilderState;
    store: LegendDataCubeBuilderStore;
  }) => {
    const { sourceBuilder, store } = props;
    const [fetchSelectedProjectVersionsStatus] = useState(ActionState.create());
    const [fetchSelectedVersionRuntimesStatus] = useState(ActionState.create());
    const [fetchSelectedVersionMappingsStatus] = useState(ActionState.create());

    //projects
    const projectOptions = sourceBuilder.projects.map(buildProjectOption);
    const selectedProjectOption = sourceBuilder.currentProject
      ? buildProjectOption(sourceBuilder.currentProject)
      : null;
    const projectSelectorPlaceholder = sourceBuilder.loadProjectsState
      .isInProgress
      ? 'Loading projects'
      : sourceBuilder.loadProjectsState.hasFailed
        ? 'Error fetching projects'
        : sourceBuilder.projects.length
          ? 'Choose a project'
          : 'No Projects available from depot';
    const onProjectOptionChange = async (
      option: ProjectOption | null,
    ): Promise<void> => {
      if (option?.value !== sourceBuilder.currentProject) {
        sourceBuilder.setCurrentProject(option?.value);

        // cascade
        sourceBuilder.setCurrentVersionId(undefined);
        sourceBuilder.setCurrentProjectVersions([]);
        sourceBuilder.setCurrentRuntime(undefined);
        sourceBuilder.setRuntimes([]);
        sourceBuilder.setModelPointer(undefined);
        sourceBuilder.setMappings([]);
        sourceBuilder.setCurrentMapping(undefined);
        sourceBuilder.codeEditorState.clearQuery();

        try {
          fetchSelectedProjectVersionsStatus.inProgress();
          const versions = await store.depotServerClient.getVersions(
            guaranteeNonNullable(option?.value.groupId),
            guaranteeNonNullable(option?.value.artifactId),
            true,
          );
          sourceBuilder.setCurrentProjectVersions(versions);
        } catch (error) {
          assertErrorThrown(error);
          store.application.notificationService.notifyError(error);
        } finally {
          fetchSelectedProjectVersionsStatus.reset();
        }
      }
    };

    //versions
    const versionOptions = [
      LATEST_VERSION_ALIAS,
      ...(sourceBuilder.currentProjectVersions ?? []),
    ]
      .toSorted((v1, v2) => compareSemVerVersions(v2, v1))
      .map(buildVersionOption);
    const selectedVersionOption = sourceBuilder.currentVersionId
      ? buildVersionOption(sourceBuilder.currentVersionId)
      : null;
    const versionSelectorPlaceholder = !sourceBuilder.currentProject
      ? 'No project selected'
      : 'Choose a version';
    const onVersionChange = async (
      option: VersionOption | null,
    ): Promise<void> => {
      if (option?.value !== sourceBuilder.currentVersionId) {
        sourceBuilder.setCurrentVersionId(option?.value);

        //cascade
        sourceBuilder.setCurrentRuntime(undefined);
        sourceBuilder.setRuntimes([]);
        sourceBuilder.setCurrentMapping(undefined);
        sourceBuilder.setMappings([]);
        sourceBuilder.codeEditorState.clearQuery();

        //by this point, we should have all the necessary info to build the model context pointer
        sourceBuilder.setModelPointer(
          sourceBuilder.buildPureModelContextPointer(),
        );

        try {
          const plugins =
            store.application.pluginManager.getPureProtocolProcessorPlugins();

          //runtimes
          fetchSelectedVersionRuntimesStatus.inProgress();
          const allFetchedRuntimes =
            await store.depotServerClient.getVersionEntities(
              guaranteeNonNullable(sourceBuilder.currentProject?.groupId),
              guaranteeNonNullable(sourceBuilder.currentProject?.artifactId),
              guaranteeNonNullable(option?.value),
              CORE_PURE_PATH.RUNTIME,
            );
          const fetchedRuntimeOptions: V1_PackageableRuntime[] = [];
          allFetchedRuntimes.forEach((runtime) => {
            const runtimeEntity = runtime.entity as Entity;
            const currentRuntimeElement = V1_deserializePackageableElement(
              runtimeEntity.content,
              plugins,
            );
            if (currentRuntimeElement instanceof V1_PackageableRuntime) {
              fetchedRuntimeOptions.push(currentRuntimeElement);
            }
          });
          sourceBuilder.setRuntimes(fetchedRuntimeOptions);
          fetchSelectedVersionRuntimesStatus.reset();

          //mappings
          fetchSelectedVersionMappingsStatus.inProgress();
          const allFetchedMappings =
            await store.depotServerClient.getVersionEntities(
              guaranteeNonNullable(sourceBuilder.currentProject?.groupId),
              guaranteeNonNullable(sourceBuilder.currentProject?.artifactId),
              guaranteeNonNullable(option?.value),
              CORE_PURE_PATH.MAPPING,
            );
          const fetchedMappingOptions: V1_Mapping[] = [];
          allFetchedMappings.forEach((mapping) => {
            const mappingEntity = mapping.entity as Entity;
            const currentMappingElement = V1_deserializePackageableElement(
              mappingEntity.content,
              plugins,
            );
            if (currentMappingElement instanceof V1_Mapping) {
              fetchedMappingOptions.push(currentMappingElement);
            }
          });
          sourceBuilder.setMappings(fetchedMappingOptions);
          fetchSelectedVersionMappingsStatus.reset();
        } catch (error) {
          assertErrorThrown(error);
          store.application.notificationService.notifyError(error);
        }
      }
    };

    //runtimes
    const runtimeOptions = sourceBuilder.runtimes?.map(buildRuntimeOption);
    const selectedRuntimeOption = sourceBuilder.currentRuntime
      ? buildRuntimeOption(sourceBuilder.currentRuntime)
      : null;
    const runtimeSelectorPlaceholder = !sourceBuilder.currentVersionId
      ? 'No version selected'
      : 'Choose a  runtime';
    const onRuntimeChange = (option: RuntimeOption | null) => {
      if (option === null) {
        sourceBuilder.codeEditorState.clearQuery();
      }
      if (option?.value !== sourceBuilder.currentRuntime) {
        sourceBuilder.setCurrentRuntime(option?.value);
      }
    };

    //mappings
    const mappingOptions = sourceBuilder.mappings?.map(buildMappingOption);
    const selectedMappingOption = sourceBuilder.currentMapping
      ? buildMappingOption(sourceBuilder.currentMapping)
      : null;
    const mappingSelectorPlaceholder = !sourceBuilder.currentVersionId
      ? 'No version selected'
      : 'Choose a mapping';
    const onMappingChange = (option: MappingOption | null) => {
      if (option?.value !== sourceBuilder.currentMapping) {
        sourceBuilder.setCurrentMapping(option?.value);
      }
    };

    const allowQueryEditing = (): boolean => {
      return Boolean(
        sourceBuilder.currentProject &&
          sourceBuilder.currentVersionId &&
          sourceBuilder.currentRuntime,
      );
    };

    useEffect(() => {
      flowResult(sourceBuilder.loadProjects()).catch(
        store.application.alertUnhandledError,
      );
    }, [sourceBuilder, store.application]);

    return (
      <div className="flex h-full w-full">
        <div className="m-3 flex w-full flex-col items-stretch gap-2 text-neutral-500">
          <div className="query-setup__wizard__group">
            <div className="query-setup__wizard__group__title">Project</div>
            <CustomSelectorInput
              className="query-setup__wizard__selector"
              options={projectOptions}
              disabled={
                sourceBuilder.loadProjectsState.isInProgress ||
                !projectOptions.length
              }
              isLoading={sourceBuilder.loadProjectsState.isInProgress}
              onChange={(option: ProjectOption | null) => {
                onProjectOptionChange(option).catch(
                  store.application.alertUnhandledError,
                );
              }}
              value={selectedProjectOption}
              placeholder={projectSelectorPlaceholder}
              isClearable={true}
              escapeClearsValue={true}
            />
          </div>

          <div className="query-setup__wizard__group">
            <div className="query-setup__wizard__group__title">Version</div>
            <CustomSelectorInput
              className="query-setup__wizard__selector"
              options={versionOptions}
              disabled={
                !sourceBuilder.currentProject ||
                fetchSelectedProjectVersionsStatus.isInProgress ||
                !versionOptions.length
              }
              isLoading={fetchSelectedProjectVersionsStatus.isInProgress}
              onChange={(option: VersionOption | null) => {
                onVersionChange(option).catch(
                  store.application.alertUnhandledError,
                );
              }}
              value={selectedVersionOption}
              placeholder={versionSelectorPlaceholder}
              isClearable={true}
              escapeClearsValue={true}
            />
          </div>

          <div className="query-setup__wizard__group">
            <div className="query-setup__wizard__group__title">Runtime</div>
            <CustomSelectorInput
              className="query-setup__wizard__selector"
              options={runtimeOptions}
              disabled={
                !sourceBuilder.currentVersionId ||
                fetchSelectedVersionRuntimesStatus.isInProgress ||
                !versionOptions.length
              }
              isLoading={fetchSelectedVersionRuntimesStatus.isInProgress}
              onChange={(option: RuntimeOption | null) => {
                onRuntimeChange(option);
              }}
              value={selectedRuntimeOption}
              placeholder={runtimeSelectorPlaceholder}
              isClearable={true}
              escapeClearsValue={true}
            />
          </div>

          <div className="query-setup__wizard__group">
            <div className="query-setup__wizard__group__title">
              Mapping (optional)
            </div>
            <CustomSelectorInput
              className="query-setup__wizard__selector"
              options={mappingOptions}
              disabled={
                !sourceBuilder.currentVersionId ||
                fetchSelectedVersionMappingsStatus.isInProgress ||
                !versionOptions.length
              }
              isLoading={fetchSelectedVersionMappingsStatus.isInProgress}
              onChange={(option: MappingOption | null) => {
                onMappingChange(option);
              }}
              value={selectedMappingOption}
              placeholder={mappingSelectorPlaceholder}
              isClearable={true}
              escapeClearsValue={true}
            />
          </div>

          <div className="query-setup__wizard__group">
            <div className="query-setup__wizard__group__title">Query</div>

            <div
              className="mt-2 h-40 w-full"
              style={{
                border: '2px solid #e5e7eb',
                padding: '5px',
                borderRadius: '5px',
                position: 'relative',
                backgroundColor: allowQueryEditing() ? '#ffffff' : '#f2f2f2',
              }}
            >
              {allowQueryEditing() ? (
                <DataCubeCodeEditor state={sourceBuilder.codeEditorState} />
              ) : (
                <div>No runtime selected </div>
              )}
            </div>
            {sourceBuilder.codeEditorState.compilationError ? (
              <div
                className="flex h-full w-full flex-shrink-0 text-sm"
                style={{ color: 'red' }}
              >
                <WarningIcon />
                Compilation Error: Ensure TDS is returned and all class names
                are correct
              </div>
            ) : sourceBuilder.queryCompileState.isInProgress ? (
              <div className="flex h-full w-full flex-shrink-0 text-sm">
                Compiling query...
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  },
);
