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

import { CubeEditor } from '@finos/legend-cube-builder';
import { useEffect, useState } from 'react';
import {
  readLegendQueryCubeEntry,
  stripLegendQueryCubeEntry,
} from '../../stores/cube/LegendQueryCubeEntry.js';
import { LegendQueryCubeHost } from '../../stores/cube/LegendQueryCubeHost.js';
import { useLegendQueryApplicationStore } from '../LegendQueryFrameworkProvider.js';

/** The Cube page in Legend Query, with a host that lasts as long as the visit */
export const LegendQueryCubePage: React.FC = () => {
  const applicationStore = useLegendQueryApplicationStore();
  const [host] = useState(() => new LegendQueryCubeHost(applicationStore));
  // read once, as the page opens; the address loses it once shown
  const [initialSource] = useState(() =>
    readLegendQueryCubeEntry(applicationStore.navigationService.navigator),
  );
  useEffect(
    () =>
      stripLegendQueryCubeEntry(applicationStore.navigationService.navigator),
    [applicationStore],
  );
  return <CubeEditor host={host} initialSource={initialSource} />;
};
