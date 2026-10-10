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
  IngestDatasetSource,
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
import {
  READ_ONLY_CUBE_TITLE,
  UNSERVED_SOURCE_KIND_TITLE,
} from '../__lib__/LegendCubeLabels.js';
import type { CubeEditorState } from './CubeEditorState.js';
import { CubeDataProductTabState } from './source-picker/CubeDataProductTabState.js';
import { CubeDirectConnectionTabState } from './source-picker/CubeDirectConnectionTabState.js';
import { CubeIngestTabState } from './source-picker/CubeIngestTabState.js';
import { CubeExamplesTabState } from './source-picker/CubeExamplesTabState.js';
import { CubeInlineModelTabState } from './source-picker/CubeInlineModelTabState.js';
import {
  type CubeSourcePickerTab,
  CubeSourcePickerTabKey,
} from './source-picker/CubeSourcePickerTab.js';

/**
 * The source dialog (PLAN §6.1, §6.8, §6.9): a tab per way to find a source,
 * the Model tab first, and the Examples tab last. It opens on the tab asked
 * for, or the one the cube's fixed context belongs to, which is then the
 * only source tab enabled (Examples, which opens a whole cube, stays
 * enabled); Add runs the open tab's Add and closes the dialog once the
 * source is added.
 */
export class CubeSourcePickerState {
  readonly editorState: CubeEditorState;
  readonly modelTab: CubeInlineModelTabState;
  readonly directTab: CubeDirectConnectionTabState;
  readonly dataProductTab: CubeDataProductTabState;
  readonly ingestTab: CubeIngestTabState;
  readonly examplesTab: CubeExamplesTabState;

  isOpen = false;
  activeTabKey = CubeSourcePickerTabKey.MODEL;

  constructor(editorState: CubeEditorState) {
    makeObservable(this, {
      isOpen: observable,
      activeTabKey: observable,
      tabs: computed,
      fixedTab: computed,
      activeTab: computed,
      disabledReason: computed,
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
    this.ingestTab = new CubeIngestTabState(editorState);
    this.examplesTab = new CubeExamplesTabState(editorState);
  }

  /** The tabs that add their own kind of source, each from its palette item */
  private get dedicatedTabs(): ReadonlyMap<string, CubeSourcePickerTab> {
    return new Map<string, CubeSourcePickerTab>([
      [DataProductAccessPointSource.TYPE, this.dataProductTab],
      [IngestDatasetSource.TYPE, this.ingestTab],
    ]);
  }

  /** The tabs the host serves, in order */
  get tabs(): readonly CubeSourcePickerTab[] {
    return [
      this.modelTab,
      this.directTab,
      this.dataProductTab,
      this.ingestTab,
      this.examplesTab,
    ].filter((tab) => tab.isAvailable);
  }

  /**
   * The tab the cube's fixed context belongs to, which the host may not
   * serve; the Model tab takes any context no tab claims
   */
  get fixedTab(): CubeSourcePickerTab | undefined {
    const { context } = this.editorState.document;
    return context
      ? ([this.directTab, this.dataProductTab, this.ingestTab].find((tab) =>
          tab.ownsContext(context),
        ) ?? this.modelTab)
      : undefined;
  }

  get activeTab(): CubeSourcePickerTab {
    return (
      this.tabs.find((tab) => tab.key === this.activeTabKey) ?? this.modelTab
    );
  }

  /**
   * The tab a palette item opens (DP-3): a data product's or an ingest data
   * set's own tab, when the host serves it; for a table, the table tab the
   * cube uses, else the table tab open last, else the Model tab
   */
  tabForSourceType(type: string): CubeSourcePickerTab | undefined {
    const dedicated = this.dedicatedTabs.get(type);
    if (dedicated) {
      return dedicated.isAvailable ? dedicated : undefined;
    }
    if (type !== RelationalTableSource.TYPE) {
      return undefined;
    }
    const dedicatedTabs = [...this.dedicatedTabs.values()];
    const tableTabs = this.tabs.filter(
      (tab) => !dedicatedTabs.includes(tab) && tab !== this.examplesTab,
    );
    const { fixedTab } = this;
    return fixedTab
      ? tableTabs.find((tab) => tab === fixedTab)
      : (tableTabs.find((tab) => tab === this.activeTab) ?? this.modelTab);
  }

  /**
   * A cube with a fixed context takes sources from its own tab only, and
   * none when the host doesn't serve that tab; examples, which replace the
   * cube, are always offered
   */
  isTabEnabled(tab: CubeSourcePickerTab): boolean {
    return (
      tab.isAvailable &&
      (this.fixedTab === undefined ||
        tab === this.fixedTab ||
        tab === this.examplesTab)
    );
  }

  /**
   * Why the dialog can't open, else undefined: the cube is read-only, or the
   * host doesn't serve the cube's kind of source, so no tab could add one
   */
  get disabledReason(): string | undefined {
    if (this.editorState.readOnly) {
      return READ_ONLY_CUBE_TITLE;
    }
    const { fixedTab } = this;
    return fixedTab && !fixedTab.isAvailable
      ? UNSERVED_SOURCE_KIND_TITLE
      : undefined;
  }

  get canConfirm(): boolean {
    return this.activeTab.canConfirm && this.isTabEnabled(this.activeTab);
  }

  /**
   * Opens the dialog on the tab asked for if it is enabled, else the cube's
   * own tab, else the one open last. Does nothing while it can't open
   * (`disabledReason`).
   */
  open(tabKey?: CubeSourcePickerTabKey): void {
    if (this.disabledReason !== undefined) {
      return;
    }
    const { fixedTab } = this;
    this.isOpen = true;
    const asked = this.tabs.find(
      (candidate) => candidate.key === tabKey && this.isTabEnabled(candidate),
    );
    const tab = asked ?? fixedTab ?? this.activeTab;
    this.activeTabKey = tab.key;
    tab.open();
  }

  /** Switches to an enabled tab; the tab left drops what it was waiting for */
  selectTab(tabKey: CubeSourcePickerTabKey): void {
    const tab = this.tabs.find((candidate) => candidate.key === tabKey);
    if (tab && this.isTabEnabled(tab) && tab !== this.activeTab) {
      this.activeTab.close();
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
    this.ingestTab.close();
    this.examplesTab.close();
  }

  /** Adds the open tab's source, then closes the dialog */
  *confirm(): GeneratorFn<void> {
    const tab = this.activeTab;
    if (!this.canConfirm) {
      return;
    }
    const added = (yield flowResult(tab.confirm())) as boolean;
    if (added) {
      // every tab drops what it was still waiting for
      this.close();
    }
  }
}
