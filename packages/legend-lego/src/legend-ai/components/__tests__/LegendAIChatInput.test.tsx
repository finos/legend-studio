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
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { unitTest } from '@finos/legend-shared/test';
import { LegendAIChatInput } from '../LegendAIChatInput.js';
import type {
  LegendAIChatState,
  LegendAIScopeItem,
} from '../../LegendAITypes.js';

afterEach(cleanup);

const createMockState = (
  overrides?: Partial<LegendAIChatState>,
): LegendAIChatState => ({
  questionText: '',
  setQuestionText: jest.fn(),
  isSending: false,
  messages: [],
  selectedModelName: undefined,
  availableModelNames: [],
  setSelectedModelName: jest.fn(),
  askQuestion: jest.fn(),
  askQuestionWithIntent: jest.fn(),
  runFallbackAction: jest.fn(),
  clearChat: jest.fn(),
  expandedThinking: new Set(),
  toggleThinking: jest.fn(),
  conversationRef: { current: null },
  selectedScopes: [],
  toggleScope: jest.fn(),
  removeScope: jest.fn(),
  stopGeneration: jest.fn(),
  ...overrides,
});

const TEST_SCOPES: LegendAIScopeItem[] = [
  { id: 'scope-a', label: 'Scope A' },
  { id: 'scope-b', label: 'Scope B' },
];

describe(unitTest('LegendAIChatInput'), () => {
  test('renders textarea with placeholder', () => {
    const state = createMockState();
    render(<LegendAIChatInput state={state} scopes={[]} />);
    const textarea = screen.getByPlaceholderText(
      'Ask anything about your data...',
    );
    expect(textarea).toBeDefined();
  });

  test('renders send button', () => {
    const state = createMockState();
    render(<LegendAIChatInput state={state} scopes={[]} />);
    expect(screen.getByTitle('Send')).toBeDefined();
  });

  test('send button is disabled when questionText is empty', () => {
    const state = createMockState();
    render(<LegendAIChatInput state={state} scopes={[]} />);
    const sendBtn = screen.getByTitle('Send');
    expect(sendBtn.hasAttribute('disabled')).toBe(true);
  });

  test('send button is disabled when isSending', () => {
    const state = createMockState({
      isSending: true,
      questionText: 'hello',
    });
    render(<LegendAIChatInput state={state} scopes={[]} />);
    const sendBtn = screen.getByTitle('Send');
    expect(sendBtn.hasAttribute('disabled')).toBe(true);
  });

  test('clicking send calls askQuestion', () => {
    const askQuestion = jest.fn();
    const state = createMockState({
      questionText: 'show trades',
      askQuestion,
    });
    render(<LegendAIChatInput state={state} scopes={[]} />);
    fireEvent.click(screen.getByTitle('Send'));
    expect(askQuestion).toHaveBeenCalled();
  });

  test('Enter key calls askQuestion', () => {
    const askQuestion = jest.fn();
    const state = createMockState({
      questionText: 'show trades',
      askQuestion,
    });
    render(<LegendAIChatInput state={state} scopes={[]} />);
    const textarea = screen.getByPlaceholderText(
      'Ask anything about your data...',
    );
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(askQuestion).toHaveBeenCalled();
  });

  test('Shift+Enter does not call askQuestion', () => {
    const askQuestion = jest.fn();
    const state = createMockState({
      questionText: 'show trades',
      askQuestion,
    });
    render(<LegendAIChatInput state={state} scopes={[]} />);
    const textarea = screen.getByPlaceholderText(
      'Ask anything about your data...',
    );
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(askQuestion).not.toHaveBeenCalled();
  });

  test('textarea onChange calls setQuestionText', () => {
    const setQuestionText = jest.fn();
    const state = createMockState({ setQuestionText });
    render(<LegendAIChatInput state={state} scopes={[]} />);
    const textarea = screen.getByPlaceholderText(
      'Ask anything about your data...',
    );
    fireEvent.change(textarea, { target: { value: 'new text' } });
    expect(setQuestionText).toHaveBeenCalledWith('new text');
  });

  test('stop button appears when isSending', () => {
    const stopGeneration = jest.fn();
    const state = createMockState({ isSending: true, stopGeneration });
    render(<LegendAIChatInput state={state} scopes={[]} />);
    const stopBtn = screen.getByTitle('Stop generation');
    expect(stopBtn).toBeDefined();
    fireEvent.click(stopBtn);
    expect(stopGeneration).toHaveBeenCalled();
  });

  test('model selector shown when availableModelNames is non-empty', () => {
    const state = createMockState({
      availableModelNames: ['gpt-4', 'gpt-3.5'],
    });
    render(<LegendAIChatInput state={state} scopes={[]} />);
    expect(screen.getByTitle('Select model')).toBeDefined();
  });

  test('model selector not shown when no model names', () => {
    const state = createMockState({ availableModelNames: [] });
    render(<LegendAIChatInput state={state} scopes={[]} />);
    expect(screen.queryByTitle('Select model')).toBeNull();
  });

  test('clicking model button opens dropdown and selects model', () => {
    const setSelectedModelName = jest.fn();
    const state = createMockState({
      availableModelNames: ['model-a', 'model-b'],
      setSelectedModelName,
    });
    render(<LegendAIChatInput state={state} scopes={[]} />);
    fireEvent.click(screen.getByTitle('Select model'));
    const modelBtn = screen.getByText('model-b');
    fireEvent.click(modelBtn);
    expect(setSelectedModelName).toHaveBeenCalledWith('model-b');
  });

  test('scope pills rendered when selected scopes exist', () => {
    const state = createMockState({
      selectedScopes: [{ id: 'scope-a', label: 'Scope A' }],
    });
    render(<LegendAIChatInput state={state} scopes={TEST_SCOPES} />);
    expect(screen.getByText('Scope A')).toBeDefined();
  });

  test('model label truncates long names', () => {
    const state = createMockState({
      selectedModelName: 'a-very-long-model-name-here',
      availableModelNames: ['a-very-long-model-name-here'],
    });
    render(<LegendAIChatInput state={state} scopes={[]} />);
    expect(screen.getByText('a-very-long-model...')).toBeDefined();
  });
});
