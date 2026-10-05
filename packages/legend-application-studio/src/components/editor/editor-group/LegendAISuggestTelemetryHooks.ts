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

import { useEffect, useState } from 'react';
import type { EditorStore } from '../../../stores/editor/EditorStore.js';
import { LegendAISuggestTelemetryTracker } from '../../../stores/editor/LegendAISuggestTelemetry.js';
import type { LegendAISuggestTarget } from '../../../__lib__/LegendStudioTelemetryHelper.js';

/**
 * Creates a {@link LegendAISuggestTelemetryTracker} bound to the lifetime of
 * the calling component: it reports `exposure` on mount (only when a LegendAI
 * URL is configured, so deployments without LegendAI emit nothing) and
 * `abandon` on unmount if a suggestion is still pending or on screen.
 */
export const useLegendAISuggestTelemetry = (
  editorStore: EditorStore,
  target: LegendAISuggestTarget,
  exposure: {
    legendAIUrl: string | undefined;
    available: boolean;
    isReadOnly: boolean;
  },
): LegendAISuggestTelemetryTracker => {
  const [tracker] = useState(
    () => new LegendAISuggestTelemetryTracker(editorStore, target),
  );
  const { surface, elementPath, accessPointGroupId } = target;
  useEffect(() => {
    tracker.setTarget({ surface, elementPath, accessPointGroupId });
  }, [tracker, surface, elementPath, accessPointGroupId]);

  const hasLegendAIUrl = Boolean(exposure.legendAIUrl);
  const { available, isReadOnly } = exposure;
  useEffect(() => {
    if (hasLegendAIUrl) {
      tracker.reportExposure({ available, isReadOnly });
    }
    return () => tracker.dispose();
    // NOTE: exposure is reported once per mount on purpose; re-reporting on
    // every read-only / availability flip would inflate the funnel denominator.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracker]);
  return tracker;
};
