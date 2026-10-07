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

import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { lazy, Suspense } from 'react';

// Loaded on the first visit, so the Cube page and its UI libraries stay out
// of Query's main bundle (PLAN §3.5, Settled before M1.8)
const LazyLegendQueryCubePage = lazy(() =>
  import('./LegendQueryCubePage.js').then((module) => ({
    default: module.LegendQueryCubePage,
  })),
);

/** The element of the `/cube` route */
export const LegendQueryCubeRoute: React.FC = () => (
  <Suspense
    fallback={
      <CubesLoadingIndicator isLoading={true}>
        <CubesLoadingIndicatorIcon />
      </CubesLoadingIndicator>
    }
  >
    <LazyLegendQueryCubePage />
  </Suspense>
);
