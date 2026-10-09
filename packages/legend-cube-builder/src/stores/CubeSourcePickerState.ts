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
  DataProductAccessPointSource,
  RelationalTableSource,
} from '@finos/legend-cube';
import type { GeneratorFn } from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import type { CubeEditorState } from './CubeEditorState.js';
import { CubeDataProductTabState } from './source-picker/CubeDataProductTabState.js';
import { CubeDirectConnectionTabState } from './source-picker/CubeDirectConnectionTabState.js';
import { CubeInlineModelTabState } from './source-picker/CubeInlineModelTabState.js';
import {
  type CubeSourcePickerTab,
  CubeSourcePickerTabKey,
} from './source-picker/CubeSourcePickerTab.js';

/**
 * The source dialog (PLAN §6.1, §6.8): a tab per way to find a source, the
 * Model tab first. It opens on the tab asked for, or the one the cube's
 * fixed context belongs to, which is then the only tab enabled; Add runs the
 * open tab's Add and closes the dialog once the source is added.
 */
export class CubeSourcePickerState {
  readonly editorState: CubeEditorState;
  readonly modelTab: CubeInlineModelTabState;
  readonly directTab: CubeDirectConnectionTabState;
  readonly dataProductTab: CubeDataProductTabState;

  isOpen = false;
  activeTabKey = CubeSourcePickerTabKey.MODEL;

  constructor(editorState: CubeEditorState) {
    makeObservable(this, {
      isOpen: observable,
      activeTabKey: observable,
      tabs: computed,
      fixedTab: computed,
      activeTab: computed,
      canConfirm: computed,
      open: action,
      selectTab: action,
      close: action,
      confirm: flow,
    });
    this.editorState = editorState;
    this.modelTab = new CubeInlineModelTabState(editorState);
    this.directTab = new CubeDirectConnectionTabState(editorState);
    this.dataProductTab = new CubeDataProductTabState(editorState);
  }

  /** The tabs the host serves, in order */
  get tabs(): readonly CubeSourcePickerTab[] {
    return [this.modelTab, this.directTab, this.dataProductTab].filter(
      (tab) => tab.isAvailable,
    );
  }

  /** The tab the cube's fixed context belongs to; the Model tab takes any no other tab claims */
  get fixedTab(): CubeSourcePickerTab | undefined {
    const { context } = this.editorState.document;
    return context
      ? (this.tabs.find((tab) => tab.ownsContext(context)) ?? this.modelTab)
      : undefined;
  }

  get activeTab(): CubeSourcePickerTab {
    return (
      this.tabs.find((tab) => tab.key === this.activeTabKey) ?? this.modelTab
    );
  }

  /**
   * The tab a palette item opens (DP-3): a data product's for a data
   * product, otherwise the table tab the cube uses, else the table tab open
   * last, else the Model tab
   */
  tabForSourceType(type: string): CubeSourcePickerTab | undefined {
    if (type === DataProductAccessPointSource.TYPE) {
      return this.dataProductTab.isAvailable ? this.dataProductTab : undefined;
    }
    if (type !== RelationalTableSource.TYPE) {
      return undefined;
    }
    const tableTabs = this.tabs.filter((tab) => tab !== this.dataProductTab);
    const { fixedTab } = this;
    return fixedTab
      ? tableTabs.find((tab) => tab === fixedTab)
      : (tableTabs.find((tab) => tab === this.activeTab) ?? this.modelTab);
  }

  /** A cube with a fixed context takes sources from its own tab only */
  isTabEnabled(tab: CubeSourcePickerTab): boolean {
    return this.fixedTab === undefined || tab === this.fixedTab;
  }

  get canConfirm(): boolean {
    return this.activeTab.canConfirm && this.isTabEnabled(this.activeTab);
  }

  /**
   * Opens the dialog on the cube's own tab, else the tab asked for, else the
   * one open last. Does nothing while the cube is read-only.
   */
  open(tabKey?: CubeSourcePickerTabKey): void {
    if (this.editorState.readOnly) {
      return;
    }
    this.isOpen = true;
    const tab =
      this.fixedTab ??
      this.tabs.find((candidate) => candidate.key === tabKey) ??
      this.activeTab;
    this.activeTabKey = tab.key;
    tab.open();
  }

  /** Switches to an enabled tab */
  selectTab(tabKey: CubeSourcePickerTabKey): void {
    const tab = this.tabs.find((candidate) => candidate.key === tabKey);
    if (tab && this.isTabEnabled(tab) && tab !== this.activeTab) {
      this.activeTabKey = tab.key;
      tab.open();
    }
  }

  /** Closes the dialog; a source still being typed is not added */
  close(): void {
    this.isOpen = false;
    this.modelTab.close();
    this.directTab.close();
    this.dataProductTab.close();
  }

  /** Adds the open tab's source, then closes the dialog */
  *confirm(): GeneratorFn<void> {
    const tab = this.activeTab;
    if (!this.canConfirm) {
      return;
    }
    const added = (yield flowResult(tab.confirm())) as boolean;
    if (added) {
      this.isOpen = false;
    }
  }
}
