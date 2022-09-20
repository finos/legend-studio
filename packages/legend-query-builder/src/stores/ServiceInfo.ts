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
  MASTER_SNAPSHOT_ALIAS,
  SNAPSHOT_VERSION_ALIAS,
  type StoredEntity,
} from '@finos/legend-server-depot';
import { isString } from '@finos/legend-shared';
import { extractEntityNameFromPath } from '@finos/legend-storage';

export interface ServiceInfo {
  groupId: string;
  artifactId: string;
  versionId: string;
  path: string;
  name: string;
  urlPattern?: string | undefined;
}

export const extractServiceInfo = (
  storedEntity: StoredEntity,
): ServiceInfo => ({
  groupId: storedEntity.groupId,
  artifactId: storedEntity.artifactId,
  versionId:
    storedEntity.versionId === MASTER_SNAPSHOT_ALIAS
      ? SNAPSHOT_VERSION_ALIAS
      : storedEntity.versionId,
  path: storedEntity.entity.path,
  name: extractEntityNameFromPath(storedEntity.entity.path),
  // NOTE: we don't want to assert the existence of this field even when it
  // is required in the specification of service, so we don't throw error here
  urlPattern: isString(storedEntity.entity.content.pattern)
    ? storedEntity.entity.content.pattern
    : undefined,
});
