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
  FunctionSource,
  IngestDatasetSource,
  RelationalTableSource,
  ServiceSource,
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
import {
  CubeProjectFunctionTabState,
  CubeProjectTabState,
} from './source-picker/CubeProjectTabState.js';
import {
  CubeInlineModelTabState,
  CubeModelReadKind,
} from './source-picker/CubeInlineModelTabState.js';
import { CubeServiceTabState } from './source-picker/CubeServiceTabState.js';
import {
  type CubeSourcePickerTab,
  CubeSourcePickerTabKey,
} from './source-picker/CubeSourcePickerTab.js';

/**
 * The source dialog (PLAN §6.1, §6.8): a tab per way to find a source, the
 * Sample Data tab first. It opens on the tab asked for, or the one the cube's
 * fixed context belongs to, which is then the only tab enabled; Add runs the
 * open tab's Add and closes the dialog once the source is added.
 */
export class CubeSourcePickerState {
  readonly editorState: CubeEditorState;
  readonly modelTab: CubeInlineModelTabState;
  readonly directTab: CubeDirectConnectionTabState;
  readonly dataProductTab: CubeDataProductTabState;
  readonly ingestTab: CubeIngestTabState;
  readonly projectTab: CubeProjectTabState;
  readonly projectFunctionTab: CubeProjectFunctionTabState;
  readonly serviceTab: CubeServiceTabState;

  isOpen = false;
  activeTabKey = CubeSourcePickerTabKey.MODEL;
  /** Open with no tab chosen yet, from the empty canvas's link (U4(b)) */
  isChoosingTab = false;
  /** Opened from the Examples dialog's dataset, so it offers a way back to it */
  isFromExamples = false;

  constructor(editorState: CubeEditorState) {
    makeObservable(this, {
      isOpen: observable,
      activeTabKey: observable,
      isChoosingTab: observable,
      isFromExamples: observable,
      tabs: computed,
      fixedTab: computed,
      activeTab: computed,
      disabledReason: computed,
      canConfirm: computed,
      open: action,
      openToChoose: action,
      openForSourceType: action,
      openFromExamples: action,
      backToExamples: action,
      selectTab: action,
      close: action,
      confirm: flow,
    });
    this.editorState = editorState;
    this.modelTab = new CubeInlineModelTabState(editorState);
    this.directTab = new CubeDirectConnectionTabState(editorState);
    this.dataProductTab = new CubeDataProductTabState(editorState);
    this.ingestTab = new CubeIngestTabState(editorState);
    this.projectTab = new CubeProjectTabState(editorState);
    this.projectFunctionTab = new CubeProjectFunctionTabState(editorState);
    this.serviceTab = new CubeServiceTabState(editorState);
  }

  /** The tabs that add their own kind of source, each from its palette item */
  private get dedicatedTabs(): ReadonlyMap<string, CubeSourcePickerTab> {
    return new Map<string, CubeSourcePickerTab>([
      [DataProductAccessPointSource.TYPE, this.dataProductTab],
      [IngestDatasetSource.TYPE, this.ingestTab],
      [ServiceSource.TYPE, this.serviceTab],
    ]);
  }

  /** The tabs the host serves, in order */
  get tabs(): readonly CubeSourcePickerTab[] {
    return [
      this.modelTab,
      this.projectTab,
      this.projectFunctionTab,
      this.directTab,
      this.dataProductTab,
      this.ingestTab,
      this.serviceTab,
    ].filter((tab) => tab.isAvailable);
  }

  /**
   * The tab the cube's fixed context belongs to, which the host may not
   * serve; the Sample Data tab takes any context no tab claims
   */
  get fixedTab(): CubeSourcePickerTab | undefined {
    const { context } = this.editorState.document;
    return context
      ? ([
          this.projectTab,
          this.projectFunctionTab,
          this.directTab,
          this.dataProductTab,
          this.ingestTab,
          this.serviceTab,
        ].find((tab) => tab.ownsContext(context)) ?? this.modelTab)
      : undefined;
  }

  get activeTab(): CubeSourcePickerTab {
    return (
      this.tabs.find((tab) => tab.key === this.activeTabKey) ?? this.modelTab
    );
  }

