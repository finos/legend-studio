/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observable, action, flow, computed } from 'mobx';
import { executionClient } from 'API/ExecutionClient';
import { EditorStore } from 'Stores/EditorStore';
import { Entity } from 'SDLC/entity/Entity';
import { extractElementNameFromPath } from 'MetaModelUtility';
import { EntityDiffEditorState, SPECIAL_REVISION_ALIAS } from './EntityDiffEditorState';
import { guaranteeNonNullable, UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { mergeDiff3 } from 'node-diff3';
import { deserialize } from 'serializr';
import { JsonToGrammarInput } from 'EXEC/grammar/JsonToGrammarInput';
import { ParserError } from 'EXEC/ExecutionServerError';
import { EntityChangeConflictResolution } from 'SDLC/entity/EntityChangeConflict';
import { GrammarToJsonInput } from 'EXEC/grammar/GrammarToJsonInput';
import { graphModelDataToEntities, PackageableElementObject } from 'MM/AbstractPureGraphManager';

const START_HEADER_MARKER = '<<<<<<<';
const COMMON_BASE_MARKER = '|||||||';
const SPLITTER_MARKER = '=======';
const END_FOOTER_MARKER = '>>>>>>>';

interface PotentialMergeConflict {
  startHeader: number;
  commonBase?: number;
  splitter?: number;
  endFooter?: number;
}

export interface MergeConflict {
  startHeader: number;
  commonBase?: number;
  splitter: number;
  endFooter: number;
}

const scanMergeConflict = (text: string): MergeConflict[] => {
  const lines = text.split('\n');
  const conflicts: MergeConflict[] = [];
  let currentConflict: PotentialMergeConflict | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // ignore empty lines
    if (!line || !line.trim()) {
      continue;
    }

    // Is this a start line? <<<<<<<
    if (line.startsWith(START_HEADER_MARKER)) {
      if (currentConflict !== null) {
        // Error, we should not see a startMarker before we've seen an endMarker
        currentConflict = null;

        // Give up parsing, anything matched up this to this point will be decorated
        // anything after will not
        break;
      }

      // Create a new conflict starting at this line
      currentConflict = { startHeader: lineNumber };
    } else if (currentConflict && !currentConflict.splitter && line.startsWith(COMMON_BASE_MARKER)) {
      // Are we within a conflict block and is this a common ancestors marker? |||||||
      currentConflict.commonBase = lineNumber;
    } else if (currentConflict && !currentConflict.splitter && line.startsWith(SPLITTER_MARKER)) {
      // Are we within a conflict block and is this a splitter? =======
      currentConflict.splitter = lineNumber;
    } else if (currentConflict && line.startsWith(END_FOOTER_MARKER)) {
      // Are we within a conflict block and is this a footer? >>>>>>>
      currentConflict.endFooter = lineNumber;

      if (currentConflict.splitter !== undefined) {
        conflicts.push(currentConflict as MergeConflict);
      }

      // Reset the current conflict to be empty, so we can match the next
      // starting header marker.
      currentConflict = null;
    }
  }

  return conflicts;
};

export interface MergeEditorComparisonViewInfo {
  label: string;
  fromGrammarText?: string;
  toGrammarText?: string;
  fromRevision: SPECIAL_REVISION_ALIAS | string;
  toRevision: SPECIAL_REVISION_ALIAS | string;
}

export enum ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE {
  MERGE_VIEW = 'MERGE_VIEW',
  BASE_CURRENT = 'BASE_CURRENT',
  BASE_INCOMING = 'BASE_INCOMING',
  CURRENT_INCOMING = 'CURRENT_INCOMING',
}

