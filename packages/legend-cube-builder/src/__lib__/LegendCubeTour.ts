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

import {
  EXECUTE_SHORTCUT_LABEL,
  REDO_SHORTCUT_LABEL,
  UNDO_SHORTCUT_LABEL,
} from './LegendCubeCommand.js';

// The editor's guided tour (PLAN §11.21): its steps, in order, each pointing
// at the controls marked with its anchor. A control joins a step by carrying
// `cubeTourAnchor(...)`; a step whose controls aren't on the page (the graph
// hidden, no run yet, a host without examples) is skipped. A new step adds
// its anchor here, its text below, and the anchor on its controls.

/** The attribute that marks a control as a tour step's */
export const CUBE_TOUR_ANCHOR_ATTRIBUTE = 'data-cube-tour';

export enum CUBE_TOUR_ANCHOR {
  SOURCES = 'sources',
  STEPS = 'steps',
  CANVAS = 'canvas',
  RUNNING_STEP = 'running-step',
  EXECUTE = 'execute',
  GRID_MODE = 'grid-mode',
  RESULTS = 'results',
  SHOW_SQL = 'show-sql',
  RUNS = 'runs',
  CUBE_MENU = 'cube-menu',
  ADD_ITEMS = 'add-items',
  EXAMPLES = 'examples',
  VIEW = 'view',
  PAGE_MENU = 'page-menu',
}

/** The props that mark a control as a tour step's */
export const cubeTourAnchor = (
  anchor: CUBE_TOUR_ANCHOR,
): { [CUBE_TOUR_ANCHOR_ATTRIBUTE]: string } => ({
  [CUBE_TOUR_ANCHOR_ATTRIBUTE]: anchor,
});

/** Where a step's card sits beside its controls */
export type CubeTourPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface CubeTourStep {
  readonly title: string;
  readonly text: string;
  /** The controls it points at; none for a card in the middle of the page */
  readonly anchor?: CUBE_TOUR_ANCHOR | undefined;
  readonly placement?: CubeTourPlacement | undefined;
}

/** The example the tour opens on an empty cube, where examples are offered */
export const CUBE_TOUR_EXAMPLE_ID = 'northwind-top-customers';

export const CUBE_EDITOR_TOUR: readonly CubeTourStep[] = Object.freeze([
  {
    title: 'Welcome to Legend Cube',
    text: 'A cube is a query built as a chain of steps: a source of rows, then steps that sort, group, filter or join them. This tour shows where everything is: Next (or the → key) moves on, and Esc ends it.',
  },
  {
    anchor: CUBE_TOUR_ANCHOR.SOURCES,
    placement: 'right',
    title: 'Sources',
    text: 'Where the rows come from: a database table, a function, a data product or a service. Click one, or drop it on the canvas.',
  },
  {
    anchor: CUBE_TOUR_ANCHOR.STEPS,
    placement: 'right',
    title: 'Steps',
    text: 'Each step works on the rows of the step before it. Click one to add it after the selected step, or drop it on the canvas. A greyed-out step says why when you hover over it.',
  },
  {
    anchor: CUBE_TOUR_ANCHOR.CANVAS,
    placement: 'bottom',
    title: 'The graph',
    text: 'Your query, from left to right. Click a step to edit it: its editor opens beside it, with a ? that says what the step does.',
  },
  {
    anchor: CUBE_TOUR_ANCHOR.RUNNING_STEP,
    placement: 'bottom',
    title: 'The step that runs',
    text: 'Execute runs the query up to the step marked Runs. To run up to another step, open its editor and click Run this step.',
  },
  {
    anchor: CUBE_TOUR_ANCHOR.EXECUTE,
    placement: 'top',
    title: 'Execute',
    text: `Runs the query and shows its rows below (${EXECUTE_SHORTCUT_LABEL}). Rows caps how many rows come back.`,
  },
  {
    anchor: CUBE_TOUR_ANCHOR.GRID_MODE,
    placement: 'top',
    title: 'Server-side or Local',
    text: 'Server-side: each sort and drill-down in the grid runs on the engine, over every row of the query. Local: the grid groups, pivots and filters the rows already fetched, in your browser.',
  },
  {
    anchor: CUBE_TOUR_ANCHOR.RESULTS,
    placement: 'top',
    title: 'The results',
    text: 'The rows of the last run. Right-click a cell to sort, group or filter by its column as a new step, drill down, format a number column, or export the rows.',
  },
  {
    anchor: CUBE_TOUR_ANCHOR.SHOW_SQL,
    placement: 'top',
    title: 'Show SQL',
    text: 'The SQL the last run sent to the database.',
  },
  {
    anchor: CUBE_TOUR_ANCHOR.RUNS,
    placement: 'top',
    title: 'Runs',
    text: 'The latest runs, fetches and exports, each with its SQL and how long it took.',
  },
  {
    anchor: CUBE_TOUR_ANCHOR.CUBE_MENU,
    placement: 'bottom',
    title: 'The Cube menu',
    text: 'Start a new cube, import or export one, or read a Pure query in as steps with Import Pure.',
  },
  {
    anchor: CUBE_TOUR_ANCHOR.ADD_ITEMS,
    placement: 'bottom',
    title: 'Add Items',
    text: "The palette's sources and steps, as a menu.",
  },
  {
    anchor: CUBE_TOUR_ANCHOR.EXAMPLES,
    placement: 'bottom',
    title: 'Examples',
    text: 'Ready-made cubes on sample data, to try things out.',
  },
  {
    anchor: CUBE_TOUR_ANCHOR.VIEW,
    placement: 'bottom',
    title: 'Undo, Show Pure, Hide graph',
    text: `Undo (${UNDO_SHORTCUT_LABEL}) and Redo (${REDO_SHORTCUT_LABEL}) every change. Show Pure shows the Pure query Execute runs. Hide graph leaves more room for the results.`,
  },
  {
    anchor: CUBE_TOUR_ANCHOR.PAGE_MENU,
    placement: 'right',
    title: "That's the tour",
    text: 'Take it again from this menu whenever you like.',
  },
]);

export const CUBE_TOUR_LABEL = {
  START: 'Take the tour',
  /** The empty canvas's offer */
  OFFER: 'New to Legend Cube?',
  NEXT: 'Next',
  BACK: 'Back',
  DONE: 'Done',
  END: 'End the tour',
  progress: (step: number, steps: number): string => `${step} of ${steps}`,
  /** Added to the first step when the tour opened its example */
  EXAMPLE_OPENED:
    'The tour opened the example "Top customers by orders" to show you around; Undo puts the empty cube back.',
};
