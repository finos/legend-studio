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
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { assertNonNullable, guaranteeNonNullable } from 'Utilities/GeneralUtil';
import { GrammarToJsonInput } from 'EXEC/grammar/GrammarToJsonInput';
import { executionClient } from 'API/ExecutionClient';
import { EditorStore } from 'Stores/EditorStore';
import { Entity } from 'SDLC/entity/Entity';
import { extractElementNameFromPath } from 'MetaModelUtility';
import { hashObject } from 'Utilities/HashUtil';
import { EntityDiffEditorState, SPECIAL_REVISION_ALIAS } from './EntityDiffEditorState';
import { PackageableElement } from 'MM/model/packageableElements/PackageableElement';

/**
 * NOTE: when we support comparison between entities, we should create a new editor state
 * as there are no benefits in trying to make this current one also work with comparison
 * There are many differences, such as the concept of from and to revision makes no sense,
 * the header text is different, etc.
 */

export enum DIFF_VIEW_MODE {
  JSON = 'JSON',
  GRAMMAR = 'Grammar'
}

export class EntityDiffViewState extends EntityDiffEditorState {
  @observable diffMode = DIFF_VIEW_MODE.GRAMMAR;
  @observable fromEntityPath?: string;
  @observable toEntityPath?: string;
  @observable fromRevision: SPECIAL_REVISION_ALIAS | string;
  @observable toRevision: SPECIAL_REVISION_ALIAS | string;
  // to and from entities
  @observable fromEntity?: Entity;
  @observable toEntity?: Entity;
  @observable fromGrammarText?: string;
  @observable toGrammarText?: string;
  // functions to get to and from entities
  @observable fromEntityGetter?: (entityPath: string | undefined) => Entity | undefined;
  @observable toEntityGetter?: (entityPath: string | undefined) => Entity | undefined;

  constructor(
    editorStore: EditorStore, fromRevision: SPECIAL_REVISION_ALIAS | string, toRevision: SPECIAL_REVISION_ALIAS | string,
    fromEntityPath: string | undefined, toEntityPath: string | undefined,
    fromEntity: Entity | undefined, toEntity: Entity | undefined,
    fromEntityGetter?: (entityPath: string | undefined) => Entity | undefined, toEntityGetter?: (entityPath: string | undefined) => Entity | undefined
  ) {
    super(editorStore);
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
  @computed get effectiveEntityPath(): string { return guaranteeNonNullable(this.toEntityPath ?? this.fromEntityPath, 'Neither from nor to entity paths can be missing') }
  @computed get element(): PackageableElement | undefined { return this.editorStore.graphState.graph.getNullableElement(this.effectiveEntityPath) }
  @computed get headerName(): string { return extractElementNameFromPath(this.effectiveEntityPath) }
  @computed get headerTooltip(): string { return this.effectiveEntityPath }

  @computed get summaryText(): string {
    // NOTE: we don't support rename at the moment
    if (!this.fromEntity && !this.toEntity) {
      return 'Nothing to compare. Neither entity contents is available';
    } else if (!this.fromEntity) {
      return `Entity '${this.toEntityPath}' is created`;
    } else if (!this.toEntity) {
      return `Entity '${this.fromEntityPath}' is deleted`;
    } else if (hashObject(this.fromEntity.content) === hashObject(this.toEntity.content)) {
      return 'Entity contents are identical';
    }
    return `Entity '${this.toEntityPath}' is modified`;
  }

  @action setDiffMode = (diffMode: DIFF_VIEW_MODE): void => { this.diffMode = diffMode }
  @action private setToGrammarText = (text: string): void => { this.toGrammarText = text }
  @action private setFromGrammarText = (text: string): void => { this.fromGrammarText = text }

  @action refresh(): void {
    this.fromEntity = this.fromEntityGetter ? this.fromEntityGetter(this.effectiveEntityPath) : this.fromEntity;
    this.toEntity = this.toEntityGetter ? this.toEntityGetter(this.effectiveEntityPath) : this.toEntity;
  }

  getFromGrammar = flow(function* (this: EntityDiffViewState) {
    if (this.fromEntity) {
      try {
        const graphData = this.editorStore.sdlcState.editorStore.graphState.graphManager.buildModelDataFromEntities([this.fromEntity]);
        const elementGrammar = (yield executionClient.transformJSONToGrammar({ modelDataContext: graphData })) as unknown as GrammarToJsonInput;
        this.setFromGrammarText(elementGrammar.code ?? '');
      } catch (error) {
        this.setFromGrammarText('/* Failed to transform grammar text, see JSON diff instead */');
        Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      }
    } else {
      this.setFromGrammarText('');
    }
  });

  getToGrammar = flow(function* (this: EntityDiffViewState) {
    if (this.toEntity) {
      try {
        const graphData = this.editorStore.sdlcState.editorStore.graphState.graphManager.buildModelDataFromEntities([this.toEntity]);
        const elementGrammar = (yield executionClient.transformJSONToGrammar({ modelDataContext: graphData })) as unknown as GrammarToJsonInput;
        this.setToGrammarText(elementGrammar.code ?? '');
      } catch (error) {
        this.setFromGrammarText('/* Failed to transform grammar text, see JSON diff instead */');
        Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      }
    } else {
      this.setToGrammarText('');
    }
  });
}
