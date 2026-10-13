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
  LEGEND_QUERY_ROUTE_PATTERN_TOKEN,
  type LegendQueryCubePathParams,
} from '../../__lib__/LegendQueryNavigation.js';
import {
  readLegendQueryCubeEntry,
  readLegendQueryCubeId,
  showLegendQueryCubeInAddress,
  stripLegendQueryCubeEntry,
} from '../../stores/cube/LegendQueryCubeEntry.js';
import { LegendQueryCubeHost } from '../../stores/cube/LegendQueryCubeHost.js';
import { useLegendQueryApplicationStore } from '../LegendQueryFrameworkProvider.js';

/** The Cube page in Legend Query, with a host that lasts as long as the visit */
export const LegendQueryCubePage: React.FC = () => {
  const applicationStore = useLegendQueryApplicationStore();
  const { navigator } = applicationStore.navigationService;
  const params = useParams<LegendQueryCubePathParams>();
  const [host] = useState(() => new LegendQueryCubeHost(applicationStore));
  // read once, as the page opens: a saved cube, by the path or `?queryId=`
  // (PLAN §11.13), else a source a link names, which the address then loses
  const [initialCubeId] = useState(() =>
    readLegendQueryCubeId(
      navigator,
      params[LEGEND_QUERY_ROUTE_PATTERN_TOKEN.CUBE_ID],
    ),
  );
  const [initialSource] = useState(() =>
    initialCubeId === undefined
      ? readLegendQueryCubeEntry(navigator)
      : undefined,
  );
  useEffect(() => {
    stripLegendQueryCubeEntry(navigator);
    if (initialCubeId !== undefined) {
      // `?queryId=` becomes the path, which the page keeps showing the cube
      showLegendQueryCubeInAddress(navigator, initialCubeId);
    }
  }, [navigator, initialCubeId]);
  // the address shows the saved cube: set on Load and Save, cleared on New,
  // Paste and Import (QUESTIONS.md U9), with no history entry
  const onSavedCubeChange = useCallback(
    (cubeId: string | undefined) =>
      showLegendQueryCubeInAddress(navigator, cubeId),
    [navigator],
  );
  return (
    <CubeEditor
      host={host}
      initialSource={initialSource}
      initialCubeId={initialCubeId}
      onSavedCubeChange={onSavedCubeChange}
    />
  );
};
