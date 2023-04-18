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

import { returnUndefOnError } from '@finos/legend-shared';
import type { EditorStore } from '../stores/editor/EditorStore.js';
import type { DSL_LegendStudioApplicationPlugin_Extension } from '../stores/LegendStudioApplicationPlugin.js';
import { type PackageableElement } from '@finos/legend-graph';
import {
  PURE_ClassIcon,
  PURE_PrimitiveTypeIcon,
  PURE_EnumerationIcon,
  PURE_MeasureIcon,
  PURE_AssociationIcon,
  PURE_ProfileIcon,
  PURE_MappingIcon,
  PURE_RuntimeIcon,
  PURE_ServiceIcon,
  PURE_ConnectionIcon,
  PURE_FunctionIcon,
  PURE_DatabaseIcon,
  PURE_FlatDataStoreIcon,
  PURE_FileGenerationIcon,
  PURE_GenerationSpecificationIcon,
  PURE_UnknownElementTypeIcon,
  PURE_UnitIcon,
  PURE_PackageIcon,
  PURE_DataIcon,
} from '@finos/legend-art';
import { PACKAGEABLE_ELEMENT_TYPE } from '../stores/editor/utils/ModelClassifierUtils.js';

export const getElementTypeIcon = (
  editorStore: EditorStore,
  type: string | undefined,
): React.ReactNode => {
  switch (type) {
    case PACKAGEABLE_ELEMENT_TYPE.PRIMITIVE:
      return <PURE_PrimitiveTypeIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.PACKAGE:
      return <PURE_PackageIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.CLASS:
      return <PURE_ClassIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.ASSOCIATION:
      return <PURE_AssociationIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.ENUMERATION:
      return <PURE_EnumerationIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.MEASURE:
      return <PURE_MeasureIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.UNIT:
      return <PURE_UnitIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.PROFILE:
      return <PURE_ProfileIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.FUNCTION:
      return <PURE_FunctionIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.FLAT_DATA_STORE:
      return <PURE_FlatDataStoreIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.DATABASE:
      return <PURE_DatabaseIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.MAPPING:
      return <PURE_MappingIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.SERVICE:
      return <PURE_ServiceIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.CONNECTION:
      return <PURE_ConnectionIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.RUNTIME:
      return <PURE_RuntimeIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION:
      return <PURE_FileGenerationIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.DATA:
      return <PURE_DataIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION:
      return <PURE_GenerationSpecificationIcon />;
    default: {
      if (type) {
        const extraElementIconGetters = editorStore.pluginManager
          .getApplicationPlugins()
          .flatMap(
            (plugin) =>
              (
                plugin as DSL_LegendStudioApplicationPlugin_Extension
              ).getExtraElementIconGetters?.() ?? [],
          );
        for (const iconGetter of extraElementIconGetters) {
          const elementIcon = iconGetter(type);
          if (elementIcon) {
            return elementIcon;
          }
        }
      }
      return <PURE_UnknownElementTypeIcon />;
    }
  }
};

export const getElementIcon = (
  editorStore: EditorStore,
  element: PackageableElement | undefined,
): React.ReactNode =>
  getElementTypeIcon(
    editorStore,
    element
      ? returnUndefOnError(() =>
          editorStore.graphState.getPackageableElementType(element),
        )
      : undefined,
  );
