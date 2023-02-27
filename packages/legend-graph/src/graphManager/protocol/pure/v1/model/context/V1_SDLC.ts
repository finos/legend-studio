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

import type { V1_PackageableElementPointer } from '../packageableElements/V1_PackageableElement.js';

export abstract class V1_SDLC {
  baseVersion = 'latest';
  version: string;
  packageableElementPointers: V1_PackageableElementPointer[] = [];

  constructor(version: string | undefined) {
    this.version = version ?? 'none';
  }
}

export class V1_LegendSDLC extends V1_SDLC {
  groupId: string;
  artifactId: string;

  constructor(
    groupId: string,
    artifactId: string,
    version: string | undefined,
  ) {
    super(version);
    this.groupId = groupId;
    this.artifactId = artifactId;
  }
}