export class EntityChangeConflictEditorState extends EntityDiffEditorState {
  @observable entityPath: string;
  // revision
  @observable baseRevision: SPECIAL_REVISION_ALIAS | string;
  @observable currentChangeRevision: SPECIAL_REVISION_ALIAS | string;
  @observable incomingChangeRevision: SPECIAL_REVISION_ALIAS | string;
  // entity
  @observable baseEntity?: Entity;
  @observable currentChangeEntity?: Entity;
  @observable incomingChangeEntity?: Entity;
  // grammar
  @observable baseGrammarText?: string;
  @observable currentChangeGrammarText?: string;
  @observable incomingChangeGrammarText?: string;
  // entity getter/updater function
  @observable baseEntityGetter?: (entityPath: string | undefined) => Entity | undefined;
  @observable currentChangeEntityGetter?: (entityPath: string | undefined) => Entity | undefined;
  @observable incomingChangeEntityGetter?: (entityPath: string | undefined) => Entity | undefined;
  // editor
  @observable mergedText?: string;
  @observable mergeSucceeded = true;
  @observable mergeConflicts: MergeConflict[] = [];
  @observable isReadOnly = false;
  @observable currentMergeEditorConflict?: MergeConflict;
  @observable currentMergeEditorLine?: number;
  @observable mergeEditorParserError?: ParserError;
  @observable currentMode = ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.MERGE_VIEW;

  constructor(
    editorStore: EditorStore, entityPath: string,
    baseRevision: SPECIAL_REVISION_ALIAS | string, currentChangeRevision: SPECIAL_REVISION_ALIAS | string, incomingChangeRevision: SPECIAL_REVISION_ALIAS | string,
    baseEntity: Entity | undefined, currentChangeEntity: Entity | undefined, incomingChangeEntity: Entity | undefined,
    baseEntityGetter?: (entityPath: string | undefined) => Entity | undefined, currentChangeEntityGetter?: (entityPath: string | undefined) => Entity | undefined, incomingChangeEntityGetter?: (entityPath: string | undefined) => Entity | undefined
  ) {
    super(editorStore);
    this.entityPath = entityPath;
    // revision
    this.baseRevision = baseRevision;
    this.currentChangeRevision = currentChangeRevision;
    this.incomingChangeRevision = incomingChangeRevision;
    // entity
    this.baseEntity = baseEntity;
    this.currentChangeEntity = currentChangeEntity;
    this.incomingChangeEntity = incomingChangeEntity;
    // entity getter/updater function
    this.baseEntityGetter = baseEntityGetter;
    this.currentChangeEntityGetter = currentChangeEntityGetter;
    this.incomingChangeEntityGetter = incomingChangeEntityGetter;
  }

  @action setReadOnly(val: boolean): void { this.isReadOnly = val }
  @action setMergedText(val: string): void { this.mergedText = val }
  @action setCurrentMode(mode: ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE): void { this.currentMode = mode }
  @action setCurrentMergeEditorLine(val: number | undefined): void { this.currentMergeEditorLine = val }
  @action setCurrentMergeEditorConflict(conflict: MergeConflict | undefined): void { this.currentMergeEditorConflict = conflict }
  @action clearMergeEditorError(): void { this.mergeEditorParserError = undefined }

  @action refreshMergeConflict(): void {
    if (this.mergedText !== undefined) {
      this.mergeConflicts = scanMergeConflict(this.mergedText);
    }
  }

  @computed get headerName(): string { return extractElementNameFromPath(this.entityPath) }
  @computed private get sortedMergedConflicts(): MergeConflict[] { return this.mergeConflicts.slice().sort((a, b) => a.startHeader - b.startHeader) }
  @computed get canUseTheirs(): boolean { return this.currentMode !== ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.BASE_CURRENT }
  @computed get canUseYours(): boolean { return this.currentMode !== ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.BASE_INCOMING }
  @computed get canMarkAsResolved(): boolean { return Boolean(!this.mergeConflicts.length && !this.mergeEditorParserError && this.currentMode === ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.MERGE_VIEW) }

  @computed get previousConflict(): MergeConflict | undefined {
    const currentLine = this.currentMergeEditorLine ?? 0;
    return this.sortedMergedConflicts.slice().reverse().find(conflict => conflict.endFooter && conflict.endFooter < currentLine);
  }

  @computed get nextConflict(): MergeConflict | undefined {
    const currentLine = this.currentMergeEditorLine ?? 0;
    return this.sortedMergedConflicts.find(conflict => conflict.startHeader > currentLine);
  }

