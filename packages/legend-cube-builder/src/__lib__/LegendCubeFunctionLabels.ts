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

import type { SchemaDiff } from '@finos/legend-cube';
import { getSchemaChangeList } from './LegendCubeLabels.js';

// The text of function sources (PLAN §6.5): the source dialog's Project
// tab, when it reads functions, and a function's panel

export const getFunctionDriftWarning = (diff: SchemaDiff): string =>
  `This function's columns changed since the cube was saved: ${getSchemaChangeList(diff)}`;

export const getFunctionRecheckWarning = (firstLine: string): string =>
  `Could not re-check this function, so it keeps its saved columns: ${firstLine}`;

export const CUBE_FUNCTION_MESSAGE = {
  NO_ANSWER: 'The engine gave no columns for this function',
  /** Under a function with its own runtime */
  RUNS_ON: (runtime: string): string =>
    `Runs on ${runtime}, set by the function`,
  /** A function with its own runtime, on a cube that runs on another */
  OTHER_RUNTIME: (runtime: string, cubeRuntime: string): string =>
    `It reads through ${runtime}, but the cube runs on ${cubeRuntime}`,
  NONE: 'This version has no function that returns a relation.',
  NO_MATCH: 'No function matches the search.',
  CUBE_CHANGED:
    'The cube changed while the function was being added; pick it again.',
} as const;
