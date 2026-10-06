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

import { LEGEND_CUBE_TEST_ID } from '../__lib__/LegendCubeTesting.js';

/**
 * The Legend Cube page. A placeholder for now: the source picker, the canvas
 * and the results grid replace it as they land.
 */
export const CubeEditor: React.FC = () => (
  <div
    className="legend-cube flex flex-col items-center justify-center gap-2"
    data-testid={LEGEND_CUBE_TEST_ID.EDITOR}
  >
    <div className="text-2xl font-medium">Legend Cube</div>
    <div className="text-base">
      Build queries on a canvas: drag in sources, chain joins and filters, then
      run them. Under construction.
    </div>
  </div>
);
