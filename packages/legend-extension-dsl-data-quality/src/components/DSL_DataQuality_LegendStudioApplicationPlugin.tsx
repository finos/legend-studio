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

import packageJson from '../../package.json';
import {
  type DSL_LegendStudioApplicationPlugin_Extension,
  type EditorStore,
  type ElementClassifier,
  type ElementEditorRenderer,
  type ElementEditorState,
  type ElementEditorStateCreator,
  type ElementIconGetter,
  type ElementTypeLabelGetter,
  type NewElementDriver,
  type NewElementDriverCreator,
  type NewElementDriverEditorRenderer,
  type NewElementFromStateCreator,
  type NewElementState,
  LegendStudioApplicationPlugin,
  PACKAGEABLE_ELEMENT_GROUP_BY_CATEGORY,
} from '@finos/legend-application-studio';
import type { PackageableElement } from '@finos/legend-graph';
import { type ReactNode } from 'react';
import {
  DataQualityClassValidationsConfiguration,
  DataQualityServiceValidationConfiguration,
  DataQualityRelationValidationConfiguration,
  DataQualityValidationConfiguration,
} from '../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import { EyeIcon } from '@finos/legend-art';
import { DataQualityClassValidationEditor } from './DataQualityClassValidationEditor.js';
import { DataQuality_ElementDriver } from './DSL_DataQuality_ElementDriver.js';
import { DataQualityServiceValidationEditor } from './DataQualityServiceValidationEditor.js';
import { DataQualityClassValidationState } from './states/DataQualityClassValidationState.js';
import { NewDataQualityValidationElementEditor } from './DSL_NewDataQualityValidationElement.js';
import { DataQualityServiceValidationState } from './states/DataQualityServiceValidationState.js';
import { DataQualityRelationValidationConfigurationState } from './states/DataQualityRelationValidationConfigurationState.js';
import { DataQualityRelationValidationConfigurationEditor } from './DataQualityRelationValidationConfigurationEditor.js';

const DATA_QUALITY_ELEMENT_TYPE = 'DATAQUALITYVALIDATION';
const DATA_QUALITY_ELEMENT_TYPE_LABEL = 'Data Quality Validation';

export class DSL_DataQuality_LegendStudioApplicationPlugin
  extends LegendStudioApplicationPlugin
  implements DSL_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.applicationStudioPlugin, packageJson.version);
  }

  getExtraSupportedElementTypes(): string[] {
    return [DATA_QUALITY_ELEMENT_TYPE];
  }

  getExtraSupportedElementTypesWithCategory(): Map<string, string[]> {
    const elementTypeswithCategory = new Map<string, string[]>();
    elementTypeswithCategory.set(PACKAGEABLE_ELEMENT_GROUP_BY_CATEGORY.OTHER, [
      DATA_QUALITY_ELEMENT_TYPE,
    ]);
    return elementTypeswithCategory;
  }

  getExtraElementClassifiers(): ElementClassifier[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof DataQualityValidationConfiguration) {
          return DATA_QUALITY_ELEMENT_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraElementIconGetters(): ElementIconGetter[] {
    return [
      (type: string): React.ReactNode | undefined => {
        if (type === DATA_QUALITY_ELEMENT_TYPE) {
          return (
            <div className="icon icon--dataQuality">
              <EyeIcon />
            </div>
          );
        }
        return undefined;
      },
    ];
  }

  getExtraElementTypeLabelGetters(): ElementTypeLabelGetter[] {
    return [
      (type: string): string | undefined => {
        if (type === DATA_QUALITY_ELEMENT_TYPE) {
          return DATA_QUALITY_ELEMENT_TYPE_LABEL;
        }
        return undefined;
      },
    ];
  }

  getExtraNewElementFromStateCreators(): NewElementFromStateCreator[] {
    return [
      (
        type: string,
        name: string,
        state: NewElementState,
      ): PackageableElement | undefined => {
        if (type === DATA_QUALITY_ELEMENT_TYPE) {
          return state
            .getNewElementDriver(DataQuality_ElementDriver)
            .createElement(name);
        }
        return undefined;
      },
    ];
  }

  getExtraElementEditorRenderers(): ElementEditorRenderer[] {
    return [
      (elementEditorState: ElementEditorState): React.ReactNode | undefined => {
        if (elementEditorState instanceof DataQualityServiceValidationState) {
          return (
            <DataQualityServiceValidationEditor key={elementEditorState.uuid} />
          );
        }
        if (elementEditorState instanceof DataQualityClassValidationState) {
          return (
            <DataQualityClassValidationEditor key={elementEditorState.uuid} />
          );
        }
        if (
          elementEditorState instanceof
          DataQualityRelationValidationConfigurationState
        ) {
          return (
            <DataQualityRelationValidationConfigurationEditor
              key={elementEditorState.uuid}
            />
          );
        }
        return undefined;
      },
    ];
  }

  getExtraElementEditorStateCreators(): ElementEditorStateCreator[] {
    return [
      (
        editorStore: EditorStore,
        element: PackageableElement,
      ): ElementEditorState | undefined => {
        if (element instanceof DataQualityClassValidationsConfiguration) {
          return new DataQualityClassValidationState(editorStore, element);
        }
        if (element instanceof DataQualityServiceValidationConfiguration) {
          return new DataQualityServiceValidationState(editorStore, element);
        }
        if (element instanceof DataQualityRelationValidationConfiguration) {
          return new DataQualityRelationValidationConfigurationState(
            editorStore,
            element,
          );
        }
        return undefined;
      },
    ];
  }

  getExtraNewElementDriverEditorRenderers(): NewElementDriverEditorRenderer[] {
    return [
      (type: string): ReactNode | undefined => {
        if (type === DATA_QUALITY_ELEMENT_TYPE) {
          return <NewDataQualityValidationElementEditor />;
        }
        return undefined;
      },
    ];
  }

  getExtraNewElementDriverCreators(): NewElementDriverCreator[] {
    return [
      (
        editorStore: EditorStore,
        type: string,
      ): NewElementDriver<PackageableElement> | undefined => {
        if (type === DATA_QUALITY_ELEMENT_TYPE) {
          return new DataQuality_ElementDriver(editorStore);
        }
        return undefined;
      },
    ];
  }
}
