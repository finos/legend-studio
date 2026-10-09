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

import type { CubeDataProductProject } from './CubeDataProduct.js';

/**
 * The viewer's lakehouse environment (PLAN §6.8), which a data product run
 * names in its lakehouse runtime: its own port, so hosts without a lakehouse
 * need none. Fails with a `CubeEngineError` when the viewer has none
 */
export interface CubeLakehouseEnvironment {
  /** The viewer's environment for the project's class, e.g. `env`, or `env-pp` for production-parallel */
  resolveEnvironment(project: CubeDataProductProject): Promise<string>;
}
