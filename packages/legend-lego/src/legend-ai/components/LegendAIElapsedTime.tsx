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

const TICK_MS = 1000;

/**
 * `42s`, `3m 05s`, `1h 02m`: short enough to sit at the end of a step line,
 * where legend-shared's `prettyDuration` ("3 minutes 5 seconds") would wrap.
 */
export const formatLegendAICompactDuration = (milliseconds: number): string => {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  const pad = (n: number): string => String(n).padStart(2, '0');
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ${pad(seconds % 60)}s`;
  }
  return `${Math.floor(seconds / 3600)}h ${pad(Math.floor(seconds / 60) % 60)}m`;
};

/**
 * How long something took, from `from` to `to` (ms since epoch); while `to`
 * is undefined it is still going and counts up each second.
 */
export const LegendAIElapsedTime = (props: {
  from: number;
  to?: number | undefined;
}): React.ReactNode => {
  const { from, to } = props;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (to !== undefined) {
      return undefined;
    }
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return (): void => clearInterval(timer);
  }, [to]);
  return (
    <span className="legend-ai__elapsed">
      {formatLegendAICompactDuration((to ?? now) - from)}
    </span>
  );
};
