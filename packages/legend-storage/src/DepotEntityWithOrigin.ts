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

import type { ProjectGAVCoordinates } from './DependencyUtils.js';

/**
 * Base class for entities stored in the depot with their origin information.
 * This class contains common properties for depot entities like groupId, artifactId, versionId, name, and path.
 */

export class DepotEntityWithOrigin {
  origin: ProjectGAVCoordinates | undefined;
  name: string;
  path: string;
  classifierPath: string;

  constructor(
    origin: ProjectGAVCoordinates | undefined,
    name: string,
    path: string,
    classifierPath: string,
  ) {
    this.origin = origin;
    this.name = name;
    this.path = path;
    this.classifierPath = classifierPath;
  }
}
