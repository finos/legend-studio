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
import { LAMBDA_START } from 'MetaModelConst';
import { executionClient } from 'API/ExecutionClient';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { InstanceSetImplementationState, PropertyMappingState } from './MappingElementState';
import { RenderStyle } from 'EXEC/grammar/RenderStyle';
import { JsonToGrammarInput } from 'EXEC/grammar/JsonToGrammarInput';
import { deserialize } from 'serializr';
import { GrammarToJsonInput } from 'EXEC/grammar/GrammarToJsonInput';
import { ParserError } from 'EXEC/ExecutionServerError';
import { EditorStore } from 'Stores/EditorStore';
import { MappingElementDecorateVisitor } from 'Stores/editor-state/element-editor-state/mapping/MapingElementDecorateVisitor';
import { Lambda } from 'MM/model/valueSpecification/raw/Lambda';
import { PurePropertyMapping } from 'MM/model/packageableElements/store/modelToModel/mapping/PurePropertyMapping';
import { PureInstanceSetImplementation } from 'MM/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';

export class PurePropertyMappingState extends PropertyMappingState {
  @observable propertyMapping: PurePropertyMapping;

  constructor(propertyMapping: PurePropertyMapping) {
    super('', LAMBDA_START, propertyMapping);
    this.propertyMapping = propertyMapping;
  }

  convertLambdaGrammarStringToObject = flow(function* (this: PurePropertyMappingState) {
    const emptyLambda = Lambda.createStub();
    if (this.lambdaString) {
      try {
        const lambdas = new Map<string, string>();
        lambdas.set(this.propertyMapping.lambdaId, this.fullLambdaString);
        const result = deserialize(JsonToGrammarInput, yield executionClient.transformGrammarToJSON({ isolatedLambdas: lambdas }));
        const parserError = result.isolatedLambdas?.lambdaErrors?.get(this.propertyMapping.lambdaId);
        this.setParserError(parserError ? deserialize(ParserError, parserError) : undefined);
        if (!this.parserError) {
          this.propertyMapping.transform = result.isolatedLambdas?.lambdas
            ? result.isolatedLambdas.lambdas.get(this.propertyMapping.lambdaId) ?? emptyLambda
            : emptyLambda;
        }
      } catch (error) {
        Log.error(LOG_EVENT.PARSING_PROBLEM, error);
      }
    } else {
      this.clearErrors();
      this.propertyMapping.transform = emptyLambda;
    }
  });

  convertLambdaObjectToGrammarString = flow(function* (this: PurePropertyMappingState, renderStyle: RenderStyle) {
    if (!this.propertyMapping.transform.isStub) {
      try {
        const lambdas = new Map<string, Lambda>();
        lambdas.set(this.propertyMapping.lambdaId, this.propertyMapping.transform);
        const result = deserialize(GrammarToJsonInput, yield executionClient.transformJSONToGrammar({ isolatedLambdas: { lambdas }, renderStyle: renderStyle }));
        const grammarText = result.isolatedLambdas?.get(this.propertyMapping.lambdaId);
        this.setLambdaString(grammarText !== undefined ? this.extractLambdaString(grammarText) : '');
        this.clearErrors();
      } catch (error) {
        Log.error(LOG_EVENT.PARSING_PROBLEM, error);
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  });
}

export class PureInstanceSetImplementationState extends InstanceSetImplementationState {
  @observable mappingElement: PureInstanceSetImplementation;
  @observable isConvertingTransformObjects = false;
  @observable propertyMappingStates: PurePropertyMappingState[] = [];

  constructor(editorStore: EditorStore, setImplementation: PureInstanceSetImplementation) {
    super(editorStore, setImplementation);
    this.mappingElement = setImplementation;
    this.propertyMappingStates = setImplementation.propertyMappings.map(pm => new PurePropertyMappingState(pm));
  }

  @computed get hasParserError(): boolean { return this.propertyMappingStates.some(propertyMappingState => propertyMappingState.parserError) }
  @action setPropertyMappingStates(propertyMappingState: PurePropertyMappingState[]): void { this.propertyMappingStates = propertyMappingState }

  /**
   * When we decorate, we might lose the error (parser/compiler) on each of the property mapping state
   * so here we make sure that we reuse existing state and only add new decorated ones
   */
  @action
  decorate(): void {
    this.mappingElement.accept_SetImplementationVisitor(new MappingElementDecorateVisitor());
    const newPropertyMappingStates: PurePropertyMappingState[] = [];
    const propertyMappingstatesAfterDecoration = this.mappingElement.propertyMappings.map(pm => new PurePropertyMappingState(pm));
    propertyMappingstatesAfterDecoration.forEach(propertyMappingState => {
      const existingPropertyMappingState = this.propertyMappingStates.find(p => p.propertyMapping === propertyMappingState.propertyMapping);
      newPropertyMappingStates.push(existingPropertyMappingState ?? propertyMappingState);
    });
    this.setPropertyMappingStates(newPropertyMappingStates);
  }

  convertPropertyMappingTransformObjects = flow(function* (this: PureInstanceSetImplementationState) {
    const lambdas = new Map<string, Lambda>();
    const propertyMappingsMap = new Map<string, PurePropertyMappingState>();
    this.propertyMappingStates.forEach(pm => {
      if (!pm.propertyMapping.transform.isStub) {
        lambdas.set(pm.propertyMapping.lambdaId, pm.propertyMapping.transform);
        propertyMappingsMap.set(pm.propertyMapping.lambdaId, pm);
      }
    });
    if (lambdas.size) {
      this.isConvertingTransformObjects = true;
      try {
        const result = deserialize(GrammarToJsonInput, yield executionClient.transformJSONToGrammar({ isolatedLambdas: { lambdas } }));
        if (result.isolatedLambdas) {
          result.isolatedLambdas.forEach((grammarText, key) => {
            const purePropertyMapping = propertyMappingsMap.get(key);
            purePropertyMapping?.setLambdaString(purePropertyMapping.extractLambdaString(grammarText));
          });
        }
      } catch (error) {
        Log.error(LOG_EVENT.PARSING_PROBLEM, error);
      } finally {
        this.isConvertingTransformObjects = false;
      }
    }
  });
}
