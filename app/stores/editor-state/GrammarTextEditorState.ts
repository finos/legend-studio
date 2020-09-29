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

import { EditorStore } from 'Stores/EditorStore';
import { observable, action, flow } from 'mobx';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { getGrammarElementTypeLabelRegexString, GRAMMAR_ELEMENT_TYPE_LABEL } from 'Utilities/LanguageUtil';
import { deserialize } from 'serializr';
import { GrammarToJsonInput } from 'EXEC/grammar/GrammarToJsonInput';
import { executionClient } from 'API/ExecutionClient';
import { UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { PureModelContextDataObject } from 'MM/AbstractPureGraphManager';
import { PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { Profile } from 'MM/model/packageableElements/domain/Profile';
import { Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { Association } from 'MM/model/packageableElements/domain/Association';
import { Mapping } from 'MM/model/packageableElements/mapping/Mapping';
import { Text } from 'MM/model/packageableElements/text/Text';
import { Diagram } from 'MM/model/packageableElements/diagram/Diagram';
import { ConcreteFunctionDefinition } from 'MM/model/packageableElements/domain/ConcreteFunctionDefinition';
import { PackageableConnection } from 'MM/model/packageableElements/connection/PackageableConnection';
import { PackageableRuntime } from 'MM/model/packageableElements/runtime/PackageableRuntime';
import { JsonModelConnection } from 'MM/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { XmlModelConnection } from 'MM/model/packageableElements/store/modelToModel/connection/XmlModelConnection';
import { FileGeneration } from 'MM/model/packageableElements/fileGeneration/FileGeneration';
import { GenerationSpecification } from 'MM/model/packageableElements/generationSpecification/GenerationSpecification';
import { Measure } from 'MM/model/packageableElements/domain/Measure';

export class GrammarTextEditorState {
  editorStore: EditorStore;
  @observable graphGrammarText = '';
  @observable currentElementLabelRegexString?: string;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }

  @action setGraphGrammarText(code: string): void { this.graphGrammarText = code }
  @action resetCurrentElementLabelRegexString(): void { this.currentElementLabelRegexString = undefined }

  @action setCurrentElementLabelRegexString(element: PackageableElement): void {
    let typeLabel = '';
    /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
    if (element instanceof Class) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.CLASS;
    } else if (element instanceof Association) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.ASSOCIATION;
    } else if (element instanceof Enumeration) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.ENUMERATION;
    } else if (element instanceof Measure) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.MEASURE;
    } else if (element instanceof Profile) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.PROFILE;
    } else if (element instanceof ConcreteFunctionDefinition) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.FUNCTION;
    } else if (element instanceof Mapping) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.MAPPING;
    } else if (element instanceof Diagram) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.DIAGRAM;
    } else if (element instanceof Text) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.TEXT;
    } else if (element instanceof FileGeneration) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.FILE_GENERATION;
    } else if (element instanceof GenerationSpecification) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.GENERATION_SPECIFICATION;
    } else if (element instanceof PackageableConnection) {
      /* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
      if (element.connectionValue instanceof JsonModelConnection) {
        typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.JSON_MODEL_CONNECTION;
      } else if (element.connectionValue instanceof XmlModelConnection) {
        typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.XML_MODEL_CONNECTION;
      }
    } else if (element instanceof PackageableRuntime) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.RUNTIME;
    } else {
      throw new UnsupportedOperationError(`Can't locate element of unsupported type '${element.constructor.name}' in text-mode`);
    }
    this.currentElementLabelRegexString = getGrammarElementTypeLabelRegexString(typeLabel, element.path);
  }

  updateGrammarText = flow(function* (this: GrammarTextEditorState, data: PureModelContextDataObject) {
    const startTime = Date.now();
    const grammarToJson = deserialize(GrammarToJsonInput, yield executionClient.transformJSONToGrammar({ modelDataContext: data }));
    this.setGraphGrammarText(grammarToJson.code ?? '');
    Log.info(LOG_EVENT.GRAPH_MODEL_TO_GRAMMAR_TRANSFORMED, Date.now() - startTime, 'ms');
  });
}
