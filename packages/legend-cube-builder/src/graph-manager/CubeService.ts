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

import type { ModelContext } from '@finos/legend-cube';

// A cube on services (PLAN §6.4), in progress: its model only marks it as
// one, with no runtime. How a service is read, and what it runs on, are
// still to come

export const CUBE_SERVICE_MODEL_TYPE = 'cubeService';

export const createCubeServiceModel = (): ModelContext =>
  ({ _type: CUBE_SERVICE_MODEL_TYPE }) as ModelContext;

export const isCubeServiceModel = (model: ModelContext): boolean =>
  model._type === CUBE_SERVICE_MODEL_TYPE;
