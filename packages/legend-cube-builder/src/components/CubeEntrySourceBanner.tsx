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
import { LEGEND_CUBE_TEST_ID } from '../__lib__/LegendCubeTesting.js';
import {
  CUBE_ENTRY_SOURCE_ERROR_TITLE,
  type CubeEntrySourceState,
} from '../stores/CubeEntrySource.js';
import { CubeButton } from './CubeButton.js';

/** Why the source a link named couldn't be added, in the graph region (spec §17.13, U9(b)) */
export const CubeEntrySourceBanner = observer(
  (props: { entry: CubeEntrySourceState }) => {
    const { entry } = props;
    if (entry.isOpening) {
      return (
        <div
          className="shrink-0 border-b border-[var(--color-border-default)] px-2 py-1 text-base text-[var(--color-text-secondary)]"
          role="status"
        >
          Opening the linked source…
        </div>
      );
    }
    if (entry.error === undefined) {
      return null;
    }
    return (
      <div
        className="flex shrink-0 items-start gap-2 border-b border-[var(--color-border-default)] bg-[var(--color-status-error-bg)] px-2 py-1 text-base text-[var(--color-status-error)]"
        role="alert"
        data-testid={LEGEND_CUBE_TEST_ID.ENTRY_SOURCE_ERROR}
      >
        <span className="min-w-0 flex-1 break-words">
          <span className="font-medium">{CUBE_ENTRY_SOURCE_ERROR_TITLE}</span>{' '}
          {entry.error}
        </span>
        <CubeButton onClick={() => entry.dismissError()}>Dismiss</CubeButton>
      </div>
    );
  },
);
