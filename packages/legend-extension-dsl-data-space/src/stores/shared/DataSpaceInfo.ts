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
  SNAPSHOT_VERSION_ALIAS,
  type StoredEntity,
} from '@finos/legend-server-depot';
import { isString } from '@finos/legend-shared';
import { extractEntityNameFromPath } from '@finos/legend-storage';

export interface DataSpaceInfo {
  groupId: string | undefined;
  artifactId: string | undefined;
  versionId: string | undefined;
  title: string | undefined;
  name: string;
  path: string;
  /**
   * NOTE: technically, this should be always available, but we must not
   * assume that no data product is marlformed, so we leave it as optional
   */
  defaultExecutionContext: string | undefined;
}

export const extractDataSpaceInfo = (
  storedEntity: StoredEntity,
  isSnapshot: boolean,
): DataSpaceInfo => ({
  groupId: storedEntity.groupId,
  artifactId: storedEntity.artifactId,
  versionId: isSnapshot ? SNAPSHOT_VERSION_ALIAS : storedEntity.versionId,
  path: storedEntity.entity.path,
  name: extractEntityNameFromPath(storedEntity.entity.path),
  title: isString(storedEntity.entity.content.title)
    ? storedEntity.entity.content.title
    : undefined,
  // NOTE: we don't want to assert the existence of this field even when it
  // is required in the specification of data product, so we don't throw error here
  defaultExecutionContext: isString(
    storedEntity.entity.content.defaultExecutionContext,
  )
    ? storedEntity.entity.content.defaultExecutionContext
    : undefined,
});