  getModeComparisonViewInfo(mode: ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE): MergeEditorComparisonViewInfo {
    switch (mode) {
      case ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.MERGE_VIEW: return {
        label: 'Merged changes',
        fromRevision: this.currentChangeRevision,
        toRevision: this.incomingChangeRevision,
      };
      case ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.BASE_CURRENT: return {
        label: 'Your changes',
        fromGrammarText: this.baseGrammarText ?? '',
        toGrammarText: this.currentChangeGrammarText ?? '',
        fromRevision: this.baseRevision,
        toRevision: this.currentChangeRevision,
      };
      case ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.BASE_INCOMING: return {
        label: 'Their changes',
        fromGrammarText: this.baseGrammarText ?? '',
        toGrammarText: this.incomingChangeGrammarText ?? '',
        fromRevision: this.baseRevision,
        toRevision: this.incomingChangeRevision,
      };
      case ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.CURRENT_INCOMING: return {
        label: 'Both changes',
        fromGrammarText: this.currentChangeGrammarText ?? '',
        toGrammarText: this.incomingChangeGrammarText ?? '',
        fromRevision: this.currentChangeRevision,
        toRevision: this.incomingChangeRevision,
      };
      default: throw new UnsupportedOperationError();
    }
  }

  @action resetMergeEditorStateOnLeave(): void {
    this.clearMergeEditorError();
    this.currentMergeEditorLine = undefined;
    this.currentMergeEditorConflict = undefined;
  }

  refresh = flow(function* (this: EntityChangeConflictEditorState) {
    this.baseEntity = this.baseEntityGetter ? this.baseEntityGetter(this.entityPath) : this.baseEntity;
    this.currentChangeEntity = this.currentChangeEntityGetter ? this.currentChangeEntityGetter(this.entityPath) : this.currentChangeEntity;
    this.incomingChangeEntity = this.incomingChangeEntityGetter ? this.incomingChangeEntityGetter(this.entityPath) : this.incomingChangeEntity;
    if (this.isReadOnly || this.mergedText === undefined) {
      yield this.getMergedText();
    }
  })

  getMergedText = flow(function* (this: EntityChangeConflictEditorState) {
    this.baseGrammarText = (yield this.getGrammarForEntity(this.baseEntity)) as unknown as string;
    this.currentChangeGrammarText = (yield this.getGrammarForEntity(this.currentChangeEntity)) as unknown as string;
    this.incomingChangeGrammarText = (yield this.getGrammarForEntity(this.incomingChangeEntity)) as unknown as string;
    const result = mergeDiff3<string>(this.currentChangeGrammarText, this.baseGrammarText, this.incomingChangeGrammarText, { stringSeparator: '\n', label: { a: 'Your Change', o: 'BASE', b: 'Their Change' } });
    this.mergedText = result.result.join('\n');
    this.refreshMergeConflict();
    this.mergeSucceeded = !this.mergeConflicts.length;
  })

  private getGrammarForEntity = flow(function* (this: EntityChangeConflictEditorState, entity: Entity | undefined): Generator<Promise<unknown>, string, unknown> {
    if (entity) {
      const graphData = this.editorStore.sdlcState.editorStore.graphState.graphManager.buildModelDataFromEntities([entity]);
      const elementGrammar = (yield executionClient.transformJSONToGrammar({ modelDataContext: graphData })) as GrammarToJsonInput;
      return elementGrammar.code ?? '';
    }
    return '';
  });

