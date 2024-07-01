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
  StoreProjectData,
  type DepotServerClient,
} from '@finos/legend-server-depot';
import {
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl,
} from '../../__lib__/LegendQueryNavigation.js';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';
import { parseProjectIdentifier } from '@finos/legend-storage';
import type { QueryEditorStore } from '../QueryEditorStore.js';
import {
  DataSpacesDepotRepository,
  type DataSpaceInfo,
} from '@finos/legend-extension-dsl-data-space/application';

export const createViewProjectHandler =
  (applicationStore: LegendQueryApplicationStore) =>
  (
    groupId: string,
    artifactId: string,
    versionId: string,
    entityPath: string | undefined,
  ): void =>
    applicationStore.navigationService.navigator.visitAddress(
      EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
        applicationStore.config.studioApplicationUrl,
        groupId,
        artifactId,
        versionId,
        entityPath,
      ),
    );

export const createViewSDLCProjectHandler =
  (
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
  ) =>
  async (
    groupId: string,
    artifactId: string,
    entityPath: string | undefined,
  ): Promise<void> => {
    // fetch project data
    const project = StoreProjectData.serialization.fromJson(
      await depotServerClient.getProject(groupId, artifactId),
    );
    // find the matching SDLC instance
    const projectIDPrefix = parseProjectIdentifier(project.projectId).prefix;
    const matchingSDLCEntry = applicationStore.config.studioInstances.find(
      (entry) => entry.sdlcProjectIDPrefix === projectIDPrefix,
    );
    if (matchingSDLCEntry) {
      applicationStore.navigationService.navigator.visitAddress(
        EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl(
          matchingSDLCEntry.url,
          project.projectId,
          undefined,
          entityPath,
        ),
      );
    } else {
      applicationStore.notificationService.notifyWarning(
        `Can't find the corresponding SDLC instance to view the SDLC project`,
      );
    }
  };

export const createDataSpaceDepoRepo = (
  editorStore: QueryEditorStore,
  groupId: string,
  artifactId: string,
  versionId: string,
  prioritizeDataSpaceFunc: ((val: DataSpaceInfo) => boolean) | undefined,
): DataSpacesDepotRepository =>
  new DataSpacesDepotRepository(
    editorStore.depotServerClient,
    editorStore.applicationStore,
    editorStore.graphManagerState,
    {
      groupId,
      artifactId,
      versionId,
    },
    createViewProjectHandler(editorStore.applicationStore),
    createViewSDLCProjectHandler(
      editorStore.applicationStore,
      editorStore.depotServerClient,
    ),
    prioritizeDataSpaceFunc,
  );
