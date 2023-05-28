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

import {
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import type { RawLambda } from '@finos/legend-graph';
import {
  ActionState,
  assertErrorThrown,
  assertNonNullable,
  type GeneratorFn,
} from '@finos/legend-shared';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import type { QueryBuilderState } from './QueryBuilderState.js';

export enum QueryBuilderDiffViewMode {
  JSON = 'JSON',
  GRAMMAR = 'Grammar',
}

export class QueryBuilderDiffViewState {
  readonly changeDetectionState: QueryBuilderChangeDetectionState;
  readonly initialQuery: RawLambda;
  readonly currentQuery: RawLambda;

  mode = QueryBuilderDiffViewMode.GRAMMAR;
  initialQueryGrammarText?: string | undefined;
  currentQueryGrammarText?: string | undefined;

  constructor(
    changeDetectionState: QueryBuilderChangeDetectionState,
    initialQuery: RawLambda,
    currentQuery: RawLambda,
  ) {
    makeObservable(this, {
      mode: observable,
      initialQueryGrammarText: observable,
      currentQueryGrammarText: observable,
      setMode: action,
      generateGrammarDiff: flow,
    });

    this.changeDetectionState = changeDetectionState;
    this.initialQuery = initialQuery;
    this.currentQuery = currentQuery;
  }

  setMode(val: QueryBuilderDiffViewMode): void {
    this.mode = val;
  }

  *generateGrammarDiff(): GeneratorFn<void> {
    try {
      this.initialQueryGrammarText =
        (yield this.changeDetectionState.querybuilderState.graphManagerState.graphManager.lambdaToPureCode(
          this.initialQuery,
          true,
        )) as string;
    } catch (error) {
      assertErrorThrown(error);
      this.initialQueryGrammarText =
        '/* Failed to transform grammar text, see JSON diff instead */';
    }
    try {
      this.currentQueryGrammarText =
        (yield this.changeDetectionState.querybuilderState.graphManagerState.graphManager.lambdaToPureCode(
          this.currentQuery,
          true,
        )) as string;
    } catch (error) {
      assertErrorThrown(error);
      this.currentQueryGrammarText =
        '/* Failed to transform grammar text, see JSON diff instead */';
    }
  }
}

export class QueryBuilderChangeDetectionState {
  readonly querybuilderState: QueryBuilderState;

  readonly initState = ActionState.create();

  querySnapshot?: RawLambda | undefined;
  hashCodeSnapshot?: string | undefined;
  diffViewState?: QueryBuilderDiffViewState | undefined;

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      diffViewState: observable,
      querySnapshot: observable,
      hashCodeSnapshot: observable,
      hasChanged: computed,
      initialize: action,
      showDiffViewPanel: action,
      hideDiffViewPanel: action,
    });

    this.querybuilderState = queryBuilderState;
  }

  showDiffViewPanel(): void {
    this.diffViewState = this.buildQueryBuilderDiffViewState();
  }

  buildQueryBuilderDiffViewState(): QueryBuilderDiffViewState {
    assertNonNullable(
      this.querySnapshot,
      `Can't show changes: change detection is not properly initialized`,
    );
    return new QueryBuilderDiffViewState(
      this,
      this.querySnapshot,
      this.querybuilderState.buildQuery(),
    );
  }

  hideDiffViewPanel(): void {
    this.diffViewState = undefined;
  }

  get hasChanged(): boolean {
    if (!this.initState.hasCompleted) {
      return false;
    }
    return this.querybuilderState.hashCode !== this.hashCodeSnapshot;
  }

  initialize(initialQuery: RawLambda): void {
    this.initState.inProgress();
    this.hashCodeSnapshot = this.querybuilderState.hashCode;
    this.querySnapshot = initialQuery;
    this.initState.complete();
  }

  alertUnsavedChanges(onProceed: () => void): void {
    if (this.hasChanged) {
      this.querybuilderState.applicationStore.alertService.setActionAlertInfo({
        message:
          'Unsaved changes will be lost if you continue. Do you still want to proceed?',
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Proceed',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler:
              this.querybuilderState.applicationStore.guardUnhandledError(
                async () => onProceed(),
              ),
          },
          {
            label: 'Abort',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    } else {
      onProceed();
    }
  }
}
