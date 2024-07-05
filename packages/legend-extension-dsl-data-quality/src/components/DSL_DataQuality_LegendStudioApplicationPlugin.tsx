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
  type ElementClassifier,
  type ElementEditorRenderer,
  type ElementEditorStateCreator,
  type ElementIconGetter,
  type ElementTypeLabelGetter,
  type NewElementDriverCreator,
  type NewElementDriverEditorRenderer,
  type NewElementFromStateCreator,
  type ElementEditorState,
  type NewElementDriver,
  type EditorStore,
  type NewElementState,
  LegendStudioApplicationPlugin,
  PACKAGEABLE_ELEMENT_GROUP_BY_CATEGORY,
} from '@finos/legend-application-studio';
import type { PackageableElement } from '@finos/legend-graph';
import {
  DataQualityClassValidationsConfiguration,
  DataQualityServiceValidationConfiguration,
} from '../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import { EyeIcon } from '@finos/legend-art';
import { DataQualityClassValidationEditor } from './DataQualityClassValidationEditor.js';
import { DataQuality_ClassElementDriver } from './DSL_DataQuality_ClassElementDriver.js';
import { NewDataQualityServiceValidationElementEditor } from './DSL_NewDataQualityServiceValidationElement.js';
import { DataQuality_ServiceElementDriver } from './DSL_DataQuality_ServiceElementDriver.js';
import { DataQualityServiceValidationEditor } from './DataQualityServiceValidationEditor.js';
import { DataQualityClassValidationState } from './states/DataQualityClassValidationState.js';
import { NewDataQualityClassValidationElementEditor } from './DSL_NewDataQualityClassValidationElement.js';
import { type ReactNode } from 'react';
import { DataQualityServiceValidationState } from './states/DataQualityServiceValidationState.js';

const DATA_QUALITY_ELEMENT_TYPE = 'DATAQUALITY';
const DATA_QUALITY_SERVICE_VALIDATION_ELEMENT_TYPE =
  'DATAQUALITYSERVICEVALIDATION';

const DATA_QUALITY_ELEMENT_TYPE_LABEL = 'Data Quality Class Validation';
const DATA_QUALITY_SERVICE_VALIDATION_TYPE_LABEL =
  'Data Quality Service Validation';

export class DSL_DataQuality_LegendStudioApplicationPlugin
  extends LegendStudioApplicationPlugin
  implements DSL_LegendStudioApplicationPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.applicationStudioPlugin, packageJson.version);
  }

  getExtraSupportedElementTypes(): string[] {
    return [
      DATA_QUALITY_ELEMENT_TYPE,
      DATA_QUALITY_SERVICE_VALIDATION_ELEMENT_TYPE,
    ];
  }

  getExtraSupportedElementTypesWithCategory(): Map<string, string[]> {
    const elementTypeswithCategory = new Map<string, string[]>();
    elementTypeswithCategory.set(PACKAGEABLE_ELEMENT_GROUP_BY_CATEGORY.OTHER, [
      DATA_QUALITY_ELEMENT_TYPE,
      // DATA_QUALITY_SERVICE_VALIDATION_ELEMENT_TYPE,
    ]);
    return elementTypeswithCategory;
  }

  getExtraElementClassifiers(): ElementClassifier[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof DataQualityClassValidationsConfiguration) {
          return DATA_QUALITY_ELEMENT_TYPE;
        }
        if (element instanceof DataQualityServiceValidationConfiguration) {
          return DATA_QUALITY_SERVICE_VALIDATION_ELEMENT_TYPE;
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
        if (type === DATA_QUALITY_SERVICE_VALIDATION_ELEMENT_TYPE) {
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
        if (type === DATA_QUALITY_SERVICE_VALIDATION_ELEMENT_TYPE) {
          return DATA_QUALITY_SERVICE_VALIDATION_TYPE_LABEL;
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
            .getNewElementDriver(DataQuality_ClassElementDriver)
            .createElement(name);
        }
        if (type === DATA_QUALITY_SERVICE_VALIDATION_ELEMENT_TYPE) {
          return state
            .getNewElementDriver(DataQuality_ServiceElementDriver)
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
        return undefined;
      },
    ];
  }

  getExtraNewElementDriverEditorRenderers(): NewElementDriverEditorRenderer[] {
    return [
      (type: string): ReactNode | undefined => {
        if (type === DATA_QUALITY_ELEMENT_TYPE) {
          return <NewDataQualityClassValidationElementEditor />;
        }
        if (type === DATA_QUALITY_SERVICE_VALIDATION_ELEMENT_TYPE) {
          return <NewDataQualityServiceValidationElementEditor />;
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
          return new DataQuality_ClassElementDriver(editorStore);
        }
        if (type === DATA_QUALITY_SERVICE_VALIDATION_ELEMENT_TYPE) {
          return new DataQuality_ServiceElementDriver(editorStore);
        }
        return undefined;
      },
    ];
  }
}
