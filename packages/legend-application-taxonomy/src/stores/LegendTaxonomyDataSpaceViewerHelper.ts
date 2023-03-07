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
  type DepotServerClient,
  ProjectData,
} from '@finos/legend-server-depot';
import { parseProjectIdentifier } from '@finos/legend-storage';
import type { LegendTaxonomyApplicationStore } from './LegendTaxonomyBaseStore.js';
import {
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl,
} from './LegendTaxonomyRouter.js';

export const createViewProjectHandler =
  (applicationStore: LegendTaxonomyApplicationStore) =>
  (
    groupId: string,
    artifactId: string,
    versionId: string,
    entityPath: string | undefined,
  ): void =>
    applicationStore.navigationService.visitAddress(
      EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
        applicationStore.config.studioUrl,
        groupId,
        artifactId,
        versionId,
        entityPath,
      ),
    );

export const createViewSDLCProjectHandler =
  (
    applicationStore: LegendTaxonomyApplicationStore,
    depotServerClient: DepotServerClient,
  ) =>
  async (
    groupId: string,
    artifactId: string,
    entityPath: string | undefined,
  ): Promise<void> => {
    // fetch project data
    const project = ProjectData.serialization.fromJson(
      await depotServerClient.getProject(groupId, artifactId),
    );
    // find the matching SDLC instance
    const projectIDPrefix = parseProjectIdentifier(project.projectId).prefix;
    const matchingSDLCEntry = applicationStore.config.studioInstances.find(
      (entry) => entry.sdlcProjectIDPrefix === projectIDPrefix,
    );
    if (matchingSDLCEntry) {
      applicationStore.navigationService.visitAddress(
        EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl(
          matchingSDLCEntry.url,
          project.projectId,
          entityPath,
        ),
      );
    } else {
      applicationStore.notifyWarning(
        `Can't find the corresponding SDLC instance to view the SDLC project`,
      );
    }
  };
