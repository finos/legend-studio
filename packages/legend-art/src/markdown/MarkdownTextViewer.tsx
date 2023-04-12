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

export const MarkdownTextViewer: React.FC<{
  value: MarkdownText;
  className?: string | undefined;
  components?: Record<string, unknown> | undefined;
}> = (props) => (
  <ReactMarkdown
    className={clsx('markdown-content', props.className)}
    remarkPlugins={[remarkGFM]}
    components={props.components ?? {}}
  >
    {props.value.value}
  </ReactMarkdown>
);
