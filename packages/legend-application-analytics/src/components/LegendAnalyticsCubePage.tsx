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

import { useParams } from '@finos/legend-application/browser';
import { CubeEditor } from '@finos/legend-cube-builder';
import { useCallback, useEffect, useState } from 'react';
import {
  LEGEND_ANALYTICS_ROUTE_PATTERN_TOKEN,
  type LegendAnalyticsCubePathParams,
} from '../__lib__/LegendAnalyticsNavigation.js';
import {
  readLegendAnalyticsCubeId,
  showLegendAnalyticsCubeInAddress,
} from '../stores/LegendAnalyticsCubeAddress.js';
import { createLegendAnalyticsCubeHost } from '../stores/LegendAnalyticsCubeHost.js';
import { useLegendAnalyticsApplicationStore } from './LegendAnalyticsFrameworkProvider.js';

/**
 * The Cube page in Legend Analytics, with a host that lasts as long as the
 * visit. A saved cube the address names, by `/cube/:cubeId` or `?queryId=`,
 * opens with the page, and the address then follows the saved cube shown
 * (PLAN §11.13)
 */
export const LegendAnalyticsCubePage: React.FC = () => {
  const applicationStore = useLegendAnalyticsApplicationStore();
  const { navigator } = applicationStore.navigationService;
  const params = useParams<LegendAnalyticsCubePathParams>();
  const [host] = useState(() =>
    createLegendAnalyticsCubeHost(applicationStore),
  );
  // read once, as the page opens
  const [initialCubeId] = useState(() =>
    readLegendAnalyticsCubeId(
      navigator,
      params[LEGEND_ANALYTICS_ROUTE_PATTERN_TOKEN.CUBE_ID],
    ),
  );
  useEffect(() => {
    if (initialCubeId !== undefined) {
      // `?queryId=` becomes the path, which then keeps showing the cube
      showLegendAnalyticsCubeInAddress(navigator, initialCubeId);
    }
  }, [navigator, initialCubeId]);
  // set on Load and Save, cleared on New, Paste and Import (QUESTIONS.md U9)
  const onSavedCubeChange = useCallback(
    (cubeId: string | undefined) =>
      showLegendAnalyticsCubeInAddress(navigator, cubeId),
    [navigator],
  );
  return (
    <CubeEditor
      host={host}
      initialCubeId={initialCubeId}
      onSavedCubeChange={onSavedCubeChange}
    />
  );
};
