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

import type { DepotServerClient } from './DepotServerClient.js';
import type { StoreProjectData } from './models/StoreProjectData.js';

/**
 * NOTE: `HEAD` alias does not exist in depot server
 * instead, it uses `master-SNAPSHOT` which to us is not generic enough.
 */
export const SNAPSHOT_VERSION_ALIAS = 'HEAD';
export const LATEST_VERSION_ALIAS = 'latest';
export const MASTER_SNAPSHOT_ALIAS = 'master-SNAPSHOT';

export const resolveVersion = (versionId: string): string =>
  versionId === SNAPSHOT_VERSION_ALIAS ? MASTER_SNAPSHOT_ALIAS : versionId;

export const resolveProjectVersion = async (
  project: StoreProjectData,
  versionId: string,
  serverClient: DepotServerClient,
): Promise<string> => {
  if (versionId === LATEST_VERSION_ALIAS) {
    const versionedData = await serverClient.getLatestVersion(
      project.groupId,
      project.artifactId,
    );
    return versionedData.versionId as string;
  } else {
    return resolveVersion(versionId);
  }
};
