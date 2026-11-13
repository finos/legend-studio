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
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  LoadingIcon,
  MARKDOWN_DEFAULT_COMPONENTS,
  MarkdownTextViewer,
  SparkleStarsIcon,
} from '@finos/legend-art';
import { isString } from '@finos/legend-shared';
import { HtmlBlockRenderer } from '../../html-renderer/HtmlBlockRenderer.js';
import {
  extractLegendAIHtmlBlock,
  parseLegendAIEnvelope,
} from './LegendAIAnswerBlocks.js';

// The chat's message building blocks, shared so every Legend AI chat looks the same.

export const LegendAIUserMessageView = (props: {
  text: string;
}): React.ReactNode => (
  <div className="legend-ai__msg legend-ai__msg--user">
    <div className="legend-ai__msg-bubble">{props.text}</div>
  </div>
);

export const LegendAIAssistantMessageFrame = (props: {
  children: React.ReactNode;
}): React.ReactNode => (
  <div className="legend-ai__msg legend-ai__msg--assistant">
    <div className="legend-ai__msg-avatar">
      <SparkleStarsIcon />
    </div>
    <div className="legend-ai__msg-content">{props.children}</div>
  </div>
);

/** The language and text of the code element react-markdown gives a \`pre\`. */
const fencedCode = (
  children: ReactNode,
): { lang: string | undefined; body: string } | undefined => {
  if (!isValidElement(children)) {
    return undefined;
  }
  const code = children.props as { className?: string; children?: ReactNode };
  const body = Array.isArray(code.children)
    ? code.children.filter(isString).join('')
    : isString(code.children)
      ? code.children
      : '';
  return {
    lang: /language-(?<lang>[\w-]+)/.exec(code.className ?? '')?.groups?.lang,
    body: body.replace(/\n$/, ''),
  };
};

// The iframe is its own document: it cannot see the chat's theme variables,
// so their values are read here and written into its stylesheet.
/**
 * The table's stylesheet in the chat's colours, read from *element*: the theme's
 * variables (`--qai-*`) are set by the theme class the app puts on `<body>`, so
 * `<html>` only ever holds the light ones -- a table there came out dark on dark.
 */
const htmlBlockStyles = (element: Element): string => {
  const style = getComputedStyle(element);
  const color = (name: string, fallback: string): string =>
    style.getPropertyValue(name).trim() || fallback;
  const text = color('--qai-text-primary', '#1c2b36');
  const border = color('--qai-border-light', '#e1e7ea');
  const header = color('--qai-panel-header-bg', '#f2f5f7');
  const stripe = color('--qai-bg-secondary', '#f2f5f7');
  return `
    body { margin: 0; padding: 0.4rem 0; font-family: 'Roboto', sans-serif;
      font-size: 1.3rem; color: ${text}; background: transparent; }
    table { border-collapse: collapse; width: max-content; max-width: 100%; }
    th, td { border: 1px solid ${border}; padding: 0.4rem 0.8rem; text-align: left;
      white-space: nowrap; color: ${text}; }
    thead th { background: ${header}; font-weight: 600; }
    tbody tr:nth-child(even) td { background: ${stripe}; }
  `;
};

/**
 * A fenced block of an answer: Legend AI's HTML envelopes (its tables)
 * rendered in a sandboxed frame rather than shown as their JSON; any other
 * block as code.
 */
export const LegendAIAnswerCodeBlock = (props: {
  children?: ReactNode;
}): React.ReactNode => {
  const code = fencedCode(props.children);
  const html =
    code &&
    extractLegendAIHtmlBlock(parseLegendAIEnvelope(code.lang, code.body));
  const wrapper = useRef<HTMLDivElement>(null);
  const [styles, setStyles] = useState<string>();
  const hasHtml = Boolean(html);
  // Before the first paint, so the table never shows in the wrong colours.
  useLayoutEffect(() => {
    if (wrapper.current) {
      setStyles(htmlBlockStyles(wrapper.current));
    }
  }, [hasHtml]);
  // The user switching theme changes the class on <body> and nothing else here.
  useEffect(() => {
    if (!hasHtml) {
      return undefined;
    }
    const observer = new MutationObserver(() => {
      if (wrapper.current) {
        setStyles(htmlBlockStyles(wrapper.current));
      }
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, [hasHtml]);
  return html ? (
    <div ref={wrapper}>
      {styles !== undefined && (
        <HtmlBlockRenderer
          htmlContent={html.htmlContent}
          title={html.title}
          iframeStyles={styles}
        />
      )}
    </div>
  ) : (
    <pre>{props.children}</pre>
  );
};

// The viewer's own components stay (its `code`, which renders a mermaid diagram):
// passing `components` replaces them.
export const ANSWER_COMPONENTS: typeof MARKDOWN_DEFAULT_COMPONENTS = {
  ...MARKDOWN_DEFAULT_COMPONENTS,
  pre: LegendAIAnswerCodeBlock,
};

export const LegendAIMarkdownAnswer = (props: {
  value: string;
}): React.ReactNode => (
  <MarkdownTextViewer
    value={{ value: props.value }}
    className="legend-ai__text-answer-md"
    components={ANSWER_COMPONENTS}
  />
);

export const LegendAIWorkingIndicator = (props: {
  label: string;
}): React.ReactNode => (
  <div className="legend-ai__executing" role="status">
    <LoadingIcon isLoading={true} />
    <span>{props.label}</span>
  </div>
);

export const LegendAIErrorText = (props: {
  children: React.ReactNode;
}): React.ReactNode => (
  <div className="legend-ai__exec-error">{props.children}</div>
);

export const LegendAIEmptyState = (props: {
  title: string;
  children?: React.ReactNode;
}): React.ReactNode => (
  <div className="legend-ai__empty-state">
    <div className="legend-ai__empty-icon">
      <SparkleStarsIcon />
    </div>
    <div className="legend-ai__empty-text">{props.title}</div>
    {props.children}
  </div>
);
