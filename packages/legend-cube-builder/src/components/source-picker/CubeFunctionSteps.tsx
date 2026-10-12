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

import { getFunctionParameterValueError } from '@finos/legend-cube';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { CUBE_FUNCTION_MESSAGE } from '../../__lib__/LegendCubeFunctionLabels.js';
import type { CubeOutlineFunction } from '../../graph-manager/CubeEngine.js';
import {
  CubeModelReadKind,
  type CubeInlineModelTabState,
} from '../../stores/source-picker/CubeInlineModelTabState.js';
import {
  CUBE_PICKER_LIST_CLASS,
  CubePickerListItem,
} from './CubePickerListItem.js';
import { CubePickerStep } from './CubePickerStep.js';

const INPUT_CLASS =
  'h-7 min-w-0 flex-1 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base text-[var(--color-text-primary)]';

const lastSegment = (path: string): string => {
  const index = path.lastIndexOf('::');
  return index < 0 ? path : path.slice(index + 2);
};

/** A function's parameters as the list shows them: `(min: Float, status?: String)` */
export const getCubeFunctionParametersLabel = (
  fn: CubeOutlineFunction,
): string =>
  `(${fn.parameters
    .map(
      (parameter) =>
        `${parameter.name}${parameter.multiplicity === '[0..1]' ? '?' : ''}: ${lastSegment(parameter.type)}`,
    )
    .join(', ')})`;

/** Tables or functions: what a model's tab reads (PLAN §6.5) */
export const CubeReadKindToggle = observer(
  (props: { tab: CubeInlineModelTabState }) => {
    const { tab } = props;
    const option = (kind: CubeModelReadKind, label: string) => (
      <button
        type="button"
        className={`h-6 px-3 text-base ${
          tab.readKind === kind
            ? 'bg-[var(--color-bg-selected)] font-medium text-[var(--color-text-primary)]'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
        }`}
        aria-pressed={tab.readKind === kind}
        onClick={() => tab.setReadKind(kind)}
      >
        {label}
      </button>
    );
    return (
      <div className="flex items-center gap-2">
        <span className="w-20 shrink-0 text-base">Read</span>
        <div
          className="flex overflow-hidden rounded-sm border border-[var(--color-border-default)]"
          role="group"
          aria-label="Read"
        >
          {option(CubeModelReadKind.TABLE, 'Tables')}
          {option(CubeModelReadKind.FUNCTION, 'Functions')}
        </div>
      </div>
    );
  },
);

/** A parameter's value, checked as it is typed */
const CubeFunctionParameterInput = observer(
  (props: { tab: CubeInlineModelTabState; index: number }) => {
    const { tab, index } = props;
    const id = useId();
    const parameter = tab.functionParameters[index];
    if (!parameter) {
      return null;
    }
    const text = tab.functionValueTexts[index] ?? '';
    const error = text
      ? getFunctionParameterValueError(parameter, tab.functionValues[index])
      : undefined;
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <label className="w-20 shrink-0 truncate text-base" htmlFor={id}>
            {parameter.name}
          </label>
          <input
            id={id}
            className={INPUT_CLASS}
            placeholder={`${parameter.type.displayName}${parameter.optional ? ', optional' : ''}`}
            aria-invalid={error !== undefined}
            value={text}
            onChange={(event) =>
              tab.setFunctionValueText(index, event.target.value)
            }
          />
        </div>
        {error !== undefined && (
          <span className="pl-[5.5rem] text-sm text-[var(--color-status-error)]">
            {error}
          </span>
        )}
      </div>
    );
  },
);

/**
 * The function steps of a model's tab (PLAN §6.5): the model's functions
 * that return a relation, then the picked one's runtime (its own, or one of
 * the model's), a value for each parameter, and the columns it declares
 */
export const CubeFunctionSteps = observer(
  (props: { tab: CubeInlineModelTabState }) => {
    const { tab } = props;
    const picked = tab.pickedFunction;
    const allFunctions = tab.outline?.functions ?? [];
    return (
      <>
        {tab.outline && (
          <div className="flex flex-col gap-1">
            <input
              className="h-7 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base text-[var(--color-text-primary)]"
              placeholder="Search functions"
              aria-label="Search functions"
              value={tab.functionSearch}
              onChange={(event) => tab.setFunctionSearch(event.target.value)}
            />
            {tab.functions.length ? (
              <ul
                className={`h-40 overflow-auto ${CUBE_PICKER_LIST_CLASS}`}
                aria-label="Functions"
              >
                {tab.functions.map((fn) => (
                  <CubePickerListItem
                    key={fn.signature}
                    picked={tab.functionSignature === fn.signature}
                    disabled={fn.problem !== undefined}
                    title={fn.problem}
                    adds={fn.parameters.length === 0}
                    onPick={() => tab.selectFunction(fn.signature)}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {lastSegment(fn.path)}
                      <span className="text-[var(--color-text-muted)]">
                        {getCubeFunctionParametersLabel(fn)}
                      </span>
                    </span>
                    <span className="max-w-[40%] shrink-0 truncate text-sm text-[var(--color-text-muted)]">
                      {fn.problem ??
                        (fn.runtime !== undefined
                          ? `runs on ${lastSegment(fn.runtime)}`
                          : `${fn.columns.length} columns`)}
                    </span>
                  </CubePickerListItem>
                ))}
              </ul>
            ) : (
              <div className="text-base text-[var(--color-text-secondary)]">
                {allFunctions.length
                  ? CUBE_FUNCTION_MESSAGE.NO_MATCH
                  : CUBE_FUNCTION_MESSAGE.NONE}
              </div>
            )}
          </div>
        )}
        {picked && (
          <section
            aria-label="Function details"
            className="flex flex-col gap-2"
          >
            <span className="break-all text-sm text-[var(--color-text-muted)]">
              {picked.path}
            </span>
            {picked.runtime !== undefined ? (
              <div className="flex items-center gap-2 text-base">
                <span className="w-20 shrink-0">Runtime</span>
                <span aria-label="Runtime" className="break-all">
                  {CUBE_FUNCTION_MESSAGE.RUNS_ON(picked.runtime)}
                </span>
              </div>
            ) : (
              <CubePickerStep
                label="Runtime"
                value={tab.functionRuntimePath}
                options={tab.functionRuntimes.map((runtime) => ({
                  value: runtime.path,
                  label: runtime.path,
                }))}
                disabled={tab.fixedContext?.runtime !== undefined}
                onChange={(path) => tab.selectFunctionRuntime(path)}
              />
            )}
            {tab.functionParameters.map((parameter, index) => (
              <CubeFunctionParameterInput
                key={parameter.name}
                tab={tab}
                index={index}
              />
            ))}
            {picked.columns.length > 0 && (
              <span className="text-sm text-[var(--color-text-muted)]">
                {`Columns: ${picked.columns
                  .map(
                    (column) => `${column.name} (${lastSegment(column.type)})`,
                  )
                  .join(', ')}`}
              </span>
            )}
            {tab.functionProblem !== undefined && (
              <span
                className="text-base text-[var(--color-status-error)]"
                role="alert"
              >
                {tab.functionProblem}
              </span>
            )}
          </section>
        )}
      </>
    );
  },
);
