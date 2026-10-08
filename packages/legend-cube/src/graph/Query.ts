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

import { Connection } from './Connection.js';
import type { QueryNode } from './QueryNode.js';

/** Generated ids start at 101 */
const NODE_ID_FLOOR = 100;
/** The fallback scan for a free id stops here */
const MAX_NODE_ID_SUFFIX = 10000;

const DIGITS = /^\d+$/u;

/** The connection into the first connected port of the node, in port order */
const findFirstInput = (
  connections: readonly Connection[],
  node: QueryNode,
): Connection | undefined =>
  node.ports
    .map((port) => connections.find((c) => c.match(undefined, node.id, port)))
    .find((connection) => connection !== undefined);

/**
 * Removes every connection of the node and heals the chain around it: when
 * the node had an input and an output, its first input in port order now
 * feeds its output's target, on the same port.
 */
const disconnect = (
  connections: readonly Connection[],
  node: QueryNode,
): Connection[] => {
  const input = findFirstInput(connections, node);
  const output = connections.find((c) => c.source === node.id);
  const kept = connections.filter(
    (c) => c.source !== node.id && c.target !== node.id,
  );
  return input && output
    ? [...kept, new Connection(input.source, output.target, output.port)]
    : kept;
};

/**
 * Splices `node` in after `afterId`: `afterId` now feeds the node's first port,
 * and whatever `afterId` used to feed is now fed by the node instead.
 */
const connectAfter = (
  connections: readonly Connection[],
  node: QueryNode,
  afterId: string,
): Connection[] => {
  const [firstPort] = node.ports;
  if (firstPort === undefined) {
    throw new Error(`Node "${node.id}" has no input port to connect to`);
  }
  const output = connections.find((c) => c.source === afterId);
  const kept = connections.filter((c) => c !== output);
  return [
    ...kept,
    new Connection(afterId, node.id, firstPort),
    ...(output ? [new Connection(node.id, output.target, output.port)] : []),
  ];
};

/**
 * The query graph: nodes, the connections between them, and the selected
 * node, which is both the node highlighted in the editor and the node whose
 * output is executed (the capture node).
 *
 * Immutable: every operation returns a new query. Each operation has a `canX`
 * predicate that is total and side-effect free, for the UI to enable menu
 * items and drop targets; the operation itself throws when its predicate fails.
 */
export class Query {
  readonly nodes: readonly QueryNode[];
  readonly connections: readonly Connection[];
  readonly selected: string | undefined;

  private readonly nodeIndex: ReadonlyMap<string, QueryNode>;

  /**
   * Asserts the invariants, throwing on any violation:
   * 1. node ids are unique;
   * 2. every connection's source and target are nodes of the query;
   * 3. a node's output feeds at most one node, so the graph is a forest of trees;
   * 4. `selected` is undefined or the id of a node;
   * 5. `selected` is undefined if and only if there are no nodes;
   * 6. there is no cycle;
   * 7. every connection targets a port its target node has.
   *
   * Port capacity (one connection per target port) is not an invariant: the
   * operations enforce it.
   */
  constructor(
    nodes: readonly QueryNode[] = [],
    connections: readonly Connection[] = [],
    selected?: string,
  ) {
    this.nodes = Object.freeze([...nodes]);
    this.connections = Object.freeze([...connections]);
    this.selected = selected;

    const nodeIndex = new Map<string, QueryNode>();
    this.nodes.forEach((node) => {
      if (nodeIndex.has(node.id)) {
        throw new Error(`Query has more than one node with id "${node.id}"`);
      }
      nodeIndex.set(node.id, node);
    });
    this.nodeIndex = nodeIndex;

    const sources = new Set<string>();
    this.connections.forEach((connection) => {
      const target = nodeIndex.get(connection.target);
      if (!nodeIndex.has(connection.source) || !target) {
        throw new Error(
          `Connection ${connection.toString()} refers to a node that is not in the query`,
        );
      }
      if (sources.has(connection.source)) {
        throw new Error(
          `Node "${connection.source}" can't feed more than one node`,
        );
      }
      sources.add(connection.source);
      if (!target.ports.includes(connection.port)) {
        throw new Error(
          `Connection ${connection.toString()} targets a port that node "${target.id}" does not have`,
        );
      }
    });

    if (selected !== undefined && !nodeIndex.has(selected)) {
      throw new Error(`Selected node "${selected}" is not in the query`);
    }
    if ((selected === undefined) !== (this.nodes.length === 0)) {
      throw new Error(
        selected === undefined
          ? `A query with nodes must have a selected node`
          : `An empty query can't have a selected node`,
      );
    }

    const nodeInCycle = this.findNodeInCycle();
    if (nodeInCycle !== undefined) {
      throw new Error(`Query has a cycle through node "${nodeInCycle}"`);
    }
  }

