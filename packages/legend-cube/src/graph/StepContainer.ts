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

/** The steps in blocks: each block's steps linked to one another, and to no step of another */
const getStepBlocks = (
  query: Query,
  steps: ReadonlySet<string>,
): string[][] => {
  const blocks: string[][] = [];
  const reached = new Set<string>();
  steps.forEach((first) => {
    if (reached.has(first)) {
      return;
    }
    const block = [first];
    reached.add(first);
    for (let index = 0; index < block.length; index++) {
      const id = block[index] as string;
      query.connections.forEach((connection) => {
        const other =
          connection.source === id
            ? connection.target
            : connection.target === id
              ? connection.source
              : undefined;
        if (other !== undefined && steps.has(other) && !reached.has(other)) {
          reached.add(other);
          block.push(other);
        }
      });
    }
    blocks.push(block);
  });
  return blocks;
};

/**
 * Whether the steps are one block, each linked to another of them: so all of
 * one tree, with every step between two of them one of them too (a forest
 * has one path between two steps). A frame round steps that aren't would
 * hold a step not its own, and folded, two such containers can feed each
 * other, a cycle: {a1, a2} and {b1, b2} on a Join fed by a1 → b1 and
 * b2 → a2. Blocks of a forest folded to boxes still make a forest, so folding
 * any number of them makes none. One that is folded has one output, its last
 * step's.
 */
export const isConnectedStepSet = (
  query: Query,
  steps: ReadonlySet<string>,
): boolean => getStepBlocks(query, steps).length === 1;

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

/**
 * The block that links these steps, e.g. the steps picked on the canvas: them
 * and each step between two of them, sorted by id, the smallest block
 * (`isConnectedStepSet`) holding them. A step feeds one step at most, so each
 * has one way down the flow, to its tree's last step; the block is each
 * step's way down to where all their ways meet. None for no step, or for
 * steps of two trees, which no block links. A step the query hasn't is left
 * out.
 */
export const getBlockLinkingSteps = (
  query: Query,
  steps: Iterable<string>,
): string[] | undefined => {
  const ways = [...new Set(steps)]
    .filter((id) => query.getNode(id) !== undefined)
    .map((id) => {
      const way = [id];
      for (
        let next = query.getOutputConnection(id)?.target;
        next !== undefined &&
        query.getNode(next) !== undefined &&
        !way.includes(next);
        next = query.getOutputConnection(next)?.target
      ) {
        way.push(next);
      }
      return way;
    });
  const [first, ...others] = ways;
  const meeting = first?.find((id) => others.every((way) => way.includes(id)));
  return meeting === undefined
    ? undefined
    : [
        ...new Set(
          ways.flatMap((way) => way.slice(0, way.indexOf(meeting) + 1)),
        ),
      ].sort(compareText);
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
 * The containers beside a step in none: each holding a step that feeds it,
 * or the step it feeds. The step can join them, as one block still.
 */
export const getContainersBesideStep = (
  query: Query,
  shown: readonly ShownStepContainer[],
  stepId: string,
): ShownStepContainer[] => {
  if (!query.getNode(stepId) || getStepContainer(shown, stepId)) {
    return [];
  }
  const output = query.getOutputConnection(stepId)?.target;
  const linked = new Set(
    [...query.getInputIds(stepId), output].filter(
      (id): id is string => id !== undefined,
    ),
  );
  return shown.filter((each) => each.steps.some((id) => linked.has(id)));
};

/**
 * Whether a step can be taken out of its container: what is left is one
 * block still, or nothing. A step at the container's edge, then: one that no
 * other step of it feeds, or its last step, when it isn't a Join of two of
 * them.
 */
export const canTakeStepOutOfContainer = (
  query: Query,
  shown: readonly ShownStepContainer[],
  stepId: string,
): boolean => {
  const container = getStepContainer(shown, stepId);
  if (!container) {
    return false;
  }
  const rest = container.steps.filter((id) => id !== stepId);
  return !rest.length || isConnectedStepSet(query, new Set(rest));
};

const isSameList = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((each, index) => each === b[index]);

/**
 * The containers once the query has changed (PLAN §11.29): steps follow the
 * flow.
 *
 * 1. A step the query no longer has leaves its container: a new step of the
 *    same id must not take its place.
 * 2. Each step placed, added or moved, leaves the container it was in, and
 *    joins the one that holds both the step feeding its first input and the
 *    step it feeds: one added after a container's last step stays out.
 * 3. A container split by the change, e.g. by removing a Join in it, keeps
 *    its largest block, the one with the first step by id when two are as
 *    large; one left with no step goes.
 *
 * The containers as they were when nothing changes.
 */
export const reconcileStepContainers = (
  containers: readonly StepContainer[] | undefined,
  query: Query,
  placed: readonly string[] = [],
): readonly StepContainer[] | undefined => {
  if (!containers?.length) {
    return containers;
  }
  const isPlaced = new Set(placed);
  const working = containers.map((container) => ({
    container,
    steps: container.steps.filter(
      (id) => query.getNode(id) !== undefined && !isPlaced.has(id),
    ),
  }));
  placed.forEach((id) => {
    const input = query.getInputIds(id).find((each) => each !== undefined);
    const output = query.getOutputConnection(id)?.target;
    const into =
      input === undefined || output === undefined
        ? undefined
        : working.find(
            ({ steps }) => steps.includes(input) && steps.includes(output),
          );
    if (into && query.getNode(id)) {
      into.steps = [...into.steps, id];
    }
  });
  const next = working
    .map(({ container, steps }) => {
      const [largest = []] = getStepBlocks(query, new Set(steps)).sort(
        (a, b) =>
          b.length - a.length ||
          compareText(
            [...a].sort(compareText)[0] ?? '',
            [...b].sort(compareText)[0] ?? '',
          ),
      );
      const kept = steps.filter((id) => largest.includes(id));
      return isSameList(kept, container.steps)
        ? container
        : { ...container, steps: kept };
    })
    .filter((container) => container.steps.length > 0);
  return next.length === containers.length &&
    next.every((container, index) => container === containers[index])
    ? containers
    : next;
};
