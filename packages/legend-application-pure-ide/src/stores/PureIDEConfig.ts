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

export const WELCOME_FILE_PATH = '/welcome.pure';
export const HOME_DIRECTORY_PATH = '/';
export const ROOT_PACKAGE_PATH = '::';

export enum ACTIVITY_MODE {
  CONCEPT_EXPLORER = 'CONCEPT_EXPLORER',
  FILE_EXPLORER = 'FILE_EXPLORER',
}

export enum PANEL_MODE {
  TERMINAL = 'TERMINAL',
  SEARCH = 'SEARCH',
  REFERENCES = 'REFERNECES',
  TEST_RUNNER = 'TEST_RUNNER',
  CODE_FIX_SUGGESTION = 'CODE_FIX_SUGGESTION',
}
