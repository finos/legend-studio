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
import { UnsupportedOperationError } from '@finos/legend-shared';
import type {
  PackageableElement,
  EngineError,
  DSLMapping_PureGraphManagerPlugin_Extension,
} from '@finos/legend-graph';
import {
  Profile,
  Enumeration,
  Class,
  Association,
  Mapping,
  ConcreteFunctionDefinition,
  Service,
  FlatData,
  PackageableConnection,
  PackageableRuntime,
  JsonModelConnection,
  XmlModelConnection,
  FlatDataConnection,
  FileGenerationSpecification,
  GenerationSpecification,
  Measure,
  Database,
  RelationalDatabaseConnection,
  ServiceStore,
} from '@finos/legend-graph';
import { GRAMMAR_ELEMENT_TYPE_LABEL } from '@finos/legend-application';

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
  currentElementLabelRegexString?: string | undefined;
  wrapText = false;
  error?: EngineError | undefined;

  constructor(editorStore: EditorStore) {
    makeAutoObservable(this, {
      editorStore: false,
      setError: action,
      setGraphGrammarText: action,
      setWrapText: action,
      resetCurrentElementLabelRegexString: action,
      setCurrentElementLabelRegexString: action,
    });

    this.editorStore = editorStore;
  }

  setError(error: EngineError | undefined): void {
    this.error = error;
  }

  setGraphGrammarText(code: string): void {
    this.graphGrammarText = code;
  }

  setWrapText(val: boolean): void {
    this.wrapText = val;
  }

  resetCurrentElementLabelRegexString(): void {
    this.currentElementLabelRegexString = undefined;
  }

  setCurrentElementLabelRegexString(element: PackageableElement): void {
    let typeLabel: string | undefined;
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
    } else if (element instanceof Service) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.SERVICE;
    } else if (element instanceof FileGenerationSpecification) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.FILE_GENERATION;
    } else if (element instanceof GenerationSpecification) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.GENERATION_SPECIFICATION;
    } else if (element instanceof PackageableConnection) {
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
      const extraPureGrammarConnectionLabelers = this.editorStore.pluginManager
        .getPureGraphManagerPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSLMapping_PureGraphManagerPlugin_Extension
            ).getExtraPureGrammarConnectionLabelers?.() ?? [],
        );
      for (const labeler of extraPureGrammarConnectionLabelers) {
        const _typeLabel = labeler(element.connectionValue);
        if (_typeLabel) {
          typeLabel = _typeLabel;
          break;
        }
      }
    } else if (element instanceof PackageableRuntime) {
      typeLabel = GRAMMAR_ELEMENT_TYPE_LABEL.RUNTIME;
    } else {
      const extraPureGrammarElementLabelers = this.editorStore.pluginManager
        .getPureGraphManagerPlugins()
        .flatMap(
          (plugin) => plugin.getExtraPureGrammarElementLabelers?.() ?? [],
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
        `Can't construct label for element type in Pure grammar: no compatible labeler available from plugins`,
        element,
      );
    }
    this.currentElementLabelRegexString = getGrammarElementTypeLabelRegexString(
      typeLabel,
      element.path,
    );
  }
}
