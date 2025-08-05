/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { makeObservable, observable, action, computed } from 'mobx';
import { uuid } from '@finos/legend-shared';
import {
  PureIDETabManagerState,
  PureIDETabState,
} from './PureIDETabManagerState.js';
import type { PureIDEStore } from './PureIDEStore.js';

export enum EditorSplitOrientation {
  HORIZONTAL = 'HORIZONTAL',
  VERTICAL = 'VERTICAL',
}

export interface EditorSplitNode {
  readonly id: string;
  readonly parent?: EditorSplitGroupState | undefined;
}

export class EditorSplitLeaf implements EditorSplitNode {
  readonly id: string;
  readonly parent?: EditorSplitGroupState | undefined;
  readonly tabManagerState: PureIDETabManagerState;

  constructor(ideStore: PureIDEStore, parent?: EditorSplitGroupState) {
    makeObservable(this, {
      tabManagerState: observable,
    });

    this.id = uuid();
    this.parent = parent;
    this.tabManagerState = new PureIDETabManagerState(ideStore);
  }

  get isEmpty(): boolean {
    return this.tabManagerState.tabs.length === 0;
  }

  get hasActiveTab(): boolean {
    return Boolean(this.tabManagerState.currentTab);
  }

  openTab(tab: PureIDETabState): void {
    this.tabManagerState.openTab(tab);
  }

  closeTab(tab: PureIDETabState): void {
    this.tabManagerState.closeTab(tab);
  }

  moveTab(tab: PureIDETabState, targetLeaf: EditorSplitLeaf): void {
    // Remove tab from this leaf
    const tabIndex = this.tabManagerState.tabs.indexOf(tab);
    if (tabIndex !== -1) {
      this.tabManagerState.tabs.splice(tabIndex, 1);
      if (this.tabManagerState.currentTab === tab) {
        this.tabManagerState.currentTab = this.tabManagerState.tabs[0];
      }
    }

    // Add tab to target leaf
    targetLeaf.openTab(tab);
  }
}

export class EditorSplitGroupState implements EditorSplitNode {
  readonly id: string;
  readonly parent?: EditorSplitGroupState | undefined;
  orientation: EditorSplitOrientation;
  first: EditorSplitNode;
  second: EditorSplitNode;
  size?: number | undefined; // For ResizablePanel size prop

  constructor(
    orientation: EditorSplitOrientation,
    first: EditorSplitNode,
    second: EditorSplitNode,
    parent?: EditorSplitGroupState,
    size?: number,
  ) {
    makeObservable(this, {
      orientation: observable,
      first: observable,
      second: observable,
      size: observable,
      setOrientation: action,
      setFirst: action,
      setSecond: action,
      setSize: action,
      leaves: computed,
    });

    this.id = uuid();
    this.parent = parent;
    this.orientation = orientation;
    this.first = first;
    this.second = second;
    this.size = size;
  }

  get leaves(): EditorSplitLeaf[] {
    const result: EditorSplitLeaf[] = [];

    const collectLeaves = (node: EditorSplitNode): void => {
      if (node instanceof EditorSplitLeaf) {
        result.push(node);
      } else if (node instanceof EditorSplitGroupState) {
        collectLeaves(node.first);
        collectLeaves(node.second);
      }
    };

    collectLeaves(this.first);
    collectLeaves(this.second);
    return result;
  }

  setOrientation(orientation: EditorSplitOrientation): void {
    this.orientation = orientation;
  }

  setFirst(node: EditorSplitNode): void {
    this.first = node;
  }

  setSecond(node: EditorSplitNode): void {
    this.second = node;
  }

  setSize(size: number | undefined): void {
    this.size = size;
  }

