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
  DataProduct,
  LakehouseAccessPoint,
  type PackageableElement,
  type AccessPoint,
  stub_RawLambda,
  LakehouseTargetEnv,
  LAMBDA_PIPE,
  type RawLambda,
  ParserError,
  GRAPH_MANAGER_EVENT,
  isStubbed_RawLambda,
  AccessPointGroup,
} from '@finos/legend-graph';
import type { EditorStore } from '../../../EditorStore.js';
import { ElementEditorState } from '../ElementEditorState.js';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import {
  guaranteeType,
  addUniqueEntry,
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  deleteEntry,
  filterByType,
} from '@finos/legend-shared';
import {
  dataProduct_addAccessPoint,
  dataProduct_addAccessPointGroup,
  dataProduct_deleteAccessPoint,
} from '../../../../graph-modifier/DSL_DataProduct_GraphModifierHelper.js';
import { LambdaEditorState } from '@finos/legend-query-builder';

export class AccessPointState {
  readonly state: DataProductEditorState;
  accessPoint: AccessPoint;

  constructor(val: AccessPoint, editorState: DataProductEditorState) {
    this.accessPoint = val;
    this.state = editorState;
  }
}

export class AccessPointLambdaEditorState extends LambdaEditorState {
  readonly editorStore: EditorStore;
  readonly val: LakehouseAccessPointState;

  constructor(val: LakehouseAccessPointState) {
    super('', LAMBDA_PIPE);
    this.val = val;
    this.editorStore = val.state.editorStore;
  }

  override get lambdaId(): string {
    return this.val.accessPoint.id;
  }

  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    const emptyLambda = stub_RawLambda();
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.editorStore.graphManagerState.graphManager.pureCodeToLambda(
            this.fullLambdaString,
            this.lambdaId,
          )) as RawLambda;
        this.setParserError(undefined);
        this.val.accessPoint.func = lambda;
      } catch (error) {
        assertErrorThrown(error);
        if (error instanceof ParserError) {
          this.setParserError(error);
        }
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      }
    } else {
      this.clearErrors();
      this.val.accessPoint.func = emptyLambda;
    }
  }

  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
    preserveCompilationError?: boolean | undefined;
  }): GeneratorFn<void> {
    if (
      !isStubbed_RawLambda(this.val.accessPoint.func) &&
      !this.val.state.isConvertingTransformLambdaObjects
    ) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(this.lambdaId, this.val.accessPoint.func);
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
            options?.pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.lambdaId);
        this.setLambdaString(
          grammarText !== undefined
            ? this.extractLambdaString(grammarText)
            : '',
        );
        this.clearErrors({
          preserveCompilationError: options?.preserveCompilationError,
        });
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  }
}
export class LakehouseAccessPointState extends AccessPointState {
  declare accessPoint: LakehouseAccessPoint;
  lambdaState: AccessPointLambdaEditorState;

  constructor(val: LakehouseAccessPoint, editorState: DataProductEditorState) {
    super(val, editorState);
    makeObservable(this, {
      lambdaState: observable,
    });
    this.accessPoint = val;
    this.lambdaState = new AccessPointLambdaEditorState(this);
  }
}

export class DataProductEditorState extends ElementEditorState {
  accessPointModal = false;
  accessPointStates: AccessPointState[] = [];
  isConvertingTransformLambdaObjects = false;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      product: computed,
      accessPointModal: observable,
      accessPointStates: observable,
      deleteAccessPoint: observable,
      isConvertingTransformLambdaObjects: observable,
      setAccessPointModal: action,
      addAccessPoint: action,
      convertAccessPointsFuncObjects: flow,
    });
    this.accessPointStates = this.product.accessPointGroups
      .map((e) => e.accessPoints)
      .flat()
      .map((e) => this.buildAccessPointState(e));
  }

  *convertAccessPointsFuncObjects(): GeneratorFn<void> {
    const lambdas = new Map<string, RawLambda>();
    const index = new Map<string, LakehouseAccessPointState>();
    const states = this.accessPointStates.filter(
      filterByType(LakehouseAccessPointState),
    );
    states.forEach((pm) => {
      if (!isStubbed_RawLambda(pm.accessPoint.func)) {
        lambdas.set(pm.lambdaState.lambdaId, pm.accessPoint.func);
        index.set(pm.lambdaState.lambdaId, pm);
      }
    });
    if (lambdas.size) {
      this.isConvertingTransformLambdaObjects = true;
      try {
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
          )) as Map<string, string>;
        isolatedLambdas.forEach((grammarText, key) => {
          const purePropertyMapping = index.get(key);
          purePropertyMapping?.lambdaState.setLambdaString(
            purePropertyMapping.lambdaState.extractLambdaString(grammarText),
          );
        });
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      } finally {
        this.isConvertingTransformLambdaObjects = false;
      }
    }
  }

  buildAccessPointState(val: AccessPoint): AccessPointState {
    if (val instanceof LakehouseAccessPoint) {
      return new LakehouseAccessPointState(val, this);
    }
    return new AccessPointState(val, this);
  }

  setAccessPointModal(val: boolean): void {
    this.accessPointModal = val;
  }

  deleteAccessPoint(val: AccessPointState): void {
    const ap = val.accessPoint;
    // find group
    const group = this.product.accessPointGroups.find((g) =>
      Boolean(g.accessPoints.find((v) => v === ap)),
    );
    if (group) {
      dataProduct_deleteAccessPoint(group, ap);
      deleteEntry(this.accessPointStates, val);
    }
  }

  addAccessPoint(id: string): void {
    const accesspoint = new LakehouseAccessPoint(
      id,
      LakehouseTargetEnv.Snowflake,
      stub_RawLambda(),
    );

    const group =
      this.product.accessPointGroups[0] ?? this.createBareGroupAndAdd();
    dataProduct_addAccessPoint(group, accesspoint);
    addUniqueEntry(
      this.accessPointStates,
      this.buildAccessPointState(accesspoint),
    );
  }

  createBareGroupAndAdd(): AccessPointGroup {
    const group = new AccessPointGroup();
    group.id = 'default';
    dataProduct_addAccessPointGroup(this.product, group);
    return group;
  }

  get product(): DataProduct {
    return guaranteeType(
      this.element,
      DataProduct,
      'Element inside data product editor state must be a data product',
    );
  }

  get accessPoints(): AccessPoint[] {
    return this.product.accessPointGroups.map((e) => e.accessPoints).flat();
  }

  override reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): DataProductEditorState {
    const editorState = new DataProductEditorState(editorStore, newElement);
    return editorState;
  }
}
