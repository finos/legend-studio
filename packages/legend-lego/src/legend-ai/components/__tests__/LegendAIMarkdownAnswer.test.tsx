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

import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { act, cleanup, render } from '@testing-library/react';
import { unitTest } from '@finos/legend-shared/test';
import { MARKDOWN_DEFAULT_COMPONENTS } from '@finos/legend-art';
import {
  ANSWER_COMPONENTS,
  LegendAIAnswerCodeBlock,
} from '../LegendAIMessageViews.js';
import {
  extractLegendAIHtmlBlock,
  parseLegendAIEnvelope,
} from '../LegendAIAnswerBlocks.js';

const TABLE = JSON.stringify({
  dataType: 'html',
  title: 'Trades',
  htmlContent: '<table><tr><td>1</td></tr></table>',
});

// react-markdown is mocked in tests: a fenced block reaches `pre` as its code element.
const block = (lang: string, body: string): React.ReactNode => (
  <LegendAIAnswerCodeBlock>
    <code className={`language-${lang}`}>{`${body}\n`}</code>
  </LegendAIAnswerCodeBlock>
);

describe(unitTest('LegendAIAnswerCodeBlock'), () => {
  test('shows an HTML envelope rendered, not as its JSON', async () => {
    // Inside act until the frame has loaded and measured itself.
    const { container } = await act(async () => {
      const rendered = render(block('json', TABLE));
      await new Promise((resolve) => setTimeout(resolve, 0));
      return rendered;
    });

    expect(container.querySelector('iframe')?.getAttribute('srcdoc')).toContain(
      '<td>1</td>',
    );
    expect(container.textContent).not.toContain('"dataType"');
  });

  test('leaves other code blocks as code', () => {
    const { container } = render(block('python', 'print(1)'));

    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('pre')?.textContent).toContain('print(1)');
  });
});

const renderedTable = async (): Promise<HTMLElement> => {
  // Inside act until the frame has loaded and measured itself.
  const { container } = await act(async () => {
    const rendered = render(block('json', TABLE));
    await new Promise((resolve) => setTimeout(resolve, 0));
    return rendered;
  });
  return container;
};

const srcdoc = (container: HTMLElement): string =>
  container.querySelector('iframe')?.getAttribute('srcdoc') ?? '';

// jsdom does not inherit custom properties: the theme's variables are given by
// element instead, as the app's theme class on <body> gives them to what is inside it.
const themeVariables = (
  forHtml: Record<string, string>,
  forTheLegendAIChat: Record<string, string>,
): jest.SpiedFunction<typeof window.getComputedStyle> =>
  jest.spyOn(window, 'getComputedStyle').mockImplementation(
    (element) =>
      ({
        getPropertyValue: (name: string) =>
          (element === document.documentElement ? forHtml : forTheLegendAIChat)[
            name
          ] ?? '',
      }) as unknown as CSSStyleDeclaration,
  );

describe(unitTest('LegendAIAnswerCodeBlock theme'), () => {
  afterEach(() => {
    // unmounted first: the theme class changing is what a mounted table watches for
    cleanup();
    jest.restoreAllMocks();
    document.body.className = '';
  });

  test("a table takes the chat's colours, not the page root's", async () => {
    // <html> only holds the light values: reading it made a table dark on dark
    themeVariables(
      { '--qai-text-primary': '#1c2b36' },
      { '--qai-text-primary': '#ffffff' },
    );

    const container = await renderedTable();

    expect(srcdoc(container)).toContain('color: #ffffff');
    expect(srcdoc(container)).not.toContain('#1c2b36');
  });

  test('switching theme restyles the table that is already shown', async () => {
    const spy = themeVariables({}, { '--qai-text-primary': '#1c2b36' });
    const container = await renderedTable();
    expect(srcdoc(container)).toContain('color: #1c2b36');

    spy.mockRestore();
    themeVariables({}, { '--qai-text-primary': '#ffffff' });
    await act(async () => {
      document.body.className = 'theme__hc-dark';
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(srcdoc(container)).toContain('color: #ffffff');
  });
});

describe(unitTest('LegendAIMarkdownAnswer components'), () => {
  test("keep the markdown viewer's own, so a mermaid block still becomes a diagram", () => {
    // passing `components` to the viewer replaces its defaults: ours add to them
    expect(ANSWER_COMPONENTS.code).toBe(MARKDOWN_DEFAULT_COMPONENTS.code);
    expect(ANSWER_COMPONENTS.pre).toBe(LegendAIAnswerCodeBlock);

    const Code = ANSWER_COMPONENTS.code as React.FC<{
      className: string;
      node: unknown;
      children: React.ReactNode;
    }>;
    const { container } = render(
      <Code className="language-mermaid" node={undefined}>
        graph TD
      </Code>,
    );

    expect(container.querySelector('code')?.className).toBe('mermaid');
  });
});

describe(unitTest('parseLegendAIEnvelope'), () => {
  test('reads an envelope with prose after it, and only untagged or json blocks', () => {
    expect(
      extractLegendAIHtmlBlock(
        parseLegendAIEnvelope('', `${TABLE}\nmore text`),
      ),
    ).toEqual({
      title: 'Trades',
      htmlContent: '<table><tr><td>1</td></tr></table>',
    });
    expect(parseLegendAIEnvelope('python', TABLE)).toBeUndefined();
    expect(
      parseLegendAIEnvelope('json', '{"dataType": "html"'),
    ).toBeUndefined();
  });
});
