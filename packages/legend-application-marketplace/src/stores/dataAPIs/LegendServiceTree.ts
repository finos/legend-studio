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

import { guaranteeNonNullable } from '@finos/legend-shared';
import type { LegendServiceCardState } from './LegendMarketplaceDataAPIsStore.js';

const LABEL_COLLATOR = new Intl.Collator();

export const toPatternSegments = (pattern: string): string[] =>
  pattern.split('/').filter(Boolean);

export class LegendServiceTreeNode {
  readonly path: string;
  readonly key: string;
  label: string;
  readonly children: LegendServiceTreeNode[] = [];
  readonly services: LegendServiceCardState[] = [];
  serviceCount = 0;
  depth = 0;
  siblingIndex = 0;
  siblingCount = 1;
  subtreeEnd = 0;

  constructor(path: string, label: string, key = path) {
    this.path = path;
    this.label = label;
    this.key = key;
  }

  get isOwnServiceLeaf(): boolean {
    return this.key !== this.path;
  }

  get isGroup(): boolean {
    return this.children.length > 0;
  }
}

export class LegendServiceTree {
  readonly roots: LegendServiceTreeNode[];
  readonly groupPaths: string[] = [];
  readonly flat: LegendServiceTreeNode[] = [];

  constructor(services: LegendServiceCardState[], scopePath?: string) {
    const root = new LegendServiceTreeNode('', '');
    const nodesByPath = new Map<string, LegendServiceTreeNode>();
    const scopeSegments = scopePath ? toPatternSegments(scopePath) : [];
    let scopeRoot: LegendServiceTreeNode | undefined;
    if (scopeSegments.length > 0) {
      const path = scopeSegments.join('/');
      scopeRoot = new LegendServiceTreeNode(
        path,
        guaranteeNonNullable(scopeSegments.at(-1)),
      );
      nodesByPath.set(path, scopeRoot);
      root.children.push(scopeRoot);
    }
    for (const card of services) {
      let segments = toPatternSegments(card.patternPath);
      let node = root;
      if (scopeRoot) {
        if (!scopeSegments.every((segment, i) => segments[i] === segment)) {
          continue;
        }
        segments = segments.slice(scopeSegments.length);
        node = scopeRoot;
      }
      for (const segment of segments) {
        const path = node.path ? `${node.path}/${segment}` : segment;
        let child = nodesByPath.get(path);
        if (!child) {
          child = new LegendServiceTreeNode(path, segment);
          nodesByPath.set(path, child);
          node.children.push(child);
        }
        node = child;
      }
      if (node !== root) {
        node.services.push(card);
      }
    }
    this.separateOwnServices(root);
    this.compactChildren(scopeRoot ?? root);
    this.finalize(root);
    this.roots = root.children.filter((child) => child.serviceCount > 0);
    this.roots.forEach((child, idx) =>
      this.flatten(child, 0, idx, this.roots.length),
    );
  }

  /**
   * Moves the services of every node that also has children into a leaf child
   * of its own, so that groups carry no services.
   */
  private separateOwnServices(node: LegendServiceTreeNode): void {
    node.children.forEach((child) => this.separateOwnServices(child));
    if (node.path && node.children.length > 0 && node.services.length > 0) {
      const ownServiceLeaf = new LegendServiceTreeNode(
        node.path,
        node.label,
        `${node.path}#own`,
      );
      ownServiceLeaf.services.push(...node.services);
      node.services.length = 0;
      node.children.push(ownServiceLeaf);
    }
  }

  /**
   * Merges single-child chains below `node`, leaving `node` itself untouched.
   */
  private compactChildren(node: LegendServiceTreeNode): void {
    node.children.forEach((child, idx) => {
      const merged = this.mergeChain(child);
      node.children[idx] = merged;
      this.compactChildren(merged);
    });
  }

  private mergeChain(node: LegendServiceTreeNode): LegendServiceTreeNode {
    let current = node;
    while (
      current.services.length === 0 &&
      current.children.length === 1 &&
      current.children[0]?.isGroup
    ) {
      const only = current.children[0];
      only.label = `${current.label}/${only.label}`;
      current = only;
    }
    return current;
  }

  private flatten(
    node: LegendServiceTreeNode,
    depth: number,
    siblingIndex: number,
    siblingCount: number,
  ): void {
    node.depth = depth;
    node.siblingIndex = siblingIndex;
    node.siblingCount = siblingCount;
    this.flat.push(node);
    node.children.forEach((child, idx) =>
      this.flatten(child, depth + 1, idx, node.children.length),
    );
    node.subtreeEnd = this.flat.length;
  }

  private finalize(node: LegendServiceTreeNode): number {
    node.children.sort((a, b) => {
      if (a.isGroup !== b.isGroup) {
        return a.isGroup ? -1 : 1;
      }
      if (a.isOwnServiceLeaf !== b.isOwnServiceLeaf) {
        return a.isOwnServiceLeaf ? -1 : 1;
      }
      return LABEL_COLLATOR.compare(a.label, b.label);
    });
    let count = node.services.length;
    for (const child of node.children) {
      count += this.finalize(child);
    }
    node.serviceCount = count;
    if (node.isGroup && node.path) {
      this.groupPaths.push(node.path);
    }
    return count;
  }
}
