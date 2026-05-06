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

import { describe, test, expect, afterEach, jest } from '@jest/globals';
import { render, screen, cleanup } from '@testing-library/react';
import { unitTest } from '@finos/legend-shared/test';
import { LegendAIErrorBoundary } from '../LegendAIErrorBoundary.js';

afterEach(cleanup);

function ThrowingChild(): React.ReactNode {
  throw new Error('child threw');
}

describe(unitTest('LegendAIErrorBoundary'), () => {
  test('renders children when no error occurs', () => {
    render(
      <LegendAIErrorBoundary>
        <div>Hello World</div>
      </LegendAIErrorBoundary>,
    );
    expect(screen.getByText('Hello World')).toBeDefined();
  });

  test('renders null when child throws', () => {
    // Suppress console.error for the expected error
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <LegendAIErrorBoundary>
        <ThrowingChild />
      </LegendAIErrorBoundary>,
    );
    expect(container.innerHTML).toBe('');
    spy.mockRestore();
  });

  test('still renders non-throwing siblings after error boundary', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <div>
        <LegendAIErrorBoundary>
          <ThrowingChild />
        </LegendAIErrorBoundary>
        <span>Outside boundary</span>
      </div>,
    );
    expect(container.querySelector('span')?.textContent).toBe(
      'Outside boundary',
    );
    spy.mockRestore();
  });
});
