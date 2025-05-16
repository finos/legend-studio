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
import {
  FunctionActivator,
  type PackageableElement,
} from '@finos/legend-graph';
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
  PURE_SnowflakeAppIcon,
  LaunchIcon,
  LinkIcon,
  PURE_DataProductIcon,
  PURE_IngestIcon,
} from '@finos/legend-art';
import { PACKAGEABLE_ELEMENT_TYPE } from '../stores/editor/utils/ModelClassifierUtils.js';

/**
 * NOTE: eventually we would like to remove this function and just a generic mechanism to
 * get element icon given the metamodel, we can also simplify the plugins a lot.
 * Technically, the only time we need to check icon for a type classifier is when we create
 * a new element
 */
export const getElementTypeIcon = (
  type: string | undefined,
  editorStore: EditorStore,
  options?: {
    element?: PackageableElement | undefined;
    returnEmptyForUnknown?: boolean | undefined;
  },
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
    case PACKAGEABLE_ELEMENT_TYPE._DATA_PRODUCT:
      return <PURE_DataProductIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.TEMPORARY__LOCAL_CONNECTION:
      return <LinkIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.RUNTIME:
      return <PURE_RuntimeIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION:
      return <PURE_FileGenerationIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.DATA:
      return <PURE_DataIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION:
      return <PURE_GenerationSpecificationIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.SNOWFLAKE_APP:
      return <PURE_SnowflakeAppIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.INGEST_DEFINITION:
      return <PURE_IngestIcon />;
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
          const elementIcon = iconGetter(type, options?.element);
          if (elementIcon) {
            return elementIcon;
          }
        }
      }
      // NOTE: this is temporary until we properly refactor this function to check element instead of
      // the type classifier value, but to be fair, this is not a bad way to do it since this acts
      // as a catch all block, we can check for `abstract` element here
      if (options?.element instanceof FunctionActivator) {
        return <LaunchIcon />;
      }
      return options?.returnEmptyForUnknown ? null : (
        <PURE_UnknownElementTypeIcon />
      );
    }
  }
};

export const getElementIcon = (
  element: PackageableElement | undefined,
  editorStore: EditorStore,
  options?: { returnEmptyForUnknown?: boolean | undefined },
): React.ReactNode =>
  getElementTypeIcon(
    element
      ? returnUndefOnError(() =>
          editorStore.graphState.getPackageableElementType(element),
        )
      : undefined,
    editorStore,
    {
      element,
      returnEmptyForUnknown: options?.returnEmptyForUnknown,
    },
  );
