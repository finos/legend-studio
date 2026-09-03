/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { AppDirNode } from '../../../../../../../../graph/metamodel/pure/packageableElements/ingest/IngestDefinition.js';
import type { V1_AppDirNode } from '../../../../lakehouse/entitlements/V1_CoreEntitlements.js';

export const V1_buildAppDirNode = (v1Node: V1_AppDirNode): AppDirNode => {
  const node = new AppDirNode();
  node.appDirId = v1Node.appDirId;
  node.level = v1Node.level;
  return node;
};
