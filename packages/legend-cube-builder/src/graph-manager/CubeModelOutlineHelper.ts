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

import type { CubeModelOutline, CubeOutlineRuntime } from './CubeEngine.js';

/**
 * The runtimes a query on the database can run with: those with a connection
 * keyed by exactly that database. The engine matches stores by exact element
 * and silently falls back to the first connection otherwise, so a runtime
 * that only reaches the database through an include is not offered (PLAN
 * §6.2.5).
 */
export const getRuntimesForDatabase = (
  outline: CubeModelOutline,
  databasePath: string,
): CubeOutlineRuntime[] =>
  outline.runtimes.filter((runtime) =>
    runtime.storePaths.includes(databasePath),
  );
