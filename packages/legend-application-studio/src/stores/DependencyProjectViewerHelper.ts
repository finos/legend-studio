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

import { useWebApplicationNavigator } from '@finos/legend-application';
import {
  type DepotServerClient,
  ProjectData,
} from '@finos/legend-server-depot';
import { parseProjectIdentifier } from '@finos/legend-storage';
import type { LegendStudioApplicationStore } from './LegendStudioBaseStore.js';
import {
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl,
  EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl,
} from './LegendStudioRouter.js';

export const createViewProjectHandler =
  (applicationStore: LegendStudioApplicationStore) =>
  (
    groupId: string,
    artifactId: string,
    versionId: string,
    entityPath: string | undefined,
  ): void => {
    applicationStore.navigator.visitAddress(
      EXTERNAL_APPLICATION_NAVIGATION__generateStudioProjectViewUrl(
        applicationStore.config.baseUrl,
        groupId,
        artifactId,
        versionId,
        entityPath,
      ),
    );
  };

export const createViewSDLCProjectHandler =
  (
    applicationStore: LegendStudioApplicationStore,
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
    applicationStore.navigator.visitAddress(
      EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl(
        applicationStore.config.baseUrl,
        project.projectId,
        entityPath,
      ),
    );
  };