  markAsResolved = flow(function* (this: EntityChangeConflictEditorState) {
    const parsingResult = (yield executionClient.transformGrammarToJSON({ code: this.mergedText ?? '' })) as unknown as JsonToGrammarInput;
    if (parsingResult.codeError) {
      this.mergeEditorParserError = deserialize(ParserError, parsingResult.codeError);
      this.editorStore.applicationStore.notifyWarning(`Can't mark conflict as resolved. Parsing error: ${this.mergeEditorParserError.message}`);
    } else {
      const graphData = guaranteeNonNullable(parsingResult.modelDataContext);
      const entities = graphModelDataToEntities(this.editorStore.graphState.graphManager, graphData);
      if (!entities.length) {
        this.editorStore.changeDetectionState.resolutions.push(new EntityChangeConflictResolution(this.entityPath, undefined));
      } else if (entities.length === 1) {
        const resolvedEntity = entities[0];
        // cleanup the source information since we are using this entity to compute diff
        resolvedEntity.content = this.editorStore.graphState.graphManager.pruneSourceInformation(resolvedEntity.content) as unknown as PackageableElementObject;
        this.editorStore.changeDetectionState.resolutions.push(new EntityChangeConflictResolution(this.entityPath, resolvedEntity));
      } else {
        this.editorStore.applicationStore.notifyWarning(`Can't mark conflict as resolved. More than one element found in parsed text`);
        return;
      }
    }
    yield this.onMarkAsResolved();
  });

  useCurrentChanges = flow(function* (this: EntityChangeConflictEditorState) {
    this.editorStore.changeDetectionState.resolutions.push(new EntityChangeConflictResolution(this.entityPath, this.currentChangeEntity));
    yield this.onMarkAsResolved();
  })

  useIncomingChanges = flow(function* (this: EntityChangeConflictEditorState) {
    this.editorStore.changeDetectionState.resolutions.push(new EntityChangeConflictResolution(this.entityPath, this.incomingChangeEntity));
    yield this.onMarkAsResolved();
  })

  @action acceptCurrentChange(conflict: MergeConflict): void {
    if (this.mergedText === undefined) { return }
    const lines = this.mergedText.split('\n');
    this.setMergedText(lines.slice(0, conflict.startHeader - 1)
      .concat(lines.slice(conflict.startHeader, (conflict.commonBase ?? conflict.splitter) - 1)) // current change
      .concat(lines.slice(conflict.endFooter, lines.length))
      .join('\n'));
    this.refreshMergeConflict();
  }

  @action acceptIncomingChange(conflict: MergeConflict): void {
    if (this.mergedText === undefined) { return }
    const lines = this.mergedText.split('\n');
    this.setMergedText(lines.slice(0, conflict.startHeader - 1)
      .concat(lines.slice(conflict.splitter, conflict.endFooter - 1)) // incoming change
      .concat(lines.slice(conflict.endFooter, lines.length))
      .join('\n'));
    this.refreshMergeConflict();
  }

  @action acceptBothChanges(conflict: MergeConflict): void {
    if (this.mergedText === undefined) { return }
    const lines = this.mergedText.split('\n');
    this.setMergedText(lines.slice(0, conflict.startHeader - 1)
      .concat(lines.slice(conflict.startHeader, (conflict.commonBase ?? conflict.splitter) - 1)) // current change
      .concat(lines.slice(conflict.splitter, conflict.endFooter - 1)) // incoming change
      .concat(lines.slice(conflict.endFooter, lines.length))
      .join('\n'));
    this.refreshMergeConflict();
  }

  @action rejectBothChanges(conflict: MergeConflict): void {
    if (this.mergedText === undefined) { return }
    const lines = this.mergedText.split('\n');
    this.setMergedText(lines.slice(0, conflict.startHeader - 1)
      .concat(conflict.commonBase ? lines.slice(conflict.commonBase, conflict.splitter - 1) : []) // base
      .concat(lines.slice(conflict.endFooter, lines.length))
      .join('\n'));
    this.refreshMergeConflict();
  }

  onMarkAsResolved = flow(function* (this: EntityChangeConflictEditorState) {
    // swap out the current conflict editor with a normal diff editor
    const resolvedChange = this.editorStore.conflictResolutionState.resolvedChanges.find(change => change.entityPath === this.entityPath);
    if (resolvedChange) {
      this.editorStore.conflictResolutionState.openConflictResolutionChange(resolvedChange);
    }
    this.editorStore.closeState(this);
    this.editorStore.conflictResolutionState.removeMergeEditorState(this);
    // check for remaining conflicts, if none left, prompt the users for the next action
    yield this.editorStore.conflictResolutionState.promptBuildGraphAfterAllConflictsResolved();
  })
}
