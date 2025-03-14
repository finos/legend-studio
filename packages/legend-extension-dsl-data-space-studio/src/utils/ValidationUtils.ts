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

/**
 * Validates an email address string.
 * Returns undefined if valid, or an error message if invalid.
 */
export const validateEmail = (email: string): string | undefined => {
  if (!email) {
    return 'Email address is required';
  }
  // Basic email validation regex
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return EMAIL_REGEX.test(email) ? undefined : 'Invalid email address format';
};

/**
 * Validates a URL string.
 * Returns undefined if valid, or an error message if invalid.
 */
export const validateUrl = (url: string): string | undefined => {
  if (!url) {
    return undefined; // URLs are optional
  }
  try {
    // Use URL constructor for validation
    new URL(url);
    return undefined;
  } catch {
    return 'Invalid URL format';
  }
};
