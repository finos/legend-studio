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
  StoreProjectData,
} from '@finos/legend-server-depot';
import type { LegendStudioApplicationStore } from '../LegendStudioBaseStore.js';
import { generateViewProjectRoute } from '../../__lib__/LegendStudioNavigation.js';

export const createViewSDLCProjectHandler =
  (
    applicationStore: LegendStudioApplicationStore,
    depotServerClient: DepotServerClient,
  ) =>
  async (groupId: string, artifactId: string): Promise<void> => {
    // fetch project data
    const project = StoreProjectData.serialization.fromJson(
      await depotServerClient.getProject(groupId, artifactId),
    );
    applicationStore.navigationService.navigator.visitAddress(
      applicationStore.navigationService.navigator.generateAddress(
        generateViewProjectRoute(project.projectId),
      ),
    );
  };
