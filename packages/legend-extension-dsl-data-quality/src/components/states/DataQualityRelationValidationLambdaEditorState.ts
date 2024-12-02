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
import type { DataQualityRelationValidation } from '../../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import type { EditorStore } from '@finos/legend-application-studio';
import { makeObservable, observable } from 'mobx';
import {
  type GeneratorFn,
  assertErrorThrown,
  hashArray,
  LogEvent,
} from '@finos/legend-shared';
import {
  type RawLambda,
  buildSourceInformationSourceId,
  GRAPH_MANAGER_EVENT,
  isStubbed_RawLambda,
  ParserError,
  stub_RawLambda,
} from '@finos/legend-graph';
import { LambdaEditorState } from '@finos/legend-query-builder';
import { VALIDATION_ROW_MAP_ID_LABEL } from './ConstraintState.js';
import { dataQualityRelationValidation_setRowMapFunction } from '../../graph-manager/DSL_DataQuality_GraphModifierHelper.js';
import { DATA_QUALITY_HASH_STRUCTURE } from '../../graph/metamodel/DSL_DataQuality_HashUtils.js';

export class DataQualityRelationValidationLambdaEditorState extends LambdaEditorState {
  relationValidation: DataQualityRelationValidation;
  editorStore: EditorStore;
  constructor(
    relationValidation: DataQualityRelationValidation,
    editorStore: EditorStore,
  ) {
    super('', '|');

    makeObservable(this, {
      relationValidation: observable,
      editorStore: observable,
    });

    this.relationValidation = relationValidation;
    this.editorStore = editorStore;
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId([
      VALIDATION_ROW_MAP_ID_LABEL,
      this.relationValidation.name,
      this.uuid, // in case of duplications
    ]);
  }

  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    const emptyFunctionDefinition = stub_RawLambda();
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.editorStore.graphManagerState.graphManager.pureCodeToLambda(
            this.fullLambdaString,
            this.lambdaId,
          )) as RawLambda;
        this.setParserError(undefined);
        dataQualityRelationValidation_setRowMapFunction(
          this.relationValidation,
          lambda,
        );
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
      dataQualityRelationValidation_setRowMapFunction(
        this.relationValidation,
        emptyFunctionDefinition,
      );
    }
  }

  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
    preserveCompilationError?: boolean | undefined;
  }): GeneratorFn<void> {
    if (!isStubbed_RawLambda(this.relationValidation.rowMapFunction!)) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(this.lambdaId, this.relationValidation.rowMapFunction!);
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

  get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_RELATION_VALIDATION,
      this.lambdaString,
    ]);
  }
}
