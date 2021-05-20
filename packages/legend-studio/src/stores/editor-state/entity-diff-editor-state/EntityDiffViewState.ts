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
import { CORE_LOG_EVENT } from '../../../utils/Logger';
import {
  assertNonNullable,
  guaranteeNonNullable,
  hashObject,
} from '@finos/legend-studio-shared';
import type { EditorStore } from '../../EditorStore';
import type { Entity } from '../../../models/sdlc/models/entity/Entity';
import type { SPECIAL_REVISION_ALIAS } from './EntityDiffEditorState';
import { EntityDiffEditorState } from './EntityDiffEditorState';
import type { PackageableElement } from '../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import { extractEntityNameFromPath } from '../../../models/sdlc/SDLCUtils';

/**
 * NOTE: when we support comparison between entities, we should create a new editor state
 * as there are no benefits in trying to make this current one also work with comparison
 * There are many differences, such as the concept of from and to revision makes no sense,
 * the header text is different, etc.
 */

export enum DIFF_VIEW_MODE {
  JSON = 'JSON',
  GRAMMAR = 'Grammar',
}

export class EntityDiffViewState extends EntityDiffEditorState {
  diffMode = DIFF_VIEW_MODE.GRAMMAR;
  fromEntityPath?: string;
  toEntityPath?: string;
  fromRevision: SPECIAL_REVISION_ALIAS | string;
  toRevision: SPECIAL_REVISION_ALIAS | string;
  // to and from entities
  fromEntity?: Entity;
  toEntity?: Entity;
  fromGrammarText?: string;
  toGrammarText?: string;
  // functions to get to and from entities
  fromEntityGetter?: (entityPath: string | undefined) => Entity | undefined;
  toEntityGetter?: (entityPath: string | undefined) => Entity | undefined;

  constructor(
    editorStore: EditorStore,
    fromRevision: SPECIAL_REVISION_ALIAS | string,
    toRevision: SPECIAL_REVISION_ALIAS | string,
    fromEntityPath: string | undefined,
    toEntityPath: string | undefined,
    fromEntity: Entity | undefined,
    toEntity: Entity | undefined,
    fromEntityGetter?: (entityPath: string | undefined) => Entity | undefined,
    toEntityGetter?: (entityPath: string | undefined) => Entity | undefined,
  ) {
    super(editorStore);

    makeObservable<
      EntityDiffViewState,
      'setToGrammarText' | 'setFromGrammarText'
    >(this, {
      diffMode: observable,
      fromEntityPath: observable,
      toEntityPath: observable,
      fromRevision: observable,
      toRevision: observable,
      fromEntity: observable.ref,
      toEntity: observable.ref,
      fromGrammarText: observable,
      toGrammarText: observable,
      fromEntityGetter: observable,
      toEntityGetter: observable,
      effectiveEntityPath: computed,
      element: computed,
      headerName: computed,
      headerTooltip: computed,
      summaryText: computed,
      setDiffMode: action,
      setToGrammarText: action,
      setFromGrammarText: action,
      refresh: action,
    });

    this.fromEntityPath = fromEntityPath;
    this.toEntityPath = toEntityPath;
    assertNonNullable(this.effectiveEntityPath);
    this.fromEntity = fromEntity;
    this.toEntity = toEntity;
    this.fromRevision = fromRevision;
    this.toRevision = toRevision;
    this.fromEntityGetter = fromEntityGetter;
    this.toEntityGetter = toEntityGetter;
  }

  /**
   * The idea behind effective is that an entity diff state was constructed, one of `toEntityPath` and `fromEntityPath` can be undefined
   * when the diff is a delete or create. But we can always guarantee that at least one exist and thus `effectiveEntityPath` is that guaranteed to exist path.
   * It serves 2 main purposes:
   * 1. For display
   * 2. For refreshing diff: for example, when we sync workspace change, a delete is updated and if we continue to use the
   *    `toEntityPath` the diff will be shown as a delete still, but we don't want this, we want both panels to have the same content
   *
   * As for which path to take precedence, it is more suitable to take `toEntityPath` because it reflects what currently presents in the project
   * and what the UI should show all the time in the display
   * e.g. it does not make sense to show the old path for a create element diff.
   */
  get effectiveEntityPath(): string {
    return guaranteeNonNullable(
      this.toEntityPath ?? this.fromEntityPath,
      'Neither from nor to entity paths can be missing',
    );
  }
  get element(): PackageableElement | undefined {
    return this.editorStore.graphState.graph.getNullableElement(
      this.effectiveEntityPath,
    );
  }
  get headerName(): string {
    return extractEntityNameFromPath(this.effectiveEntityPath);
  }
  get headerTooltip(): string {
    return this.effectiveEntityPath;
  }

  get summaryText(): string {
    // NOTE: we don't support rename at the moment
    if (!this.fromEntity && !this.toEntity) {
      return 'Nothing to compare. Neither entity contents is available';
    } else if (!this.fromEntity) {
      return `Entity '${this.toEntityPath}' is created`;
    } else if (!this.toEntity) {
      return `Entity '${this.fromEntityPath}' is deleted`;
    } else if (
      hashObject(this.fromEntity.content) === hashObject(this.toEntity.content)
    ) {
      return 'Entity contents are identical';
    }
    return `Entity '${this.toEntityPath}' is modified`;
  }

  setDiffMode = (diffMode: DIFF_VIEW_MODE): void => {
    this.diffMode = diffMode;
  };
  private setToGrammarText = (text: string): void => {
    this.toGrammarText = text;
  };
  private setFromGrammarText = (text: string): void => {
    this.fromGrammarText = text;
  };

  refresh(): void {
    this.fromEntity = this.fromEntityGetter
      ? this.fromEntityGetter(this.effectiveEntityPath)
      : this.fromEntity;
    this.toEntity = this.toEntityGetter
      ? this.toEntityGetter(this.effectiveEntityPath)
      : this.toEntity;
  }

  getFromGrammar = flow(function* (this: EntityDiffViewState) {
    if (this.fromEntity) {
      try {
        const elementGrammar =
          (yield this.editorStore.graphState.graphManager.entitiesToPureCode([
            this.fromEntity,
          ])) as string;
        this.setFromGrammarText(elementGrammar);
      } catch (error: unknown) {
        this.setFromGrammarText(
          '/* Failed to transform grammar text, see JSON diff instead */',
        );
        this.editorStore.applicationStore.logger.error(
          CORE_LOG_EVENT.SDLC_PROBLEM,
          error,
        );
      }
    } else {
      this.setFromGrammarText('');
    }
  });

  getToGrammar = flow(function* (this: EntityDiffViewState) {
    if (this.toEntity) {
      try {
        const elementGrammar =
          (yield this.editorStore.graphState.graphManager.entitiesToPureCode([
            this.toEntity,
          ])) as string;
        this.setToGrammarText(elementGrammar);
      } catch (error: unknown) {
        this.setFromGrammarText(
          '/* Failed to transform grammar text, see JSON diff instead */',
        );
        this.editorStore.applicationStore.logger.error(
          CORE_LOG_EVENT.SDLC_PROBLEM,
          error,
        );
      }
    } else {
      this.setToGrammarText('');
    }
  });
}
