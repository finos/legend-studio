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

import type { VersionedProjectData } from '@finos/legend-server-depot';

export abstract class CubeInputSource {}

export abstract class LegendDepotSavedSource {
  project!: VersionedProjectData;
}

export class LegendSavedQuerySource extends CubeInputSource {
  id: string;

  constructor(id: string) {
    super();
    this.id = id;
  }
}

export class LegendDepotService extends LegendDepotSavedSource {
  service!: string;
}

export class LegendDepotFunction extends LegendDepotSavedSource {
  _function!: string;
}

export class LegendDepotTable extends LegendDepotSavedSource {
  database!: string;
  schema!: string;
  table!: string;
  runtime!: string;
}