  private findNodeInCycle(): string | undefined {
    const next = new Map(this.connections.map((c) => [c.source, c.target]));
    const checked = new Set<string>();
    for (const node of this.nodes) {
      const path = new Set<string>();
      for (
        let current: string | undefined = node.id;
        current !== undefined && !checked.has(current);
        current = next.get(current)
      ) {
        if (path.has(current)) {
          return current;
        }
        path.add(current);
      }
      path.forEach((id) => checked.add(id));
    }
    return undefined;
  }

  // ---------------------------------------- Lookups ----------------------------------------

  get isEmpty(): boolean {
    return this.nodes.length === 0;
  }

  getNode(id: string): QueryNode | undefined {
    return this.nodeIndex.get(id);
  }

  /** The ids of the nodes feeding each input port of the node, in port order; `undefined` for an empty port */
  getInputIds(nodeId: string): (string | undefined)[] {
    return (this.getNode(nodeId)?.ports ?? []).map(
      (port) =>
        this.connections.find((c) => c.match(undefined, nodeId, port))?.source,
    );
  }

  /** The connection the node's output feeds, if any */
  getOutputConnection(nodeId: string): Connection | undefined {
    return this.connections.find((c) => c.source === nodeId);
  }

  /** The node's input ports that nothing feeds yet, in port order */
  getFreePorts(nodeId: string): string[] {
    return (this.getNode(nodeId)?.ports ?? []).filter(
      (port) => !this.connections.some((c) => c.match(undefined, nodeId, port)),
    );
  }

  /** Whether the output of `upstreamId` reaches `nodeId`, directly or through other nodes */
  isUpstreamOf(upstreamId: string, nodeId: string): boolean {
    const visited = new Set<string>();
    for (
      let current = this.getOutputConnection(upstreamId)?.target;
      current !== undefined && !visited.has(current);
      current = this.getOutputConnection(current)?.target
    ) {
      if (current === nodeId) {
        return true;
      }
      visited.add(current);
    }
    return false;
  }

  /**
   * Whether the query is valid, given the validity found for each node by
   * schema inference: not empty, and every node has an empty list of errors.
   */
  validate(validity: ReadonlyMap<string, readonly string[]>): boolean {
    return (
      !this.isEmpty &&
      this.nodes.every((node) => validity.get(node.id)?.length === 0)
    );
  }

  // ---------------------------------------- Ids ----------------------------------------

  /**
   * A new id for a node of the type: the type followed by one more than the
   * highest number used by nodes of that type, starting at 101, e.g.
   * `filter101`, `filter102`. If that id is taken (by a node of another type),
   * the lowest free number from 1 is used instead.
   */
  generateId(type: string): string {
    const numbers = this.nodes
      .filter((node) => node.type === type && node.id.startsWith(type))
      .map((node) => node.id.slice(type.length))
      .filter((suffix) => DIGITS.test(suffix))
      .map(Number);
    const next = Math.max(NODE_ID_FLOOR, ...numbers) + 1;
    const id = `${type}${next}`;
    if (Number.isSafeInteger(next) && !this.getNode(id)) {
      return id;
    }
    for (let suffix = 1; suffix <= MAX_NODE_ID_SUFFIX; suffix += 1) {
      const fallbackId = `${type}${suffix}`;
      if (!this.getNode(fallbackId)) {
        return fallbackId;
      }
    }
    throw new Error(
      `too many query nodes of type "${type}" to generate identifier`,
    );
  }

