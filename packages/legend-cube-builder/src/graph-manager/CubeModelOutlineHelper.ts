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

/**
 * The database type a query on these databases runs on with the runtime, for
 * the operations some databases take another way (PLAN §11.4): the type of
 * the runtime's connections to them. None when the runtime isn't in the
 * outline, a database has no typed connection, or the databases' types
 * differ: the native forms are written then.
 */
export const getDatabaseType = (
  outline: CubeModelOutline,
  runtimePath: string,
  databasePaths: readonly string[],
): string | undefined => {
  const runtime = outline.runtimes.find(({ path }) => path === runtimePath);
  const types = new Set<string>();
  for (const databasePath of new Set(databasePaths)) {
    const databaseTypes = (runtime?.connections ?? [])
      .filter(({ storePath }) => storePath === databasePath)
      .map(({ databaseType }) => databaseType);
    if (!databaseTypes.length) {
      return undefined;
    }
    databaseTypes.forEach((databaseType) => types.add(databaseType));
  }
  return types.size === 1 ? [...types][0] : undefined;
};
