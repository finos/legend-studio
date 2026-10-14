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

import ReactMarkdown from 'react-markdown';
import remarkGFM from 'remark-gfm';
import type { MarkdownText } from '@finos/legend-shared';
import { clsx } from 'clsx';
import { useEffect } from 'react';
import mermaid from 'mermaid';
import type { PluggableList } from 'unified';

export const MarkdownTextViewer: React.FC<{
  value: MarkdownText;
  className?: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components?: Record<string, any> | undefined;
  /**
   * Opt-in rehype plugins (e.g. `rehype-raw`, `rehype-sanitize`). Omit to
   * keep the viewer's default behavior unchanged (no raw HTML, no sanitizer).
   *
   * SECURITY: whenever `rehype-raw` is included, callers MUST also include
   * `rehype-sanitize` with an allowlist schema appropriate for their content
   * source. `rehype-raw` without `rehype-sanitize` exposes the viewer to XSS
   * via `<script>` / `<iframe>` / `on*` attributes / `javascript:` URLs.
   */
  rehypePlugins?: PluggableList | undefined;
}> = (props) => {
  useEffect(() => {
    // this will render the mermaid diagram
    mermaid.initialize({ startOnLoad: true, theme: 'dark' });
    mermaid.contentLoaded();
  }, [props.value]);

  return (
    <div className={clsx('markdown-content', props.className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGFM]}
        rehypePlugins={props.rehypePlugins}
        components={
          props.components ?? {
            // customize the rendering of the <code> block, if the language is mermaid
            // the class name must include `mermaid` and it will get picked up by the mermaid renderer
            code: (_props: {
              children: React.ReactNode;
              className?: string | undefined;
              node: unknown;
            }) => {
              const { children, className, node, ...rest } = _props;
              const match = /language-(?<language>\w+)/.exec(className ?? '');
              return match?.groups?.language ? (
                <code {...rest} className={clsx(match.groups.language)}>
                  {children}
                </code>
              ) : (
                <code {...rest} className={className}>
                  {children}
                </code>
              );
            },
          }
        }
      >
        {props.value.value}
      </ReactMarkdown>
    </div>
  );
};
