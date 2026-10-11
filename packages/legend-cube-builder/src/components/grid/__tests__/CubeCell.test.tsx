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

import { describe, expect, test } from '@jest/globals';
import {
  type ColumnFormat,
  ColumnFormatStyle,
  TypeFamily,
} from '@finos/legend-cube';
import { render } from '@testing-library/react';
import { CubeCell } from '../CubeResultGrid.js';

const RED = 'text-[var(--color-status-error)]';

const cellOf = (value: string, format?: ColumnFormat): HTMLElement =>
  render(
    <CubeCell
      {...({
        value,
        family: TypeFamily.DECIMAL,
        format,
      } as unknown as Parameters<typeof CubeCell>[0])}
    />,
  ).container;

const format = (init: Partial<ColumnFormat>): ColumnFormat => ({
  style: ColumnFormatStyle.NUMBER,
  grouping: true,
  redIfNegative: false,
  parenthesesIfNegative: false,
  ...init,
});

describe('Cube cell formats', () => {
  test('Shows a negative in red only when its format asks for red, parentheses or not (spec §21)', () => {
    const red = cellOf('-1234.5', format({ redIfNegative: true }));
    expect(red.textContent).toBe('-1,234.5');
    expect(red.querySelector('span')?.className).toContain(RED);
    // parentheses alone don't make it red, the spec's bug
    const parentheses = cellOf(
      '-1234.5',
      format({ parenthesesIfNegative: true }),
    );
    expect(parentheses.textContent).toBe('(1,234.5)');
    expect(parentheses.querySelector('span')?.className).not.toContain(RED);
    // a positive value never is
    expect(
      cellOf('1234.5', format({ redIfNegative: true })).querySelector('span')
        ?.className,
    ).not.toContain(RED);
  });

  test('Shows the exact value on hover, and falls back to the default without a usable format', () => {
    expect(
      cellOf('1234.5678', format({ decimalPlaces: 1 })).querySelector('span')
        ?.title,
    ).toBe('1234.5678');
    expect(
      cellOf('1234.5', format({ style: 'currency', currency: 'XYZ' }))
        .textContent,
    ).toBe('1,234.5');
  });
});
