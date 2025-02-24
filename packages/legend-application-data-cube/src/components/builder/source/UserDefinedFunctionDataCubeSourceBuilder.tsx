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
import { CustomSelectorInput } from '@finos/legend-art';
import { useEffect, useState } from 'react';
import { flowResult } from 'mobx';
import type { LegendDataCubeBuilderStore } from '../../../stores/builder/LegendDataCubeBuilderStore.js';
import {
  LATEST_VERSION_ALIAS,
  MASTER_SNAPSHOT_ALIAS,
  SNAPSHOT_VERSION_ALIAS,
  type StoreProjectData,
} from '@finos/legend-server-depot';
import {
  ActionState,
  assertErrorThrown,
  compareSemVerVersions,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import {
  CORE_PURE_PATH,
  V1_ConcreteFunctionDefinition,
  V1_PackageableRuntime,
  V1_PackageableType,
  V1_deserializePackageableElement,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import type { UserDefinedFunctionDataCubeSourceBuilderState } from '../../../stores/builder/source/UserDefinedFunctionDataCubeSourceBuilderState.js';

export type ProjectOption = { label: string; value: StoreProjectData };
export const buildProjectOption = (
  project: StoreProjectData,
): ProjectOption => ({
  label: `${project.groupId}.${project.artifactId}`,
  value: project,
});

export type VersionOption = { label: string; value: string };
export const buildVersionOption = (version: string): VersionOption => {
  if (version === MASTER_SNAPSHOT_ALIAS) {
    return {
      label: SNAPSHOT_VERSION_ALIAS,
      value: version,
    };
  }
  return {
    label: version,
    value: version,
  };
};

export type FunctionOption = {
  label: string;
  value: V1_ConcreteFunctionDefinition;
};
export const buildFunctionOption = (
  functionDefinition: V1_ConcreteFunctionDefinition,
): FunctionOption => ({
  label: functionDefinition.name,
  value: functionDefinition,
});

export type RuntimeOption = {
  label: string;
  value: V1_PackageableRuntime;
};
export const buildRuntimeOption = (
  runtime: V1_PackageableRuntime,
): RuntimeOption => ({
  label: runtime.name,
  value: runtime,
});

export const UserDefinedFunctionDataCubeSourceBuilder = observer(
  (props: {
    sourceBuilder: UserDefinedFunctionDataCubeSourceBuilderState;
    store: LegendDataCubeBuilderStore;
  }) => {
    const { sourceBuilder, store } = props;
    const [fetchSelectedProjectVersionsStatus] = useState(ActionState.create());
    const [fetchSelectedVersionFunctionsStatus] = useState(
      ActionState.create(),
    );
    const [fetchSelectedVersionRuntimesStatus] = useState(ActionState.create());

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
        sourceBuilder.setCurrentFunction(undefined);
        sourceBuilder.setFunctions([]);
        sourceBuilder.setCurrentRuntime(undefined);
        sourceBuilder.setRuntimes([]);

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
    const validFunctionReturn = (
      currentPackageableElement: V1_ConcreteFunctionDefinition,
    ) => {
      if (
        currentPackageableElement.returnGenericType.rawType instanceof
        V1_PackageableType
      ) {
        const fullPath =
          currentPackageableElement.returnGenericType.rawType.fullPath;
        return fullPath === CORE_PURE_PATH.RELATION;
      }
      return false;
    };
    const onVersionChange = async (
      option: VersionOption | null,
    ): Promise<void> => {
      if (option?.value !== sourceBuilder.currentVersionId) {
        sourceBuilder.setCurrentVersionId(option?.value);

        //cascade
        sourceBuilder.setCurrentFunction(undefined);
        sourceBuilder.setFunctions([]);
        sourceBuilder.setCurrentRuntime(undefined);
        sourceBuilder.setRuntimes([]);

        try {
          const plugins =
            store.application.pluginManager.getPureProtocolProcessorPlugins();

          //functions
          fetchSelectedVersionFunctionsStatus.inProgress();
          const allFetchedFunctions =
            await store.depotServerClient.getVersionEntities(
              guaranteeNonNullable(sourceBuilder.currentProject?.groupId),
              guaranteeNonNullable(sourceBuilder.currentProject?.artifactId),
              guaranteeNonNullable(option?.value),
              CORE_PURE_PATH.FUNCTION,
            );

          const fetchedFunctionOptions: V1_ConcreteFunctionDefinition[] = [];
          allFetchedFunctions.forEach((fn) => {
            const functionEntity = fn.entity as Entity;
            const currentFunction = V1_deserializePackageableElement(
              functionEntity.content,
              plugins,
            );
            if (
              currentFunction instanceof V1_ConcreteFunctionDefinition &&
              validFunctionReturn(currentFunction)
            ) {
              fetchedFunctionOptions.push(currentFunction);
            }
          });
          sourceBuilder.setFunctions(fetchedFunctionOptions);

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
        } catch (error) {
          assertErrorThrown(error);
          store.application.notificationService.notifyError(error);
        } finally {
          fetchSelectedVersionFunctionsStatus.reset();
          fetchSelectedVersionRuntimesStatus.reset();
        }
      }
    };

    //functions
    const functionOptions = sourceBuilder.functions?.map((functionDefinition) =>
      buildFunctionOption(functionDefinition),
    );
    const selectedFunctionOption = sourceBuilder.currentFunction
      ? buildFunctionOption(sourceBuilder.currentFunction)
      : null;
    const functionSelectorPlaceholder = !sourceBuilder.currentVersionId
      ? 'No version selected'
      : 'Choose a  function';
    const onFunctionChange = (option: FunctionOption | null) => {
      if (option?.value !== sourceBuilder.currentFunction) {
        sourceBuilder.setCurrentFunction(option?.value);
      }
    };

    //runtimes
    const runtimeOptions = sourceBuilder.runtimes?.map(buildRuntimeOption);
    const selectedRuntimeOption = sourceBuilder.currentRuntime
      ? buildRuntimeOption(sourceBuilder.currentRuntime)
      : null;
    const runtimeSelectorPlaceholder = !sourceBuilder.currentVersionId
      ? 'No version selected'
      : 'Choose a  function';
    const onRuntimeChange = (option: RuntimeOption | null) => {
      if (option?.value !== sourceBuilder.currentRuntime) {
        sourceBuilder.setCurrentRuntime(option?.value);
      }
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
            <div className="query-setup__wizard__group__title">Function</div>
            <CustomSelectorInput
              className="query-setup__wizard__selector"
              options={functionOptions}
              disabled={
                !sourceBuilder.currentVersionId ||
                fetchSelectedVersionFunctionsStatus.isInProgress ||
                !versionOptions.length
              }
              isLoading={fetchSelectedVersionFunctionsStatus.isInProgress}
              onChange={(option: FunctionOption | null) => {
                onFunctionChange(option);
              }}
              value={selectedFunctionOption}
              placeholder={functionSelectorPlaceholder}
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
        </div>
      </div>
    );
  },
);
