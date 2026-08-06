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
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { render, screen, cleanup, act } from '@testing-library/react';
import { unitTest } from '@finos/legend-shared/test';
import { LegendAIChatToggle } from '../LegendAIChatToggle.js';

jest.mock('@finos/legend-art', () => ({
  SparkleStarsIcon: () => <span data-testid="sparkle-icon" />,
  clsx: (...args: unknown[]) => {
    const classes: string[] = [];
    for (const arg of args) {
      if (typeof arg === 'string') {
        classes.push(arg);
      } else if (typeof arg === 'object' && arg !== null) {
        for (const [key, value] of Object.entries(arg)) {
          if (value) {
            classes.push(key);
          }
        }
      }
    }
    return classes.join(' ');
  },
}));

// jsdom does not propagate pointer coordinates through fireEvent's PointerEvent
// init, so drive the button with plain MouseEvents that do carry clientX/clientY.
const firePointer = (
  element: HTMLElement,
  type: string,
  x: number,
  y: number,
): void => {
  act(() => {
    element.dispatchEvent(
      new MouseEvent(type, {
        clientX: x,
        clientY: y,
        bubbles: true,
        detail: type === 'click' ? 1 : 0,
      }),
    );
  });
};

beforeEach(() => {
  HTMLElement.prototype.setPointerCapture = jest.fn();
  HTMLElement.prototype.releasePointerCapture = jest.fn();
  HTMLElement.prototype.hasPointerCapture = jest.fn(() => false);
});

afterEach(() => cleanup());

describe(unitTest('LegendAIChatToggle'), () => {
  test('renders the label and opens the chat on a plain click', () => {
    const onOpen = jest.fn();
    render(<LegendAIChatToggle label="Ask AI" onOpen={onOpen} />);
    const button = screen.getByRole('button', { name: 'Ask AI' });
    expect(
      button.querySelector('.legend-ai-chat-toggle__label')?.textContent,
    ).toBe('Ask AI');
    expect(button.querySelector('.legend-ai-chat-toggle__icon')).not.toBeNull();
    firePointer(button, 'click', 0, 0);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  test('dragging docks the launcher and suppresses the open click', () => {
    const onOpen = jest.fn();
    render(<LegendAIChatToggle label="Ask AI" onOpen={onOpen} />);
    const button = screen.getByRole('button', { name: 'Ask AI' });
    firePointer(button, 'pointerdown', 100, 100);
    firePointer(button, 'pointermove', 260, 240);
    expect(button.className).toContain('legend-ai-chat-toggle--dragging');
    firePointer(button, 'pointerup', 260, 240);
    expect(button.className).not.toContain('legend-ai-chat-toggle--dragging');
    firePointer(button, 'click', 260, 240);
    expect(onOpen).not.toHaveBeenCalled();
    expect(button.style.left).toMatch(/px$/);
    expect(button.style.top).toMatch(/px$/);
    expect(button.style.right).not.toMatch(/px$/);
    expect(button.style.bottom).not.toMatch(/px$/);
  });

  test('a pointer press below the drag threshold still opens the chat', () => {
    const onOpen = jest.fn();
    render(<LegendAIChatToggle label="Ask AI" onOpen={onOpen} />);
    const button = screen.getByRole('button', { name: 'Ask AI' });
    firePointer(button, 'pointerdown', 100, 100);
    firePointer(button, 'pointermove', 101, 101);
    firePointer(button, 'pointerup', 101, 101);
    expect(button.className).not.toContain('legend-ai-chat-toggle--dragging');
    firePointer(button, 'click', 101, 101);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  test('a cancelled drag clears state so the next click still opens the chat', () => {
    const onOpen = jest.fn();
    render(<LegendAIChatToggle label="Ask AI" onOpen={onOpen} />);
    const button = screen.getByRole('button', { name: 'Ask AI' });
    firePointer(button, 'pointerdown', 100, 100);
    firePointer(button, 'pointermove', 260, 240);
    expect(button.className).toContain('legend-ai-chat-toggle--dragging');
    firePointer(button, 'pointercancel', 260, 240);
    expect(button.className).not.toContain('legend-ai-chat-toggle--dragging');
    firePointer(button, 'click', 260, 240);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
