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

import { CubeCodeCheckStatus } from '../../stores/editors/CubeExpressionAutoCheck.js';

// How a box of Pure code shows its check (user, 2026-10-16): its border
// green once the code is ready, red with a problem, and the theme's own
// while it is checked or not edited yet

const BORDERS: Readonly<Record<CubeCodeCheckStatus, string>> = {
  [CubeCodeCheckStatus.UNEDITED]: 'border-[var(--color-border-default)]',
  [CubeCodeCheckStatus.CHECKING]: 'border-[var(--color-border-default)]',
  [CubeCodeCheckStatus.READY]: 'border-[var(--color-status-success)]',
  [CubeCodeCheckStatus.PROBLEM]: 'border-[var(--color-status-error)]',
};

/** The classes of a code box's frame: two pixels, so the check shows */
export const getCubeCodeBoxClass = (status: CubeCodeCheckStatus): string =>
  `overflow-hidden rounded-sm border-2 ${BORDERS[status]}`;

/** What the box's status line says while it is checked or not edited yet */
export const CUBE_CODE_CHECK_LABEL = Object.freeze({
  CHECKING: 'Checking…',
  UNEDITED: 'It is checked once you stop typing',
});