  // ---------------------------------------- Operations ----------------------------------------

  /** A new query object with the same content, e.g. for undo, whose change detection needs a new identity */
  clone(): Query {
    return new Query(this.nodes, this.connections, this.selected);
  }

  canSelect(nodeId: string): boolean {
    return this.getNode(nodeId) !== undefined && this.selected !== nodeId;
  }

  select(nodeId: string): Query {
    if (!this.canSelect(nodeId)) {
      throw new Error(`Can't select node "${nodeId}"`);
    }
    return new Query(this.nodes, this.connections, nodeId);
  }

  /**
   * Whether the node can be added: its id is new, and when it goes after
   * another node, that node exists and the new node has an input port and
   * accepts new inputs.
   */
  canAdd(node: QueryNode, afterId?: string): boolean {
    if (this.getNode(node.id) || node.id === afterId) {
      return false;
    }
    return (
      afterId === undefined ||
      (this.getNode(afterId) !== undefined &&
        node.ports.length > 0 &&
        node.acceptsNewInputs)
    );
  }

  /**
   * Adds the node. With `afterId`, splices it into the chain after that node:
   * `afterId` feeds the new node's first port, and whatever `afterId` fed is
   * now fed by the new node. The new node is selected if nothing was, or if it
   * goes after the selected node.
   */
  add(node: QueryNode, afterId?: string): Query {
    if (!this.canAdd(node, afterId)) {
      throw new Error(
        `Can't add node "${node.id}"${afterId === undefined ? '' : ` after node "${afterId}"`}`,
      );
    }
    return new Query(
      [...this.nodes, node],
      afterId === undefined
        ? this.connections
        : connectAfter(this.connections, node, afterId),
      this.selected === undefined || afterId === this.selected
        ? node.id
        : this.selected,
    );
  }

  /**
   * Whether the node can be moved after another: both exist and differ, the
   * node has an input port and accepts new inputs, and it isn't already fed
   * by `afterId`. Moving can't create a cycle, since the node is disconnected
   * first.
   */
  canMove(nodeId: string, afterId: string): boolean {
    const node = this.getNode(nodeId);
    return (
      node !== undefined &&
      this.getNode(afterId) !== undefined &&
      nodeId !== afterId &&
      node.ports.length > 0 &&
      node.acceptsNewInputs &&
      !this.connections.some((c) => c.match(afterId, nodeId))
    );
  }

  /**
   * Moves the node after another: disconnects it, healing the chain it leaves,
   * then splices it in after `afterId` as `add()` does. Selection follows
   * `add()` too: moving a node after the selected node selects it.
   */
  move(nodeId: string, afterId: string): Query {
    const node = this.getNode(nodeId);
    if (!node || !this.canMove(nodeId, afterId)) {
      throw new Error(`Can't move node "${nodeId}" after node "${afterId}"`);
    }
    return new Query(
      this.nodes,
      connectAfter(disconnect(this.connections, node), node, afterId),
      afterId === this.selected ? nodeId : this.selected,
    );
  }

  canRemove(nodeId: string): boolean {
    return this.getNode(nodeId) !== undefined;
  }

