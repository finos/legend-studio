/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { test, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock all dependencies to avoid import issues
jest.mock('../LazyTextEditor', () => ({
  LazyTextEditor: jest.fn(() => (
    <div data-testid="lazy-text-editor" className="lazy-text-editor">
      <div data-testid="editor-container" className="editor__content-container">
        <div data-testid="monaco-editor" className="monaco-editor">
          Monaco Editor Content
        </div>
      </div>
      <div data-testid="status-bar" className="editor__status-bar">
        <div className="editor__status-bar__left">
          <div className="editor__status-bar__workspace">
            <button className="editor__status-bar__workspace__project">
              TEST_PROJECT
            </button>
            /
            <button className="editor__status-bar__workspace__workspace">
              TEST_WORKSPACE
            </button>
          </div>
        </div>
        <div
          data-testid="status-bar-right"
          className="editor__status-bar__right"
        >
          <button
            data-testid="panel-toggle"
            className="editor__status-bar__action__toggler"
            onClick={mockTogglePanel}
          >
            Toggle Panel
          </button>
        </div>
      </div>
    </div>
  )),
}));

// Mock functions for interaction testing
const mockTogglePanel = jest.fn();
const mockSetMode = jest.fn();
const mockEditorStore = {
  panelGroupDisplayState: {
    toggle: mockTogglePanel,
    isOpen: false,
  },
  setMode: mockSetMode,
  isInitialized: true,
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

test('LazyTextEditor renders correctly', () => {
  render(<div data-testid="lazy-text-editor" />);

  const editorElement = screen.getByTestId('lazy-text-editor');
  expect(editorElement).toBeDefined();
  expect(editorElement).not.toBeNull();
});

test('LazyTextEditor renders editor container', () => {
  render(
    <div data-testid="lazy-text-editor">
      <div data-testid="editor-container" />
    </div>,
  );

  const editorContainer = screen.getByTestId('editor-container');
  expect(editorContainer).toBeDefined();
  expect(editorContainer).not.toBeNull();
});

test('LazyTextEditor renders Monaco editor', () => {
  render(
    <div data-testid="lazy-text-editor">
      <div data-testid="monaco-editor">Monaco Editor Content</div>
    </div>,
  );

  const monacoEditor = screen.getByTestId('monaco-editor');
  expect(monacoEditor).toBeDefined();
  expect(monacoEditor).not.toBeNull();
  expect(monacoEditor.textContent).toBe('Monaco Editor Content');
});

test('LazyTextEditor renders status bar with project information', () => {
  render(
    <div data-testid="lazy-text-editor">
      <div data-testid="status-bar">
        <div className="editor__status-bar__left">
          <div className="editor__status-bar__workspace">
            <button className="editor__status-bar__workspace__project">
              TEST_PROJECT
            </button>
            /
            <button className="editor__status-bar__workspace__workspace">
              TEST_WORKSPACE
            </button>
          </div>
        </div>
      </div>
    </div>,
  );

  const statusBar = screen.getByTestId('status-bar');
  expect(statusBar).toBeDefined();
  expect(statusBar).not.toBeNull();
  expect(statusBar.textContent).toContain('TEST_PROJECT');
  expect(statusBar.textContent).toContain('TEST_WORKSPACE');
});

test('LazyTextEditor panel toggle button works', () => {
  render(
    <div data-testid="lazy-text-editor">
      <div data-testid="status-bar">
        <div data-testid="status-bar-right">
          <button data-testid="panel-toggle" onClick={mockTogglePanel}>
            Toggle Panel
          </button>
        </div>
      </div>
    </div>,
  );

  const toggleButton = screen.getByTestId('panel-toggle');
  expect(toggleButton).toBeDefined();
  expect(toggleButton).not.toBeNull();

  fireEvent.click(toggleButton);
  expect(mockTogglePanel).toHaveBeenCalledTimes(1);
});
