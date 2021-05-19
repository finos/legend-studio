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

import { AbstractServerClient } from '@finos/legend-studio-network';
import type { PlainObject } from '@finos/legend-studio-shared';
import type {
  ProjectVersion,
  ProjectVersionEntities,
} from './models/ProjectVersionEntities';

interface MetadataServerClientConfig {
  serverUrl: string;
}

export class MetadataServerClient extends AbstractServerClient {
  constructor(config: MetadataServerClientConfig) {
    super({
      baseUrl: config.serverUrl,
    });
  }

  private _projects = (): string => `${this.networkClient.baseUrl}/projects`;

  getDependencyEntities = (
    /**
     * List of (direct) dependencies.
     */
    dependencies: PlainObject<ProjectVersion>[],
    /**
     * Flag indicating if transitive dependencies should be returned.
     */
    transitive: boolean,
    /**
     * Flag indicating whether to return the root of the dependency tree.
     */
    includeOrigin: boolean,
  ): Promise<PlainObject<ProjectVersionEntities>[]> =>
    this.post(
      `${this._projects()}/versions/dependencies`,
      dependencies,
      undefined,
      undefined,
      {
        transitive,
        includeOrigin,
        versioned: false, // we don't need to add version prefix to entity path
      },
    );
}
