/**
 * Copyright 2020 Goldman Sachs
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

import type { V1_PackageableElementPointer } from '../../model/packageableElements/V1_PackageableElement';

export abstract class V1_Sdlc {
  baseVersion = 'latest';
  version: string;
  packageableElementPointers: V1_PackageableElementPointer[] = [];

  constructor(version: string | undefined) {
    this.version = version ?? 'none';
  }
}

export class V1_AlloySdlc extends V1_Sdlc {
  project: string;

  constructor(project: string, version: string | undefined) {
    super(version);
    this.project = project;
  }
}
