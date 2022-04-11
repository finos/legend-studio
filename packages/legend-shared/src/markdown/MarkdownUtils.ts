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

import MarkdownIt from 'markdown-it';
import type { PlainObject } from '../CommonUtils';
import { guaranteeNonNullable } from '../error/AssertionUtils';

const genericMarkdownItEngine = new MarkdownIt();

export interface MarkdownText {
  value: string;
}

export const deserializeMarkdownText = (
  val: PlainObject<MarkdownText>,
): MarkdownText => {
  guaranteeNonNullable(val.value);
  return val as unknown as MarkdownText;
};

export const renderMarkdownToHTML = (val: string): string =>
  genericMarkdownItEngine.render(val);
