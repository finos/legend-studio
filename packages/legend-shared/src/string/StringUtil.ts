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

export const removePrefix = (text: string, prefix: string): string => {
  if (text.startsWith(prefix)) {
    return text.slice(prefix.length); // Remove the prefix
  }
  return text; // Return the original string if it doesn't start with the prefix
};

export const removeSuffix = (str: string, suffix: string): string => {
  if (str.endsWith(suffix)) {
    return str.slice(0, -suffix.length); // Remove the suffix
  }
  return str; // Return the original string if no suffix is found
};

/**
 * Default cap for error messages forwarded to telemetry. Generous enough to
 * keep real diagnostic content, small enough to keep an event well under the
 * per-event size limits telemetry pipelines typically enforce.
 */
export const DEFAULT_TELEMETRY_MESSAGE_LENGTH_LIMIT = 2000;

/**
 * Caps a free-text message destined for a telemetry payload.
 *
 * Backend error messages are unbounded — they can embed generated SQL, stack
 * traces, or compilation output. Left uncapped they risk pushing an event past
 * the pipeline's size limit, and oversized events are usually dropped whole:
 * the biggest, most interesting failures are then the ones that silently
 * disappear from the dashboard.
 *
 * The `truncated` flag is returned rather than inferred so callers can report
 * it alongside the text. A silently clipped message makes substring searches
 * produce false negatives with no way for an analyst to tell.
 *
 * NOTE: this is a size control, not a privacy control — if a message embeds
 * sensitive values in its first characters, truncation will not remove them.
 */
export const truncateMessageForTelemetry = (
  message: string,
  limit = DEFAULT_TELEMETRY_MESSAGE_LENGTH_LIMIT,
): { message: string; truncated: boolean } =>
  message.length <= limit
    ? { message, truncated: false }
    : { message: message.slice(0, limit), truncated: true };
