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

const SERVICE_PATTERN_MATCHER =
  /executes the service with pattern '(?<servicePattern>[^']+)'/u;
const SERVICE_DOCUMENTATION_MATCHER =
  /Service documentation: '(?<documentation>[\S\s]*)'\.\s*Args:/u;
const GROUNDING_RULES_MATCHER =
  /#{1,3}\s*Grounding Rules|^Grounding Rules[\t ]*$/mu;
const MARKDOWN_HEADING_MATCHER = /(?:^|\s)#{1,3}[\t ]+\S/u;

export interface McpToolDocumentation {
  servicePattern: string | undefined;
  documentation: string;
  groundingRules: string | undefined;
}

/**
 * Tool descriptions wrap authored documentation in a fixed envelope whose inner format
 * varies, so only the grounding block is split out and the rest is rendered as markdown.
 */
export const parseMcpToolDocumentation = (
  description: string,
): McpToolDocumentation => {
  const servicePattern =
    SERVICE_PATTERN_MATCHER.exec(description)?.groups?.servicePattern;
  const documentation =
    SERVICE_DOCUMENTATION_MATCHER.exec(description)?.groups?.documentation ??
    description;

  const groundingMatch = GROUNDING_RULES_MATCHER.exec(documentation);
  if (groundingMatch?.index === undefined) {
    return { servicePattern, documentation, groundingRules: undefined };
  }
  const groundingStart = groundingMatch.index;
  const afterGrounding = groundingStart + groundingMatch[0].length;
  const nextHeadingMatch = MARKDOWN_HEADING_MATCHER.exec(
    documentation.slice(afterGrounding),
  );
  const groundingEnd =
    nextHeadingMatch?.index === undefined
      ? documentation.length
      : afterGrounding + nextHeadingMatch.index;

  return {
    servicePattern,
    documentation: [
      documentation.slice(0, groundingStart).trim(),
      documentation.slice(groundingEnd).trim(),
    ]
      .filter((section) => section.length > 0)
      .join('\n\n'),
    groundingRules: documentation.slice(groundingStart, groundingEnd).trim(),
  };
};
