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

import type { TracerService } from '@finos/legend-shared';
import type { CubeEngine } from '../../CubeEngine.js';
import {
  type V1_CubeEngineConfig,
  V1_LegendCubeEngine,
} from './v1/V1_LegendCubeEngine.js';

/** The engine client's configuration, as the host gives it (e.g. Legend Query's engine server URL) */
export type CubeEngineConfig = V1_CubeEngineConfig;

/**
 * The Cube engine of a host (PLAN §3.2): the only place that builds the
 * Legend implementation, so hosts never name a V1_* symbol
 */
export const buildCubeEngine = (
  config: CubeEngineConfig,
  tracerService: TracerService,
): CubeEngine => new V1_LegendCubeEngine(config, tracerService);
