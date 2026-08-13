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
import { Alert, Collapse } from '@mui/material';

const DEFAULT_AUTO_COLLAPSE_MS = 30_000;

/**
 * An informational banner that collapses itself after a fixed delay, so short-lived
 * context notices (e.g. "this page's behavior changed recently") don't linger and
 * compete with the content they're explaining.
 *
 * The countdown starts once, on mount, and is unaffected by re-renders of this
 * component's parent (e.g. a new search running) — it only resets if the banner
 * itself unmounts and remounts.
 */
export const TimedInfoBanner: React.FC<{
  children: React.ReactNode;
  className?: string;
  autoCollapseAfterMs?: number;
}> = ({
  children,
  className = '',
  autoCollapseAfterMs = DEFAULT_AUTO_COLLAPSE_MS,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => setVisible(false), autoCollapseAfterMs);
    return () => clearTimeout(timeoutId);
  }, [autoCollapseAfterMs]);

  return (
    <Collapse in={visible} unmountOnExit={true}>
      <Alert severity="info" className={className}>
        {children}
      </Alert>
    </Collapse>
  );
};
