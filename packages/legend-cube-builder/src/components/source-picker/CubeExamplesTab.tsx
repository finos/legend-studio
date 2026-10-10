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

import { clsx } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import type { CubeExamplesTabState } from '../../stores/source-picker/CubeExamplesTabState.js';

/**
 * The example cubes, by dataset (PLAN §6.9): picking one and pressing Open
 * replaces the cube with it and runs it
 */
export const CubeExamplesTab = observer(
  (props: { tab: CubeExamplesTabState }) => {
    const { tab } = props;
    return (
      <div className="flex flex-col gap-2">
        <div className="text-base text-[var(--color-text-secondary)]">
          Open an example cube on sample data. It replaces this cube: Undo
          brings it back.
        </div>
        {tab.datasets.map(([dataset, examples]) => (
          <div key={dataset}>
            <div className="mb-1 text-sm font-medium uppercase text-[var(--color-text-secondary)]">
              {dataset}
            </div>
            <ul
              className="rounded-sm border border-[var(--color-border-default)]"
              aria-label={`${dataset} examples`}
            >
              {examples.map((example) => {
                const isPicked = tab.selectedId === example.id;
                return (
                  <li key={example.id}>
                    <button
                      type="button"
                      className={clsx(
                        'flex w-full flex-col px-2 py-1 text-left enabled:hover:bg-[var(--color-bg-hover)]',
                        { 'bg-[var(--color-bg-selected)]': isPicked },
                      )}
                      aria-pressed={isPicked}
                      onClick={() => tab.select(example.id)}
                    >
                      <span className="text-base text-[var(--color-text-primary)]">
                        {example.name}
                      </span>
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {example.description}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    );
  },
);
