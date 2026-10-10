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

/**
 * Gives the keyboard focus back to a node on the canvas, as its editor
 * closes from the keyboard (PLAN §11.6), when the focus was in the editor or
 * nowhere: focus the user put elsewhere stays there
 */
export const returnFocusToCubeCanvasNode = (
  nodeId: string,
  editor: Element | null,
  focused: Element | null,
): void => {
  if (
    focused !== null &&
    focused !== document.body &&
    !editor?.contains(focused)
  ) {
    return;
  }
  Array.from(document.querySelectorAll<HTMLElement>('.react-flow__node'))
    .find((element) => element.dataset.id === nodeId)
    ?.focus();
};