  /**
   * The tab a palette item opens (DP-3): a data product's, an ingest data
   * set's or a service's own tab, when the host serves it; for a table, the table tab the
   * cube uses, else the table tab open last, else the Sample Data tab
   */
  tabForSourceType(type: string): CubeSourcePickerTab | undefined {
    const dedicated = this.dedicatedTabs.get(type);
    if (dedicated) {
      return dedicated.isAvailable ? dedicated : undefined;
    }
    if (type !== RelationalTableSource.TYPE && type !== FunctionSource.TYPE) {
      return undefined;
    }
    const dedicatedTabs = [...this.dedicatedTabs.values()];
    // a table comes from a model or a connection, a function from a model:
    // a project's tables and functions each have their own tab
    const readers = this.tabs.filter((tab) =>
      type === FunctionSource.TYPE
        ? tab instanceof CubeInlineModelTabState &&
          tab.readKinds.includes(CubeModelReadKind.FUNCTION)
        : !dedicatedTabs.includes(tab) &&
          (!(tab instanceof CubeInlineModelTabState) ||
            tab.readKinds.includes(CubeModelReadKind.TABLE)),
    );
    return this.fixedTab
      ? readers.find((tab) => this.isTabEnabled(tab))
      : (readers.find((tab) => tab === this.activeTab) ?? readers[0]);
  }

  /**
   * Opens the dialog on the tab a palette item's type opens; a model's tab
   * reads tables or functions as the item asks
   */
  openForSourceType(type: string): void {
    const tab = this.tabForSourceType(type);
    if (tab instanceof CubeInlineModelTabState) {
      tab.setReadKind(
        type === FunctionSource.TYPE
          ? CubeModelReadKind.FUNCTION
          : CubeModelReadKind.TABLE,
      );
    }
    this.open(tab?.key);
  }

  /**
   * A cube with a fixed context takes sources from its own tab only, and
   * none when the host doesn't serve that tab; a project cube from both of
   * its tabs, Project Database and Project Function (PLAN §6.5)
   */
  isTabEnabled(tab: CubeSourcePickerTab): boolean {
    const { fixedTab } = this;
    const { context } = this.editorState.document;
    return (
      tab.isAvailable &&
      (fixedTab === undefined ||
        tab === fixedTab ||
        // a project cube's tables and functions, each from its tab
        (context !== undefined &&
          tab !== this.modelTab &&
          tab.ownsContext(context)))
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
    return (
      !this.isChoosingTab &&
      this.activeTab.canConfirm &&
      this.isTabEnabled(this.activeTab)
    );
  }

  /**
   * Opens the dialog on the cube's own tab, else the tab asked for, else the
   * one open last. Does nothing while it can't open (`disabledReason`).
   */
  open(tabKey?: CubeSourcePickerTabKey): void {
    if (this.disabledReason !== undefined) {
      return;
    }
    const { fixedTab } = this;
    this.isOpen = true;
    this.isChoosingTab = false;
    this.isFromExamples = false;
    const tab =
      fixedTab ??
      this.tabs.find((candidate) => candidate.key === tabKey) ??
      this.activeTab;
    this.activeTabKey = tab.key;
    tab.open();
  }

  /**
   * Opens the dialog with no tab chosen, showing the prompt to choose one
   * (U4(b)); a cube with a fixed context, or a host serving one tab, opens
   * on it as `open` does
   */
  openToChoose(): void {
    if (this.fixedTab !== undefined || this.tabs.length <= 1) {
      this.open();
    } else if (this.disabledReason === undefined) {
      this.isOpen = true;
      this.isChoosingTab = true;
    }
  }

  /** Switches to an enabled tab; the tab left drops what it was waiting for */
  selectTab(tabKey: CubeSourcePickerTabKey): void {
    const tab = this.tabs.find((candidate) => candidate.key === tabKey);
    if (
      tab &&
      this.isTabEnabled(tab) &&
      (this.isChoosingTab || tab !== this.activeTab)
    ) {
      if (!this.isChoosingTab) {
        this.activeTab.close();
      }
      this.isChoosingTab = false;
      this.activeTabKey = tab.key;
      tab.open();
    }
  }

  /** Opens on a tab, as `open` does, offering a way back to the Examples dialog */
  openFromExamples(tabKey: CubeSourcePickerTabKey): void {
    this.open(tabKey);
    this.isFromExamples = this.isOpen;
  }

  /** Closes the dialog and reopens the Examples dialog it came from */
  backToExamples(): void {
    this.close();
    this.editorState.examples.open();
  }

  /** Closes the dialog; a source still being typed is not added */
  close(): void {
    this.isOpen = false;
    this.isFromExamples = false;
    this.isChoosingTab = false;
    this.modelTab.close();
    this.directTab.close();
    this.dataProductTab.close();
    this.ingestTab.close();
    this.projectTab.close();
    this.projectFunctionTab.close();
    this.serviceTab.close();
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
