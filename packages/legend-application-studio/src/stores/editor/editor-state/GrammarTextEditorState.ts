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

import type { EditorStore } from '../EditorStore.js';
import { action, makeObservable, observable } from 'mobx';
import { hashValue, UnsupportedOperationError } from '@finos/legend-shared';
import {
  type PackageableElement,
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
  DataElement,
  ModelChainConnection,
  PURE_ELEMENT_NAME,
  PURE_CONNECTION_NAME,
  ExecutionEnvironmentInstance,
} from '@finos/legend-graph';
import { generatePackageableElementTreeNodeDataLabel } from '../utils/PackageTreeUtils.js';
import { LEGEND_STUDIO_SETTING_KEY } from '../../../__lib__/LegendStudioSetting.js';
import type { CodeEditorPosition } from '@finos/legend-lego/code-editor';
import type { DSL_Mapping_LegendStudioApplicationPlugin_Extension } from '../../extensions/DSL_Mapping_LegendStudioApplicationPlugin_Extension.js';
import type { DSL_LegendStudioApplicationPlugin_Extension } from '../../LegendStudioApplicationPlugin.js';

const getGrammarElementTypeLabelRegexString = (
  typeLabel: string,
  elementPath: string,
): string =>
  (
    `^([^\\S\\n])*${typeLabel}` + // start with type label (accounted for spaces, but not newline)
    `(\\s+<<.*>>)?` + // account for stereotype
    `(\\s+\\{.*\\})?` + // account for tagged value
    `\\s+${elementPath
      .replaceAll('*', '\\*')
      .replaceAll('(', '\\(')
      .replaceAll(')', '\\)')
      .replaceAll('[', '\\[')
      .replaceAll(']', '\\]')}` + // element path (might contain [],(),*)
    `[\\s\\n]`
  ) // account for termination after element path
    .replace(/\$/g, '\\$'); // replace special character $ by \\$
export class GrammarTextEditorState {
  readonly editorStore: EditorStore;

  graphGrammarText = '';
  currentElementLabelRegexString?: string | undefined;
  wrapText: boolean;
  forcedCursorPosition?: CodeEditorPosition | undefined;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      graphGrammarText: observable,
      currentElementLabelRegexString: observable,
      wrapText: observable,
      forcedCursorPosition: observable,
      setGraphGrammarText: action,
      setWrapText: action,
      setForcedCursorPosition: action,
      resetCurrentElementLabelRegexString: action,
      setCurrentElementLabelRegexString: action,
    });

    this.editorStore = editorStore;
    this.wrapText =
      this.editorStore.applicationStore.settingService.getBooleanValue(
        LEGEND_STUDIO_SETTING_KEY.EDITOR_WRAP_TEXT,
      ) ?? false;
  }

  get currentTextGraphHash(): string {
    return hashValue(this.graphGrammarText);
  }

  setGraphGrammarText(code: string): void {
    this.graphGrammarText = code;
  }

  setWrapText(val: boolean): void {
    this.wrapText = val;
  }

  setForcedCursorPosition(position: CodeEditorPosition | undefined): void {
    this.forcedCursorPosition = position;
  }

  resetCurrentElementLabelRegexString(): void {
    this.currentElementLabelRegexString = undefined;
  }

  setCurrentElementLabelRegexString(element: PackageableElement): void {
    let typeLabel: string | undefined;
    if (element instanceof Class) {
      typeLabel = PURE_ELEMENT_NAME.CLASS;
    } else if (element instanceof Association) {
      typeLabel = PURE_ELEMENT_NAME.ASSOCIATION;
    } else if (element instanceof Enumeration) {
      typeLabel = PURE_ELEMENT_NAME.ENUMERATION;
    } else if (element instanceof Measure) {
      typeLabel = PURE_ELEMENT_NAME.MEASURE;
    } else if (element instanceof Profile) {
      typeLabel = PURE_ELEMENT_NAME.PROFILE;
    } else if (element instanceof ConcreteFunctionDefinition) {
      typeLabel = PURE_ELEMENT_NAME.FUNCTION;
    } else if (element instanceof FlatData) {
      typeLabel = PURE_ELEMENT_NAME.FLAT_DATA;
    } else if (element instanceof Database) {
      typeLabel = PURE_ELEMENT_NAME.DATABASE;
    } else if (element instanceof Mapping) {
      typeLabel = PURE_ELEMENT_NAME.MAPPING;
    } else if (element instanceof Service) {
      typeLabel = PURE_ELEMENT_NAME.SERVICE;
    } else if (element instanceof FileGenerationSpecification) {
      typeLabel = PURE_ELEMENT_NAME.FILE_GENERATION;
    } else if (element instanceof GenerationSpecification) {
      typeLabel = PURE_ELEMENT_NAME.GENERATION_SPECIFICATION;
    } else if (element instanceof PackageableConnection) {
      if (element.connectionValue instanceof JsonModelConnection) {
        typeLabel = PURE_CONNECTION_NAME.JSON_MODEL_CONNECTION;
      } else if (element.connectionValue instanceof XmlModelConnection) {
        typeLabel = PURE_CONNECTION_NAME.XML_MODEL_CONNECTION;
      } else if (element.connectionValue instanceof FlatDataConnection) {
        typeLabel = PURE_CONNECTION_NAME.FLAT_DATA_CONNECTION;
      } else if (element.connectionValue instanceof ModelChainConnection) {
        typeLabel = PURE_CONNECTION_NAME.MODEL_CHAIN_CONNECTION;
      } else if (
        element.connectionValue instanceof RelationalDatabaseConnection
      ) {
        typeLabel = PURE_CONNECTION_NAME.RELATIONAL_DATABASE_CONNECTION;
      }
      const extraPureGrammarConnectionLabelers = this.editorStore.pluginManager
        .getApplicationPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSL_Mapping_LegendStudioApplicationPlugin_Extension
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
      typeLabel = PURE_ELEMENT_NAME.RUNTIME;
    } else if (element instanceof DataElement) {
      typeLabel = PURE_ELEMENT_NAME.DATA_ELEMENT;
    } else if (element instanceof ExecutionEnvironmentInstance) {
      typeLabel = PURE_ELEMENT_NAME.EXECUTION_ENVIRONMENT;
    } else {
      const extraPureGrammarElementLabelers = this.editorStore.pluginManager
        .getApplicationPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSL_LegendStudioApplicationPlugin_Extension
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
        `Can't construct label for element type in Pure grammar: no compatible labeler available from plugins`,
        element,
      );
    }
    // TODO-PR
    this.currentElementLabelRegexString = getGrammarElementTypeLabelRegexString(
      typeLabel,
      `${element.package?.path}::${generatePackageableElementTreeNodeDataLabel(
        element,
      )}`,
    );
  }
}
