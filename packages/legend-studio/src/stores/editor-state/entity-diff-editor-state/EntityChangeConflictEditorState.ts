/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { observable, action, flow, computed, makeObservable } from 'mobx';
import type { EditorStore } from '../../EditorStore';
import type { Entity } from '../../../models/sdlc/models/entity/Entity';
import type { SPECIAL_REVISION_ALIAS } from './EntityDiffEditorState';
import { EntityDiffEditorState } from './EntityDiffEditorState';
import type { GeneratorFn } from '@finos/legend-studio-shared';
import { UnsupportedOperationError } from '@finos/legend-studio-shared';
import { mergeDiff3 } from 'node-diff3';
import { EntityChangeConflictResolution } from '../../../models/sdlc/models/entity/EntityChangeConflict';
import { ParserError } from '../../../models/metamodels/pure/action/EngineError';
import { extractEntityNameFromPath } from '../../../models/sdlc/SDLCUtils';

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
        // Give up parsing, anything matched up this to this point will be decorated
        // anything after will not
        break;
      }

      // Create a new conflict starting at this line
      currentConflict = { startHeader: lineNumber };
    } else if (
      currentConflict &&
      !currentConflict.splitter &&
      line.startsWith(COMMON_BASE_MARKER)
    ) {
      // Are we within a conflict block and is this a common ancestors marker? |||||||
      currentConflict.commonBase = lineNumber;
    } else if (
      currentConflict &&
      !currentConflict.splitter &&
      line.startsWith(SPLITTER_MARKER)
    ) {
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
  entityPath: string;
  // revision
  baseRevision: SPECIAL_REVISION_ALIAS | string;
  currentChangeRevision: SPECIAL_REVISION_ALIAS | string;
  incomingChangeRevision: SPECIAL_REVISION_ALIAS | string;
  // entity
  baseEntity?: Entity;
  currentChangeEntity?: Entity;
  incomingChangeEntity?: Entity;
  // grammar
  baseGrammarText?: string;
  currentChangeGrammarText?: string;
  incomingChangeGrammarText?: string;
  // entity getter/updater function
  baseEntityGetter?: (entityPath: string | undefined) => Entity | undefined;
  currentChangeEntityGetter?: (
    entityPath: string | undefined,
  ) => Entity | undefined;
  incomingChangeEntityGetter?: (
    entityPath: string | undefined,
  ) => Entity | undefined;
  // editor
  mergedText?: string;
  mergeSucceeded = true;
  mergeConflicts: MergeConflict[] = [];
  isReadOnly = false;
  currentMergeEditorConflict?: MergeConflict;
  currentMergeEditorLine?: number;
  mergeEditorParserError?: ParserError;
  currentMode = ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.MERGE_VIEW;

  constructor(
    editorStore: EditorStore,
    entityPath: string,
    baseRevision: SPECIAL_REVISION_ALIAS | string,
    currentChangeRevision: SPECIAL_REVISION_ALIAS | string,
    incomingChangeRevision: SPECIAL_REVISION_ALIAS | string,
    baseEntity: Entity | undefined,
    currentChangeEntity: Entity | undefined,
    incomingChangeEntity: Entity | undefined,
    baseEntityGetter?: (entityPath: string | undefined) => Entity | undefined,
    currentChangeEntityGetter?: (
      entityPath: string | undefined,
    ) => Entity | undefined,
    incomingChangeEntityGetter?: (
      entityPath: string | undefined,
    ) => Entity | undefined,
  ) {
    super(editorStore);

    makeObservable<EntityChangeConflictEditorState, 'sortedMergedConflicts'>(
      this,
      {
        entityPath: observable,
        baseRevision: observable,
        currentChangeRevision: observable,
        incomingChangeRevision: observable,
        baseEntity: observable.ref,
        currentChangeEntity: observable.ref,
        incomingChangeEntity: observable.ref,
        baseGrammarText: observable,
        currentChangeGrammarText: observable,
        incomingChangeGrammarText: observable,
        baseEntityGetter: observable,
        currentChangeEntityGetter: observable,
        incomingChangeEntityGetter: observable,
        mergedText: observable,
        mergeSucceeded: observable,
        mergeConflicts: observable,
        isReadOnly: observable,
        currentMergeEditorConflict: observable,
        currentMergeEditorLine: observable,
        mergeEditorParserError: observable,
        currentMode: observable,
        setReadOnly: action,
        setMergedText: action,
        setCurrentMode: action,
        setCurrentMergeEditorLine: action,
        setCurrentMergeEditorConflict: action,
        clearMergeEditorError: action,
        refreshMergeConflict: action,
        headerName: computed,
        sortedMergedConflicts: computed,
        canUseTheirs: computed,
        canUseYours: computed,
        canMarkAsResolved: computed,
        previousConflict: computed,
        nextConflict: computed,
        resetMergeEditorStateOnLeave: action,
        acceptCurrentChange: action,
        acceptIncomingChange: action,
        acceptBothChanges: action,
        rejectBothChanges: action,
      },
    );

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

  setReadOnly(val: boolean): void {
    this.isReadOnly = val;
  }
  setMergedText(val: string): void {
    this.mergedText = val;
  }
  setCurrentMode(mode: ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE): void {
    this.currentMode = mode;
  }
  setCurrentMergeEditorLine(val: number | undefined): void {
    this.currentMergeEditorLine = val;
  }
  setCurrentMergeEditorConflict(conflict: MergeConflict | undefined): void {
    this.currentMergeEditorConflict = conflict;
  }
  clearMergeEditorError(): void {
    this.mergeEditorParserError = undefined;
  }

  refreshMergeConflict(): void {
    if (this.mergedText !== undefined) {
      this.mergeConflicts = scanMergeConflict(this.mergedText);
    }
  }

  get headerName(): string {
    return extractEntityNameFromPath(this.entityPath);
  }
  private get sortedMergedConflicts(): MergeConflict[] {
    return this.mergeConflicts
      .slice()
      .sort((a, b) => a.startHeader - b.startHeader);
  }
  get canUseTheirs(): boolean {
    return (
      this.currentMode !== ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.BASE_CURRENT
    );
  }
  get canUseYours(): boolean {
    return (
      this.currentMode !== ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.BASE_INCOMING
    );
  }
  get canMarkAsResolved(): boolean {
    return Boolean(
      !this.mergeConflicts.length &&
        !this.mergeEditorParserError &&
        this.currentMode === ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.MERGE_VIEW,
    );
  }

  get previousConflict(): MergeConflict | undefined {
    const currentLine = this.currentMergeEditorLine ?? 0;
    return this.sortedMergedConflicts
      .slice()
      .reverse()
      .find(
        (conflict) => conflict.endFooter && conflict.endFooter < currentLine,
      );
  }

  get nextConflict(): MergeConflict | undefined {
    const currentLine = this.currentMergeEditorLine ?? 0;
    return this.sortedMergedConflicts.find(
      (conflict) => conflict.startHeader > currentLine,
    );
  }

  getModeComparisonViewInfo(
    mode: ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE,
  ): MergeEditorComparisonViewInfo {
    switch (mode) {
      case ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.MERGE_VIEW:
        return {
          label: 'Merged changes',
          fromRevision: this.currentChangeRevision,
          toRevision: this.incomingChangeRevision,
        };
      case ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.BASE_CURRENT:
        return {
          label: 'Your changes',
          fromGrammarText: this.baseGrammarText ?? '',
          toGrammarText: this.currentChangeGrammarText ?? '',
          fromRevision: this.baseRevision,
          toRevision: this.currentChangeRevision,
        };
      case ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.BASE_INCOMING:
        return {
          label: 'Their changes',
          fromGrammarText: this.baseGrammarText ?? '',
          toGrammarText: this.incomingChangeGrammarText ?? '',
          fromRevision: this.baseRevision,
          toRevision: this.incomingChangeRevision,
        };
      case ENTITY_CHANGE_CONFLICT_EDITOR_VIEW_MODE.CURRENT_INCOMING:
        return {
          label: 'Both changes',
          fromGrammarText: this.currentChangeGrammarText ?? '',
          toGrammarText: this.incomingChangeGrammarText ?? '',
          fromRevision: this.currentChangeRevision,
          toRevision: this.incomingChangeRevision,
        };
      default:
        throw new UnsupportedOperationError();
    }
  }

  resetMergeEditorStateOnLeave(): void {
    this.clearMergeEditorError();
    this.currentMergeEditorLine = undefined;
    this.currentMergeEditorConflict = undefined;
  }

  refresh = flow(function* (this: EntityChangeConflictEditorState) {
    this.baseEntity = this.baseEntityGetter
      ? this.baseEntityGetter(this.entityPath)
      : this.baseEntity;
    this.currentChangeEntity = this.currentChangeEntityGetter
      ? this.currentChangeEntityGetter(this.entityPath)
      : this.currentChangeEntity;
    this.incomingChangeEntity = this.incomingChangeEntityGetter
      ? this.incomingChangeEntityGetter(this.entityPath)
      : this.incomingChangeEntity;
    if (this.isReadOnly || this.mergedText === undefined) {
      yield this.getMergedText();
    }
  });

  getMergedText = flow(function* (this: EntityChangeConflictEditorState) {
    this.baseGrammarText = (yield this.getGrammarForEntity(
      this.baseEntity,
    )) as string;
    this.currentChangeGrammarText = (yield this.getGrammarForEntity(
      this.currentChangeEntity,
    )) as string;
    this.incomingChangeGrammarText = (yield this.getGrammarForEntity(
      this.incomingChangeEntity,
    )) as string;
    const result = mergeDiff3<string>(
      this.currentChangeGrammarText,
      this.baseGrammarText,
      this.incomingChangeGrammarText,
      {
        stringSeparator: '\n',
        label: { a: 'Your Change', o: 'BASE', b: 'Their Change' },
      },
    );
    this.mergedText = result.result.join('\n');
    this.refreshMergeConflict();
    this.mergeSucceeded = !this.mergeConflicts.length;
  });

  private getGrammarForEntity = flow(function* (
    this: EntityChangeConflictEditorState,
    entity: Entity | undefined,
  ): GeneratorFn<string> {
    if (entity) {
      const elementGrammar =
        (yield this.editorStore.graphState.graphManager.entitiesToPureCode([
          entity,
        ])) as string;
      return elementGrammar;
    }
    return '';
  });

  markAsResolved = flow(function* (this: EntityChangeConflictEditorState) {
    try {
      const entities =
        (yield this.editorStore.graphState.graphManager.pureCodeToEntities(
          this.mergedText ?? '',
        )) as Entity[];
      if (!entities.length) {
        this.editorStore.changeDetectionState.resolutions.push(
          new EntityChangeConflictResolution(this.entityPath, undefined),
        );
      } else if (entities.length === 1) {
        const resolvedEntity = entities[0];
        // cleanup the source information since we are using this entity to compute diff
        resolvedEntity.content =
          this.editorStore.graphState.graphManager.pruneSourceInformation(
            resolvedEntity.content as object,
          );
        this.editorStore.changeDetectionState.resolutions.push(
          new EntityChangeConflictResolution(this.entityPath, resolvedEntity),
        );
      } else {
        this.editorStore.applicationStore.notifyWarning(
          `Can't mark conflict as resolved. More than one element found in parsed text`,
        );
        return;
      }
    } catch (error: unknown) {
      if (error instanceof ParserError) {
        this.mergeEditorParserError = error;
        this.editorStore.applicationStore.notifyWarning(
          `Can't mark conflict as resolved. Parsing error: ${this.mergeEditorParserError.message}`,
        );
      }
    }
    yield this.onMarkAsResolved();
  });

  useCurrentChanges = flow(function* (this: EntityChangeConflictEditorState) {
    this.editorStore.changeDetectionState.resolutions.push(
      new EntityChangeConflictResolution(
        this.entityPath,
        this.currentChangeEntity,
      ),
    );
    yield this.onMarkAsResolved();
  });

  useIncomingChanges = flow(function* (this: EntityChangeConflictEditorState) {
    this.editorStore.changeDetectionState.resolutions.push(
      new EntityChangeConflictResolution(
        this.entityPath,
        this.incomingChangeEntity,
      ),
    );
    yield this.onMarkAsResolved();
  });

  acceptCurrentChange(conflict: MergeConflict): void {
    if (this.mergedText === undefined) {
      return;
    }
    const lines = this.mergedText.split('\n');
    this.setMergedText(
      lines
        .slice(0, conflict.startHeader - 1)
        .concat(
          lines.slice(
            conflict.startHeader,
            (conflict.commonBase ?? conflict.splitter) - 1,
          ),
        ) // current change
        .concat(lines.slice(conflict.endFooter, lines.length))
        .join('\n'),
    );
    this.refreshMergeConflict();
  }

  acceptIncomingChange(conflict: MergeConflict): void {
    if (this.mergedText === undefined) {
      return;
    }
    const lines = this.mergedText.split('\n');
    this.setMergedText(
      lines
        .slice(0, conflict.startHeader - 1)
        .concat(lines.slice(conflict.splitter, conflict.endFooter - 1)) // incoming change
        .concat(lines.slice(conflict.endFooter, lines.length))
        .join('\n'),
    );
    this.refreshMergeConflict();
  }

  acceptBothChanges(conflict: MergeConflict): void {
    if (this.mergedText === undefined) {
      return;
    }
    const lines = this.mergedText.split('\n');
    this.setMergedText(
      lines
        .slice(0, conflict.startHeader - 1)
        .concat(
          lines.slice(
            conflict.startHeader,
            (conflict.commonBase ?? conflict.splitter) - 1,
          ),
        ) // current change
        .concat(lines.slice(conflict.splitter, conflict.endFooter - 1)) // incoming change
        .concat(lines.slice(conflict.endFooter, lines.length))
        .join('\n'),
    );
    this.refreshMergeConflict();
  }

  rejectBothChanges(conflict: MergeConflict): void {
    if (this.mergedText === undefined) {
      return;
    }
    const lines = this.mergedText.split('\n');
    this.setMergedText(
      lines
        .slice(0, conflict.startHeader - 1)
        .concat(
          conflict.commonBase
            ? lines.slice(conflict.commonBase, conflict.splitter - 1)
            : [],
        ) // base
        .concat(lines.slice(conflict.endFooter, lines.length))
        .join('\n'),
    );
    this.refreshMergeConflict();
  }

  onMarkAsResolved = flow(function* (this: EntityChangeConflictEditorState) {
    // swap out the current conflict editor with a normal diff editor
    const resolvedChange =
      this.editorStore.conflictResolutionState.resolvedChanges.find(
        (change) => change.entityPath === this.entityPath,
      );
    if (resolvedChange) {
      this.editorStore.conflictResolutionState.openConflictResolutionChange(
        resolvedChange,
      );
    }
    this.editorStore.closeState(this);
    this.editorStore.conflictResolutionState.removeMergeEditorState(this);
    // check for remaining conflicts, if none left, prompt the users for the next action
    yield this.editorStore.conflictResolutionState.promptBuildGraphAfterAllConflictsResolved();
  });
}
