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

import { describe, expect, jest, test } from '@jest/globals';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { editor as monacoEditorAPI } from 'monaco-editor';
import type * as LegendApplication from '@finos/legend-application';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { unitTest } from '@finos/legend-shared/test';
import { CodeEditor } from '../CodeEditor.js';
import {
  MockedMonacoEditorInstance,
  MockedMonacoEditorModel,
} from '../__test-utils__/MonacoEditorMockUtils.js';

jest.mock('@finos/legend-application', () => ({
  ...jest.requireActual<typeof LegendApplication>('@finos/legend-application'),
  useApplicationStore: () => ({
    layoutService: {
      TEMPORARY__isLightColorThemeEnabled: false,
    },
  }),
}));

type ContentSizeListener = (event: {
  contentHeight: number;
  contentHeightChanged: boolean;
}) => void;

/**
 * An editor whose content is as tall as its lines, 20px each, as Monaco
 * measures it once laid out: setting its text resizes its content at once, as
 * Monaco does, so while the code editor renders
 */
const mockEditor = (): {
  isCreated: () => boolean;
  /** whether the size of its content has been listened to */
  isContentSizeListenedTo: () => boolean;
  /** the content resized, e.g. a long line wrapped in a narrower editor */
  resizeContent: (height: number) => Promise<void>;
  /** whether the editor is setting its text, so the code editor rendering */
  isSettingValue: () => boolean;
} => {
  let text = '';
  let contentHeight = 0;
  let isSettingValue = false;
  const listeners = new Set<ContentSizeListener>();
  const setContentHeight = (height: number): void => {
    const contentHeightChanged = height !== contentHeight;
    contentHeight = height;
    listeners.forEach((listener) =>
      listener({ contentHeight: height, contentHeightChanged }),
    );
  };
  const onDidContentSizeChange = jest.fn((listener: ContentSizeListener) => {
    listeners.add(listener);
    return { dispose: () => listeners.delete(listener) };
  });
  const model = { ...MockedMonacoEditorModel, getValue: () => text };
  const create = jest.spyOn(monacoEditorAPI, 'create');
  create.mockClear();
  create.mockReturnValue({
    ...MockedMonacoEditorInstance,
    getModel: () => model,
    getValue: () => text,
    setValue: (value: string) => {
      text = value;
      isSettingValue = true;
      try {
        setContentHeight(value.split('\n').length * 20);
      } finally {
        isSettingValue = false;
      }
    },
    getContentHeight: () => contentHeight,
    onDidContentSizeChange,
  } as unknown as monacoEditorAPI.IStandaloneCodeEditor);
  return {
    isCreated: () => create.mock.calls.length > 0,
    isContentSizeListenedTo: () => onDidContentSizeChange.mock.calls.length > 0,
    resizeContent: async (height: number): Promise<void> => {
      await act(async () => setContentHeight(height));
    },
    isSettingValue: () => isSettingValue,
  };
};

describe(unitTest('Code editor content height'), () => {
  test('Reports the height of its content once laid out, then each change of it', async () => {
    const { resizeContent } = mockEditor();
    const onContentHeightChange = jest.fn<(height: number) => void>();
    render(
      <CodeEditor
        inputValue={'a\nb'}
        language={CODE_EDITOR_LANGUAGE.PURE}
        onContentHeightChange={onContentHeightChange}
      />,
    );

    await waitFor(() =>
      expect(onContentHeightChange).toHaveBeenLastCalledWith(40),
    );
    await resizeContent(60);
    expect(onContentHeightChange).toHaveBeenLastCalledWith(60);
    // a content resized in width only
    await resizeContent(60);
    expect(onContentHeightChange).toHaveBeenCalledTimes(2);
  });

  test('Reports a height its content takes as it renders after the render, so a container can be sized to it', async () => {
    const { isSettingValue } = mockEditor();
    const heightsReportedWhileRendering: number[] = [];
    const SizedCodeEditor: React.FC<{ value: string }> = (props) => {
      const [height, setHeight] = useState<number | undefined>();
      return (
        <div data-testid="container" style={{ height }}>
          <CodeEditor
            inputValue={props.value}
            language={CODE_EDITOR_LANGUAGE.PURE}
            onContentHeightChange={(contentHeight) => {
              if (isSettingValue()) {
                heightsReportedWhileRendering.push(contentHeight);
              }
              setHeight(contentHeight);
            }}
          />
        </div>
      );
    };
    const { rerender } = render(<SizedCodeEditor value="a" />);
    const container = screen.getByTestId('container');
    await waitFor(() => expect(container.style.height).toBe('20px'));

    rerender(<SizedCodeEditor value={'a\nb\nc'} />);
    await waitFor(() => expect(container.style.height).toBe('60px'));
    // NOTE: the new text resized the content while the code editor rendered,
    // when the container can't update its state: React says so, once only
    // (so a check of the console would miss it when the test is retried)
    expect(heightsReportedWhileRendering).toEqual([]);
  });

  test('Listens to the size of its content only when its height is asked for', async () => {
    const { isCreated, isContentSizeListenedTo } = mockEditor();
    render(<CodeEditor inputValue="a" language={CODE_EDITOR_LANGUAGE.PURE} />);

    await waitFor(() => expect(isCreated()).toBe(true));
    expect(isContentSizeListenedTo()).toBe(false);
  });
});
