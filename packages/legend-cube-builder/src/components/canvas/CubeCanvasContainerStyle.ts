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

// How a container (PLAN §11.29) looks, for the editor's canvas and a
// definition's flow alike: a module of its own, so the flow loads none of the
// editor. Its colours mix the theme's, so it reads in the dark theme and the
// light one alike.

/** An open container: a see-through plane behind its steps */
export const CUBE_CANVAS_FRAME_STYLE = {
  background: 'color-mix(in srgb, var(--color-accent) 7%, transparent)',
  borderColor: 'color-mix(in srgb, var(--color-accent) 45%, transparent)',
};

/** A stack of cards: the box holds several steps */
export const CUBE_CANVAS_FOLDED_STYLE = {
  boxShadow:
    '4px 4px 0 -1px var(--color-bg-panel), 4px 4px 0 0 var(--color-border-default), 8px 8px 0 -1px var(--color-bg-panel), 8px 8px 0 0 var(--color-border-default)',
};
