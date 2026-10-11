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
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  TimesIcon,
} from '@finos/legend-art';
import {
  type AggregationFunction,
  foldColumnName,
  getAggregationDisplayName,
  getDefaultDrilldownAggregation,
  getDrilldownAggregations,
} from '@finos/legend-cube';
import { observer } from 'mobx-react-lite';
import { READ_ONLY_CUBE_TITLE } from '../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import { CubeButton } from '../CubeButton.js';

/** The value of the setting that leaves a column empty on group rows */
const NO_AGGREGATION = '';

/**
 * How a group row shows each column of the run that isn't a level (PLAN
 * §11.10): a function its type offers, or nothing; the default (a number's
 * Sum, nothing for any other column) is marked
 */
export const CubeDrilldownSettingsDialog = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const { grid } = editorState;
    const { result } = editorState.execution;
    const drilldown = grid.drilldown;
    const darkMode =
      !editorState.host.applicationStore.layoutService
        .TEMPORARY__isLightColorThemeEnabled;
    if (!result || !drilldown) {
      return null;
    }
    const levels = new Set(drilldown.columns.map(foldColumnName));
    const label = (fn: AggregationFunction | null, isDefault: boolean) =>
      `${fn === null ? 'Nothing' : getAggregationDisplayName(fn)}${isDefault ? ' (default)' : ''}`;
    return (
      <Dialog open={grid.isSettingsOpen} onClose={() => grid.closeSettings()}>
        <Modal darkMode={darkMode} className="w-[520px] max-w-full">
          <ModalHeader>
            <div className="modal__title">Group rows</div>
          </ModalHeader>
          <ModalBody>
            <p className="mb-2 text-base text-[var(--color-text-secondary)]">
              {`What each group row shows in the columns the results don't drill down by.`}
            </p>
            <div
              className="grid max-h-[50vh] grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 overflow-auto"
              data-testid={LEGEND_CUBE_TEST_ID.DRILLDOWN_SETTINGS}
            >
              {result.schema.columns
                .filter(({ name }) => !levels.has(foldColumnName(name)))
                .map(({ name, type }) => {
                  const fallback = getDefaultDrilldownAggregation(type);
                  const current = drilldown.aggregationOf(name);
                  return [
                    <label
                      key={`${name}:label`}
                      htmlFor={`cube-drilldown-${name}`}
                      className="truncate text-base"
                      title={`${name} (${type.displayName})`}
                    >
                      {name}
                    </label>,
                    <select
                      key={`${name}:select`}
                      id={`cube-drilldown-${name}`}
                      aria-label={`Group rows' ${name}`}
                      className="h-6 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base text-[var(--color-text-primary)]"
                      value={current ?? NO_AGGREGATION}
                      disabled={editorState.readOnly}
                      title={
                        editorState.readOnly ? READ_ONLY_CUBE_TITLE : undefined
                      }
                      onChange={(event) =>
                        grid.setAggregation(
                          name,
                          event.target.value === NO_AGGREGATION
                            ? null
                            : (event.target.value as AggregationFunction),
                        )
                      }
                    >
                      <option value={NO_AGGREGATION}>
                        {label(null, fallback === null)}
                      </option>
                      {getDrilldownAggregations(type).map((fn) => (
                        <option key={fn} value={fn}>
                          {label(fn, fallback === fn)}
                        </option>
                      ))}
                    </select>,
                  ];
                })}
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              type="secondary"
              text="Close"
              onClick={() => grid.closeSettings()}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

/**
 * The drill-down above the grid in server-side mode (PLAN §11.10): its
 * levels, outermost first, each removable; what it can't use, and why; the
 * group rows' settings; and Clear. Shown while the cube has a drill-down.
 */
export const CubeDrilldownBar = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const { grid } = editorState;
    const saved = editorState.document.meta.drilldown;
    const drilldown = grid.drilldown;
    if (
      !saved ||
      !drilldown ||
      (!saved.columns.length && !drilldown.problems.length)
    ) {
      return null;
    }
    const { readOnly } = editorState;
    return (
      <div
        className="flex min-h-8 shrink-0 flex-wrap items-center gap-2 border-b border-[var(--color-border-default)] px-2 py-1 text-base"
        data-testid={LEGEND_CUBE_TEST_ID.DRILLDOWN_BAR}
      >
        <span className="text-[var(--color-text-secondary)]">
          Drill down by
        </span>
        {drilldown.columns.map((column, index) => (
          <span key={column} className="flex items-center gap-1">
            {index > 0 && (
              <span className="text-[var(--color-text-muted)]">›</span>
            )}
            <span className="flex items-center gap-1 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-1">
              {column}
              <button
                type="button"
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
                aria-label={`Stop drilling down by ${column}`}
                title={
                  readOnly
                    ? READ_ONLY_CUBE_TITLE
                    : `Stop drilling down by ${column}`
                }
                disabled={readOnly}
                onClick={() =>
                  grid.removeLevel(
                    saved.columns.findIndex(
                      (level) =>
                        foldColumnName(level) === foldColumnName(column),
                    ),
                  )
                }
              >
                <TimesIcon />
              </button>
            </span>
          </span>
        ))}
        {drilldown.problems.length > 0 && (
          <span
            className="text-[var(--color-status-warn)]"
            role="status"
            title={drilldown.problems.join('\n')}
          >
            {drilldown.problems.length === 1
              ? drilldown.problems[0]
              : `${drilldown.problems.length} drill-down settings can't be used here.`}
          </span>
        )}
        <span className="flex-1" />
        <CubeButton onClick={() => grid.openSettings()}>Group rows…</CubeButton>
        <CubeButton
          disabled={readOnly}
          title={readOnly ? READ_ONLY_CUBE_TITLE : 'Stop drilling down'}
          onClick={() => grid.clearDrilldown()}
        >
          Clear
        </CubeButton>
        <CubeDrilldownSettingsDialog editorState={editorState} />
      </div>
    );
  },
);
