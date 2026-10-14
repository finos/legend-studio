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
import {
  CUBE_SERVICE_MESSAGE,
  getShownServicesLabel,
} from '../../__lib__/LegendCubeServiceLabels.js';
import { CUBE_PENDING_LABEL } from '../../__lib__/LegendCubeLabels.js';
import type { CubeServiceTabState } from '../../stores/source-picker/CubeServiceTabState.js';
import { CubeButton } from '../CubeButton.js';
import {
  CUBE_PICKER_LIST_CLASS,
  CubePickerListItem,
} from './CubePickerListItem.js';

const INPUT_CLASS =
  'h-7 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base text-[var(--color-text-primary)]';

/**
 * The source dialog's Service tab (PLAN §6.4), in progress: the deployed
 * services, searched by title, name and pattern, and the picked one's
 * details. A service can be added, but Cube can't read it yet.
 */
export const CubeServiceTab = observer(
  (props: { tab: CubeServiceTabState }) => {
    const { tab } = props;
    const picked = tab.service;
    const shownLabel = getShownServicesLabel(
      tab.shownServices.length,
      tab.matchingServices.length,
    );
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm text-[var(--color-text-muted)]">
          {CUBE_SERVICE_MESSAGE.IN_PROGRESS}
        </span>
        <input
          className={INPUT_CLASS}
          placeholder="Search services"
          aria-label="Search services"
          value={tab.search}
          onChange={(event) => tab.setSearch(event.target.value)}
        />
        {tab.isLoading && (
          <div className="text-base text-[var(--color-text-secondary)]">
            listing services
          </div>
        )}
        {tab.services && (
          <>
            {tab.shownServices.length ? (
              <ul
                className={`h-56 overflow-auto ${CUBE_PICKER_LIST_CLASS}`}
                aria-label="Services"
              >
                {tab.shownServices.map((service) => (
                  <CubePickerListItem
                    key={service.pattern}
                    picked={tab.pattern === service.pattern}
                    title={service.name}
                    adds={true}
                    onPick={() => tab.selectService(service.pattern)}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {service.title ?? service.name}
                    </span>
                    <span className="max-w-[50%] shrink-0 truncate text-sm text-[var(--color-text-muted)]">
                      {service.pattern}
                    </span>
                  </CubePickerListItem>
                ))}
              </ul>
            ) : (
              <div className="text-base text-[var(--color-text-secondary)]">
                {tab.services.length
                  ? CUBE_SERVICE_MESSAGE.NO_MATCH
                  : CUBE_SERVICE_MESSAGE.NONE}
              </div>
            )}
            {shownLabel !== undefined && (
              <span className="text-sm text-[var(--color-text-muted)]">
                {shownLabel}
              </span>
            )}
          </>
        )}
        {picked && (
          <section
            aria-label="Service details"
            className="flex flex-col gap-1 text-base"
          >
            <span className="break-all font-medium">{picked.name}</span>
            <span className="break-all text-[var(--color-text-secondary)]">
              {picked.pattern}
            </span>
            {picked.owners.length > 0 && (
              <span className="text-sm text-[var(--color-text-muted)]">
                {`Owners: ${picked.owners.join(', ')}`}
              </span>
            )}
            {picked.documentation.trim() !== '' && (
              <p className="max-h-20 overflow-auto whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
                {picked.documentation}
              </p>
            )}
          </section>
        )}
        {tab.isAdding && (
          <div className="text-base text-[var(--color-text-secondary)]">
            {CUBE_PENDING_LABEL.RESOLVING_SOURCE}
          </div>
        )}
        {tab.error !== undefined && (
          <div
            className="flex flex-col gap-1 text-base text-[var(--color-status-error)]"
            role="alert"
          >
            <span>{tab.error.message}</span>
            {tab.error.detail !== undefined && (
              <details className="text-sm">
                <summary className="cursor-pointer">Details</summary>
                <pre className="whitespace-pre-wrap break-words">
                  {tab.error.detail}
                </pre>
              </details>
            )}
            {tab.services === undefined && (
              <div>
                <CubeButton onClick={() => tab.retry()}>Retry</CubeButton>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);