  // Remove empty splits and clean up the tree
  cleanup(): EditorSplitNode | undefined {
    // First cleanup children
    if (this.first instanceof EditorSplitGroupState) {
      const cleanedFirst = this.first.cleanup();
      if (cleanedFirst !== this.first) {
        this.first =
          cleanedFirst ??
          new EditorSplitLeaf(
            this.leaves[0]?.tabManagerState.ideStore as PureIDEStore,
            this,
          );
      }
    }

    if (this.second instanceof EditorSplitGroupState) {
      const cleanedSecond = this.second.cleanup();
      if (cleanedSecond !== this.second) {
        this.second =
          cleanedSecond ??
          new EditorSplitLeaf(
            this.leaves[0]?.tabManagerState.ideStore as PureIDEStore,
            this,
          );
      }
    }

    // If first is empty leaf, return second
    if (this.first instanceof EditorSplitLeaf && this.first.isEmpty) {
      return this.second;
    }

    // If second is empty leaf, return first
    if (this.second instanceof EditorSplitLeaf && this.second.isEmpty) {
      return this.first;
    }

    return this;
  }
}

export class EditorSplitRootState {
  readonly ideStore: PureIDEStore;
  root: EditorSplitNode;
  activeLeaf?: EditorSplitLeaf | undefined;

  constructor(ideStore: PureIDEStore) {
    makeObservable(this, {
      root: observable,
      activeLeaf: observable,
      setRoot: action,
      setActiveLeaf: action,
      leaves: computed,
      currentTab: computed,
    });

    this.ideStore = ideStore;
    // Start with a single leaf
    this.root = new EditorSplitLeaf(ideStore);
    this.activeLeaf = this.root as EditorSplitLeaf;
  }

  get leaves(): EditorSplitLeaf[] {
    if (this.root instanceof EditorSplitLeaf) {
      return [this.root];
    }
    return (this.root as EditorSplitGroupState).leaves;
  }

  get currentTab(): PureIDETabState | undefined {
    return this.activeLeaf?.tabManagerState.currentTab;
  }

  get allTabs(): PureIDETabState[] {
    return this.leaves.flatMap((leaf) => leaf.tabManagerState.tabs);
  }

  setRoot(root: EditorSplitNode): void {
    this.root = root;
  }

  setActiveLeaf(leaf: EditorSplitLeaf): void {
    this.activeLeaf = leaf;
  }

  openTab(tab: PureIDETabState, targetLeaf?: EditorSplitLeaf): void {
    const leaf = targetLeaf ?? this.activeLeaf ?? this.leaves[0];
    if (leaf) {
      leaf.openTab(tab);
      this.setActiveLeaf(leaf);
    }
  }

  closeTab(tab: PureIDETabState): void {
    // Find the leaf containing this tab
    const leaf = this.leaves.find((l) => l.tabManagerState.tabs.includes(tab));
    if (leaf) {
      leaf.closeTab(tab);

      // Cleanup empty splits after closing tab
      if (this.root instanceof EditorSplitGroupState) {
        const cleanedRoot = this.root.cleanup();
        if (cleanedRoot && cleanedRoot !== this.root) {
          this.setRoot(cleanedRoot);

          // Update active leaf if it was removed
          if (!this.leaves.includes(this.activeLeaf as EditorSplitLeaf)) {
            const firstLeaf = this.leaves[0];
            if (firstLeaf) {
              this.setActiveLeaf(firstLeaf);
            }
          }
        }
      }
    }
  }

  splitLeaf(
    leaf: EditorSplitLeaf,
    orientation: EditorSplitOrientation,
  ): EditorSplitLeaf {
    const newLeaf = new EditorSplitLeaf(this.ideStore);

    if (this.root === leaf) {
      // If splitting the root leaf, create a new group as root
      this.setRoot(new EditorSplitGroupState(orientation, leaf, newLeaf));
    } else if (leaf.parent) {
      // Replace the leaf in its parent with a new group
      const newGroup = new EditorSplitGroupState(
        orientation,
        leaf,
        newLeaf,
        leaf.parent,
      );

      if (leaf.parent.first === leaf) {
        leaf.parent.setFirst(newGroup);
      } else {
        leaf.parent.setSecond(newGroup);
      }
    }

    return newLeaf;
  }

