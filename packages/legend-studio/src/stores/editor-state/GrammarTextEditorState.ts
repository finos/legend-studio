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

import type { EditorStore } from '../EditorStore';
import { action, makeAutoObservable } from 'mobx';
import { GRAMMAR_ELEMENT_TYPE_LABEL } from '../PureLanguageSupport';
import {
  getClass,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import type { PackageableElement } from '../../models/metamodels/pure/model/packageableElements/PackageableElement';
import { Profile } from '../../models/metamodels/pure/model/packageableElements/domain/Profile';
import { Enumeration } from '../../models/metamodels/pure/model/packageableElements/domain/Enumeration';
import { Class } from '../../models/metamodels/pure/model/packageableElements/domain/Class';
import { Association } from '../../models/metamodels/pure/model/packageableElements/domain/Association';
import { Mapping } from '../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { Diagram } from '../../models/metamodels/pure/model/packageableElements/diagram/Diagram';
import { ConcreteFunctionDefinition } from '../../models/metamodels/pure/model/packageableElements/domain/ConcreteFunctionDefinition';
import { Service } from '../../models/metamodels/pure/model/packageableElements/service/Service';
import { FlatData } from '../../models/metamodels/pure/model/packageableElements/store/flatData/model/FlatData';
import { PackageableConnection } from '../../models/metamodels/pure/model/packageableElements/connection/PackageableConnection';
import { PackageableRuntime } from '../../models/metamodels/pure/model/packageableElements/runtime/PackageableRuntime';
import { JsonModelConnection } from '../../models/metamodels/pure/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { XmlModelConnection } from '../../models/metamodels/pure/model/packageableElements/store/modelToModel/connection/XmlModelConnection';
import { FlatDataConnection } from '../../models/metamodels/pure/model/packageableElements/store/flatData/connection/FlatDataConnection';
import { FileGenerationSpecification } from '../../models/metamodels/pure/model/packageableElements/fileGeneration/FileGenerationSpecification';
import { GenerationSpecification } from '../../models/metamodels/pure/model/packageableElements/generationSpecification/GenerationSpecification';
import { Measure } from '../../models/metamodels/pure/model/packageableElements/domain/Measure';
import { Database } from '../../models/metamodels/pure/model/packageableElements/store/relational/model/Database';
import { RelationalDatabaseConnection } from '../../models/metamodels/pure/model/packageableElements/store/relational/connection/RelationalDatabaseConnection';
import { ServiceStore } from '../../models/metamodels/pure/model/packageableElements/store/relational/model/ServiceStore';
import type { DSL_EditorPlugin_Extension } from '../EditorPlugin';

const getGrammarElementTypeLabelRegexString = (
  typeLabel: string,
  elementPath: string,
): string =>
  (
    `^([^\\S\\n])*${typeLabel}` + // start with type label (accounted for spaces, but not newline)
    `(\\s+<<.*>>)?` + // account for stereotype
    `(\\s+\\{.*\\})?` + // account for tagged value
    `\\s+${elementPath}` + // element path
    `[\\s\\n]`
  ) // account for termination after element path
    .replace(/\$/g, '\\$'); // replace special character $ by \\$

export class GrammarTextEditorState {
  editorStore: EditorStore;
  graphGrammarText = '';
  currentElementLabelRegexString?: string;

  constructor(editorStore: EditorStore) {
    makeAutoObservable(this, {
      editorStore: false,
      setGraphGrammarText: action,
      resetCurrentElementLabelRegexString: action,
      setCurrentElementLabelRegexString: action,
    });

    this.editorStore = editorStore;
  }

  setGraphGrammarText(code: string): void {
    this.graphGrammarText = code;
  }

  resetCurrentElementLabelRegexString(): void {
    this.currentElementLabelRegexString = undefined;
  }

  setCurrentElementLabelRegexString(element: PackageableElement): void {
    let typeLabel: string | undefined;
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
    } else if (element instanceof FlatData) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.FLAT_DATA;
    } else if (element instanceof Database) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.DATABASE;
    } else if (element instanceof ServiceStore) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.SERVICE_STORE;
    } else if (element instanceof Mapping) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.MAPPING;
    } else if (element instanceof Diagram) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.DIAGRAM;
    } else if (element instanceof Service) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.SERVICE;
    } else if (element instanceof FileGenerationSpecification) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.FILE_GENERATION;
    } else if (element instanceof GenerationSpecification) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.GENERATION_SPECIFICATION;
    } else if (element instanceof PackageableConnection) {
      /* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
      if (element.connectionValue instanceof JsonModelConnection) {
        typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.JSON_MODEL_CONNECTION;
      } else if (element.connectionValue instanceof XmlModelConnection) {
        typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.XML_MODEL_CONNECTION;
      } else if (element.connectionValue instanceof FlatDataConnection) {
        typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.FLAT_DATA_CONNECTION;
      } else if (
        element.connectionValue instanceof RelationalDatabaseConnection
      ) {
        typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.RELATIONAL_DATABASE_CONNECTION;
      }
    } else if (element instanceof PackageableRuntime) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.RUNTIME;
    } else {
      const extraPureGrammarElementLabelers =
        this.editorStore.applicationStore.pluginManager
          .getEditorPlugins()
          .flatMap(
            (plugin) =>
              (
                plugin as DSL_EditorPlugin_Extension
              ).getExtraPureGrammarElementLabelers?.() ?? [],
          );
      for (const labeler of extraPureGrammarElementLabelers) {
        const _typeLabel = labeler(element);
        if (_typeLabel) {
          typeLabel = _typeLabel;
          break;
        }
      }
    }
    if (!typeLabel) {
      throw new UnsupportedOperationError(
        `Can't label element type '${
          getClass(element).name
        }' in Pure grammar. No compatible labeler available from plugins.`,
      );
    }
    this.currentElementLabelRegexString = getGrammarElementTypeLabelRegexString(
      typeLabel,
      element.path,
    );
  }
}
