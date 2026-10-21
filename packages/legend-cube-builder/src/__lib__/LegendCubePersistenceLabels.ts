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

// The words of saving and loading cubes (PLAN §11.13; spec §14.4, §17.10,
// §17.14)

/** Asked before New, Load, Paste, Import or an example replaces unsaved changes, and on leaving the page (spec §14.4, §17.14) */
export const UNSAVED_CHANGES_MESSAGE =
  'Unsaved changes to your query will be lost if you continue. Are you sure?';

/** The graph area's banner when the cube an address names can't be opened (QUESTIONS.md U9 (b)) */
export const LOAD_ERROR_TITLE = 'Error loading query!';

/** Pending labels: lower-case gerunds, shown as they are (spec §17.13) */
export enum CUBE_PERSISTENCE_PENDING_LABEL {
  SAVING = 'saving cube',
  LOADING = 'loading cube',
  DELETING = 'deleting cube',
  SEARCHING = 'searching cubes',
}

/** Why Save, Save as or Load can't be used */
export const NO_CUBE_STORE_TITLE =
  "This Legend deployment has no Cube store, so cubes can't be saved or loaded here; use Export and Import";
export const EMPTY_CUBE_SAVE_TITLE = 'Add a table first.';
export const NOT_OWNER_SAVE_TITLE =
  "Only this cube's owners can save it: use Save as to save a copy of your own.";
export const PENDING_SAVE_TITLE =
  'Wait for the cube to finish saving or loading.';
export const getInvalidCubeSaveTitle = (problem: string): string =>
  `A cube is saved only when every step is valid: ${problem}`;

/** Shortcuts, as the buttons' tooltips name them (spec §17.12) */
export enum CUBE_PERSISTENCE_SHORTCUT_LABEL {
  NEW = 'Alt+N',
  LOAD = 'Alt+L',
  SAVE = 'Alt+S',
  COPY = 'Alt+C',
  PASTE = 'Alt+V',
}

/** The longest name the store keeps */
export const MAX_CUBE_NAME_LENGTH = 255;

export const getCubeNameError = (name: string): string | undefined =>
  !name.trim()
    ? 'Name the cube.'
    : name.trim().length > MAX_CUBE_NAME_LENGTH
      ? `A name has at most ${MAX_CUBE_NAME_LENGTH} characters.`
      : undefined;