  splitActiveLeaf(
    orientation: EditorSplitOrientation,
  ): EditorSplitLeaf | undefined {
    if (!this.activeLeaf) {
      return undefined;
    }

    const newLeaf = this.splitLeaf(this.activeLeaf!, orientation);
    this.setActiveLeaf(newLeaf);
    return newLeaf;
  }

  moveTab(tab: PureIDETabState, targetLeaf: EditorSplitLeaf): void {
    const sourceLeaf = this.leaves.find((l) =>
      l.tabManagerState.tabs.includes(tab),
    );
    if (sourceLeaf && sourceLeaf !== targetLeaf) {
      sourceLeaf.moveTab(tab, targetLeaf);
      this.setActiveLeaf(targetLeaf);

      // Cleanup after move
      if (this.root instanceof EditorSplitGroupState) {
        const cleanedRoot = this.root.cleanup();
        if (cleanedRoot && cleanedRoot !== this.root) {
          this.setRoot(cleanedRoot);
        }
      }
    }
  }

  findLeafById(id: string): EditorSplitLeaf | undefined {
    return this.leaves.find((leaf) => leaf.id === id);
  }

  findTab<T extends PureIDETabState>(
    predicate: (tab: PureIDETabState) => tab is T,
  ): T | undefined {
    return this.allTabs.find(predicate);
  }

  closeAllTabs(): void {
    this.leaves.forEach((leaf) => {
      const tabs = [...leaf.tabManagerState.tabs];
      tabs.forEach((tab) => leaf.tabManagerState.closeTab(tab));
    });
  }

  canRemoveSplit(leaf: EditorSplitLeaf): boolean {
    // Can only remove a split if there are multiple leaves
    return this.leaves.length > 1;
  }

  hasSplits(): boolean {
    // Has splits if root is a group or there are multiple leaves
    return this.root instanceof EditorSplitGroupState || this.leaves.length > 1;
  }

  removeSplit(leaf: EditorSplitLeaf): void {
    if (!this.canRemoveSplit(leaf)) {
      return;
    }

    // Move all tabs from the leaf to be removed to the first available leaf
    const tabsToMove = [...leaf.tabManagerState.tabs];
    const targetLeaf = this.leaves.find((l) => l !== leaf);

    if (targetLeaf) {
      tabsToMove.forEach((tab) => {
        leaf.moveTab(tab, targetLeaf);
      });
    }

    // Remove the leaf from the tree structure
    if (leaf.parent) {
      const parent = leaf.parent;
      const sibling = parent.first === leaf ? parent.second : parent.first;

      if (parent.parent) {
        // Replace parent with sibling in grandparent
        if (parent.parent.first === parent) {
          parent.parent.setFirst(sibling);
        } else {
          parent.parent.setSecond(sibling);
        }
        // Update sibling's parent reference
        if (sibling instanceof EditorSplitLeaf) {
          (sibling as any).parent = parent.parent;
        } else if (sibling instanceof EditorSplitGroupState) {
          (sibling as any).parent = parent.parent;
        }
      } else {
        // Parent is root, replace root with sibling
        this.setRoot(sibling);
        // Update sibling's parent reference
        if (sibling instanceof EditorSplitLeaf) {
          (sibling as any).parent = undefined;
        } else if (sibling instanceof EditorSplitGroupState) {
          (sibling as any).parent = undefined;
        }
      }
    }

    // Update active leaf if the removed leaf was active
    if (this.activeLeaf === leaf) {
      const newActiveLeaf = targetLeaf ?? this.leaves[0];
      if (newActiveLeaf) {
        this.setActiveLeaf(newActiveLeaf);
      }
    }
  }

  unsplitAll(): void {
    if (!this.hasSplits()) {
      return;
    }

    // Collect all tabs from all leaves
    const allTabs = this.allTabs;

    // Create a single new leaf
    const singleLeaf = new EditorSplitLeaf(this.ideStore);

    // Move all tabs to the single leaf
    allTabs.forEach((tab) => {
      singleLeaf.openTab(tab);
    });

    // Replace root with the single leaf
    this.setRoot(singleLeaf);
    this.setActiveLeaf(singleLeaf);
  }
}
