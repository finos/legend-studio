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

import type { DataSpaceInfo } from '@finos/legend-extension-dsl-data-space/application';
import { GAV_DELIMITER, generateGAVCoordinates } from '@finos/legend-storage';

export interface VisitedDataspace {
  id: string;
  groupId: string;
  artifactId: string;
  path: string;
  versionId: string | undefined;
  execContext?: string | undefined;
}

export type SavedVisitedDataSpaces = VisitedDataspace[];

export const createVisitedDataSpaceId = (
  groupId: string,
  artifactId: string,
  dataSpace: string,
): string =>
  // we will consider unique data product if it belongs to the same project. i.e we will not save 2 dataspaces visited for 2 different versionss
  generateGAVCoordinates(groupId, artifactId, undefined) +
  GAV_DELIMITER +
  dataSpace;

export const createIdFromDataSpaceInfo = (
  info: DataSpaceInfo,
): string | undefined => {
  const groupId = info.groupId;
  const artifactId = info.artifactId;
  if (groupId && artifactId) {
    return createVisitedDataSpaceId(groupId, artifactId, info.path);
  }
  return undefined;
};

export const createSimpleVisitedDataspace = (
  groupId: string,
  artifactId: string,
  versionId: string | undefined,
  path: string,
  exec: string | undefined,
): VisitedDataspace => ({
  id: createVisitedDataSpaceId(groupId, artifactId, path),
  groupId,
  artifactId,
  versionId,
  path,
  execContext: exec,
});

export const createVisitedDataspaceFromInfo = (
  info: DataSpaceInfo,
  execContext: string | undefined,
): VisitedDataspace | undefined => {
  const groupId = info.groupId;
  const artifactId = info.artifactId;
  const versionId = info.versionId;
  const path = info.path;
  if (groupId && artifactId) {
    return createSimpleVisitedDataspace(
      groupId,
      artifactId,
      versionId,
      path,
      execContext,
    );
  }
  return undefined;
};

export const hasDataSpaceInfoBeenVisited = (
  val: DataSpaceInfo,
  visited: SavedVisitedDataSpaces,
): boolean =>
  Boolean(
    visited.find((_visit) => {
      if (_visit.id === createIdFromDataSpaceInfo(val)) {
        return true;
      }
      return false;
    }),
  );
