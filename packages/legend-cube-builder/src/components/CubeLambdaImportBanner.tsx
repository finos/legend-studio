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
  CUBE_LAMBDA_IMPORT_MESSAGE,
  CubeLambdaFidelity,
  type CubeLambdaImportState,
} from '../stores/CubeLambdaImportState.js';
import { CubeButton } from './CubeButton.js';

/**
 * The lambda the page opened on (PLAN §11.18), in the graph region: while it
 * is read, why it couldn't be, or that Cube writes it another way
 */
export const CubeLambdaImportBanner = observer(
  (props: { lambdaImport: CubeLambdaImportState }) => {
    const { lambdaImport } = props;
    const { label = 'the query', error, fidelity, notes } = lambdaImport;
    if (lambdaImport.isReading) {
      return (
        <div
          className="shrink-0 border-b border-[var(--color-border-default)] px-2 py-1 text-base text-[var(--color-text-secondary)]"
          role="status"
        >
          {CUBE_LAMBDA_IMPORT_MESSAGE.READING(label)}
        </div>
      );
    }
    if (error !== undefined) {
      return (
        <div
          className="flex shrink-0 items-start gap-2 border-b border-[var(--color-border-default)] bg-[var(--color-status-error-bg)] px-2 py-1 text-base text-[var(--color-status-error)]"
          role="alert"
          data-testid={LEGEND_CUBE_TEST_ID.LAMBDA_IMPORT}
        >
          <span className="min-w-0 flex-1 break-words">
            <span className="font-medium">
              {CUBE_LAMBDA_IMPORT_MESSAGE.CANT_READ(label)}:
            </span>{' '}
            {error.message}
            {error.detail !== undefined && (
              <details>
                <summary className="cursor-pointer">Details</summary>
                <pre className="whitespace-pre-wrap text-sm">
                  {error.detail}
                </pre>
              </details>
            )}
          </span>
          <CubeButton onClick={() => lambdaImport.dismiss()}>
            Dismiss
          </CubeButton>
        </div>
      );
    }
    const warnings = [
      ...(fidelity === CubeLambdaFidelity.REWRITTEN
        ? [CUBE_LAMBDA_IMPORT_MESSAGE.REWRITTEN(label)]
        : fidelity === CubeLambdaFidelity.UNCHECKED
          ? [CUBE_LAMBDA_IMPORT_MESSAGE.UNCHECKED(label)]
          : []),
      ...notes,
    ];
    if (!warnings.length) {
      return null;
    }
    return (
      <div
        className="flex shrink-0 items-start gap-2 border-b border-[var(--color-border-default)] bg-[var(--color-status-warn-bg)] px-2 py-1 text-base text-[var(--color-text-primary)]"
        role="status"
        data-testid={LEGEND_CUBE_TEST_ID.LAMBDA_IMPORT}
      >
        <span className="min-w-0 flex-1 break-words">
          {warnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </span>
        <CubeButton onClick={() => lambdaImport.dismiss()}>Dismiss</CubeButton>
      </div>
    );
  },
);