  /**
   * Removes the node and heals the chain: when it had an input and an output,
   * its first input in port order now feeds its output's target. If it was
   * selected, the selection moves to the node that fed it, else to the node
   * it fed, else to the last node left.
   */
  remove(nodeId: string): Query {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`Can't remove node "${nodeId}": it is not in the query`);
    }
    const nodes = this.nodes.filter((n) => n.id !== nodeId);
    const selected =
      this.selected !== nodeId
        ? this.selected
        : (findFirstInput(this.connections, node)?.source ??
          this.getOutputConnection(nodeId)?.target ??
          nodes.at(-1)?.id);
    return new Query(nodes, disconnect(this.connections, node), selected);
  }

  /**
   * Whether `sourceId` can feed `targetId`, on `port` if given, else on the
   * target's first free port: both exist and differ, the source feeds nothing
   * yet, the port is free, the target accepts new inputs, and the target is
   * not upstream of the source, which would close a cycle.
   */
  canConnect(sourceId: string, targetId: string, port?: string): boolean {
    const target = this.getNode(targetId);
    if (
      !target ||
      !this.getNode(sourceId) ||
      sourceId === targetId ||
      !target.acceptsNewInputs ||
      this.getOutputConnection(sourceId)
    ) {
      return false;
    }
    const freePorts = this.getFreePorts(targetId);
    return (
      (port === undefined ? freePorts.length > 0 : freePorts.includes(port)) &&
      !this.isUpstreamOf(targetId, sourceId)
    );
  }

  /** Connects `sourceId` to `targetId`, on `port` if given, else on the target's first free port */
  connect(sourceId: string, targetId: string, port?: string): Query {
    const freePort = port ?? this.getFreePorts(targetId)[0];
    if (freePort === undefined || !this.canConnect(sourceId, targetId, port)) {
      throw new Error(
        `Can't connect node "${sourceId}" to node "${targetId}"${port === undefined ? '' : ` on port "${port}"`}`,
      );
    }
    return new Query(
      this.nodes,
      [...this.connections, new Connection(sourceId, targetId, freePort)],
      this.selected,
    );
  }

  /** Whether the node is a binary node with at least one input, which accepts new inputs */
  canSwapInputs(nodeId: string): boolean {
    const node = this.getNode(nodeId);
    return (
      node !== undefined &&
      node.ports.length === 2 &&
      node.acceptsNewInputs &&
      this.connections.some((c) => c.target === nodeId)
    );
  }

  /**
   * Swaps the two inputs of a binary node, e.g. to turn a left outer join
   * around. The node's settings follow its inputs (`withSwappedInputs`).
   */
  swapInputs(nodeId: string): Query {
    const node = this.getNode(nodeId);
    const [first, second] = node?.ports ?? [];
    if (
      !node ||
      !this.canSwapInputs(nodeId) ||
      first === undefined ||
      second === undefined
    ) {
      throw new Error(`Can't swap the inputs of node "${nodeId}"`);
    }
    const swapped = node.withSwappedInputs();
    if (swapped.id !== node.id) {
      throw new Error(
        `Swapping the inputs of node "${nodeId}" gave a node with id "${swapped.id}"`,
      );
    }
    return new Query(
      this.nodes.map((n) => (n === node ? swapped : n)),
      this.connections.map((c) =>
        c.target === nodeId
          ? new Connection(
              c.source,
              c.target,
              c.port === first ? second : first,
            )
          : c,
      ),
      this.selected,
    );
  }

  /**
   * Whether the node can replace the node of the query with the same id: it
   * is a new node object (a different `key`) and has every port the existing
   * connections into it use.
   */
  canReplace(node: QueryNode): boolean {
    const original = this.getNode(node.id);
    return (
      original !== undefined &&
      original.key !== node.key &&
      this.connections
        .filter((c) => c.target === node.id)
        .every((c) => node.ports.includes(c.port))
    );
  }

  /** Replaces the node with the same id, e.g. after an edit, keeping its connections */
  replace(node: QueryNode): Query {
    if (!this.canReplace(node)) {
      throw new Error(`Can't replace node "${node.id}"`);
    }
    return new Query(
      this.nodes.map((n) => (n.id === node.id ? node : n)),
      this.connections,
      this.selected,
    );
  }
}
