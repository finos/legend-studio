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

import type { JsonObject } from '../utils/Json.js';
import type { Query } from './Query.js';

// Steps the canvas draws together, in a frame with a title, that can be
// folded to one box: Alteryx's Tool Container. Only how the graph is shown,
// never what the cube runs. Cube already has a Group step, so they are
// containers. Saved in the cube's meta (`meta.containers`) as written; the
// canvas leaves out what it can't draw (`getShownContainers`).

export interface StepContainer {
  readonly id: string;
  readonly title: string;
  /** The ids of its steps */
  readonly steps: readonly string[];
  /** Drawn as one box in its steps' place, its steps out of sight */
  readonly folded: boolean;
  readonly rest?: JsonObject;
}

/** A container as the canvas draws it: the steps of it the query has, sorted by id */
export interface ShownStepContainer {
  readonly container: StepContainer;
  readonly steps: readonly string[];
}

// by code unit, so the order never depends on the locale
const compareText = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

/**
 * Whether the steps are one block, each linked to another of them: so all of
 * one tree, with every step between two of them one of them too (a forest
 * has one path between two steps). A frame round steps that aren't would
 * hold a step not its own, and folded, two such containers can feed each
 * other, a cycle: {a1, a2} and {b1, b2} on a Join fed by a1 → b1 and
 * b2 → a2. One that is folded has one output, its last step's.
 */
export const isConnectedStepSet = (
  query: Query,
  steps: ReadonlySet<string>,
): boolean => {
  const [first] = steps;
  if (first === undefined) {
    return false;
  }
  const reached = new Set([first]);
  const queue = [first];
  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    query.connections.forEach((connection) => {
      const other =
        connection.source === id
          ? connection.target
          : connection.target === id
            ? connection.source
            : undefined;
      if (other !== undefined && steps.has(other) && !reached.has(other)) {
        reached.add(other);
        queue.push(other);
      }
    });
  }
  return reached.size === steps.size;
};

/**
 * The containers the canvas draws, in the order saved, each with the steps
 * of it the query has. A step two list is the first's. A container left with
 * no step, e.g. saved by a Cube that removed its steps without knowing it, or
 * whose steps aren't one block (`isConnectedStepSet`), e.g. after a step
 * moved, is not drawn: its steps show as any other.
 */
export const getShownContainers = (
  query: Query,
  containers: readonly StepContainer[] | undefined,
): ShownStepContainer[] => {
  const taken = new Set<string>();
  const shown: ShownStepContainer[] = [];
  (containers ?? []).forEach((container) => {
    const steps = [...new Set(container.steps)].filter(
      (id) => query.getNode(id) !== undefined && !taken.has(id),
    );
    if (steps.length && isConnectedStepSet(query, new Set(steps))) {
      steps.forEach((id) => taken.add(id));
      shown.push({ container, steps: steps.sort(compareText) });
    }
  });
  return shown;
};

/** The container the canvas draws the step in, if any */
export const getStepContainer = (
  shown: readonly ShownStepContainer[],
  stepId: string,
): ShownStepContainer | undefined =>
  shown.find((each) => each.steps.includes(stepId));

/**
 * The steps a new container from this step takes: the step, and each step
 * before it in no container, as far back as a step in one: one block, since
 * each feeds another of them
 */
export const getStepsForNewContainer = (
  query: Query,
  shown: readonly ShownStepContainer[],
  stepId: string,
): string[] => {
  const contained = new Set(shown.flatMap((each) => each.steps));
  if (!query.getNode(stepId) || contained.has(stepId)) {
    return [];
  }
  const steps: string[] = [];
  const visit = (id: string): void => {
    steps.push(id);
    query
      .getInputIds(id)
      .forEach(
        (input) => input !== undefined && !contained.has(input) && visit(input),
      );
  };
  visit(stepId);
  return steps.sort(compareText);
};

/** A new container's id: `container` and one more than the highest number used */
export const generateStepContainerId = (
  containers: readonly StepContainer[],
): string =>
  `container${
    Math.max(
      0,
      ...containers
        .map(
          (container) =>
            /^container(?<number>\d+)$/u.exec(container.id)?.groups?.number,
        )
        .filter((digits) => digits !== undefined)
        .map(Number),
    ) + 1
  }`;

/**
 * The containers without the steps the query no longer has, and without the
 * containers that leaves empty: a step removed must not leave its id behind
 * for a new step of the same id to take up
 */
export const pruneStepContainers = (
  containers: readonly StepContainer[] | undefined,
  query: Query,
): readonly StepContainer[] | undefined => {
  if (!containers) {
    return containers;
  }
  const kept = containers
    .map((container) => {
      const steps = container.steps.filter(
        (id) => query.getNode(id) !== undefined,
      );
      return steps.length === container.steps.length
        ? container
        : { ...container, steps };
    })
    .filter((container) => container.steps.length > 0);
  return kept.length === containers.length &&
    kept.every((container, index) => container === containers[index])
    ? containers
    : kept;
};
