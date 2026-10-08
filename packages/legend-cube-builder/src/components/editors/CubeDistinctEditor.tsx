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

import { observer } from 'mobx-react-lite';
import { DISTINCT_EDITOR_TEXT } from '../../__lib__/LegendCubeLabels.js';

/**
 * The Distinct editor (spec §17.6: "nothing — description only"). Distinct
 * has no settings, so it has no draft, and the panel shows no Apply or Cancel.
 */
export const CubeDistinctEditor = observer(() => (
  <div className="text-base text-[var(--color-text-secondary)]">
    {DISTINCT_EDITOR_TEXT}
  </div>
));
