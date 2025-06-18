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
