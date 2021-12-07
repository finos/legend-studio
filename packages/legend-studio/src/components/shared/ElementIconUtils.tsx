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
import type { EditorStore } from '../../stores/EditorStore';
import type { DSL_LegendStudioPlugin_Extension } from '../../stores/LegendStudioPlugin';
import type { PackageableElement, Type } from '@finos/legend-graph';
import {
  Class,
  Enumeration,
  Measure,
  Unit,
  PrimitiveType,
  PACKAGEABLE_ELEMENT_TYPE,
} from '@finos/legend-graph';
import {
  ClassIcon,
  PrimitiveTypeIcon,
  EnumerationIcon,
  MeasureIcon,
  AssociationIcon,
  ProfileIcon,
  MappingIcon,
  RuntimeIcon,
  ServiceIcon,
  ConnectionIcon,
  FunctionIcon,
  DatabaseIcon,
  FlatDataStoreIcon,
  FileGenerationIcon,
  GenerationSpecificationIcon,
  UnknownTypeIcon,
  UnitIcon,
  PackageIcon,
} from '@finos/legend-art';

export const getClassPropertyIcon = (type: Type): React.ReactNode => {
  if (type instanceof PrimitiveType) {
    return <PrimitiveTypeIcon />;
  } else if (type instanceof Class) {
    return <ClassIcon />;
  } else if (type instanceof Enumeration) {
    return <EnumerationIcon />;
  } else if (type instanceof Measure) {
    return <MeasureIcon />;
  } else if (type instanceof Unit) {
    return <UnitIcon />;
  }
  return <UnknownTypeIcon />;
};

export const getElementTypeIcon = (
  editorStore: EditorStore,
  type: string | undefined,
): React.ReactNode => {
  switch (type) {
    case PACKAGEABLE_ELEMENT_TYPE.PRIMITIVE:
      return <PrimitiveTypeIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.PACKAGE:
      return <PackageIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.CLASS:
      return <ClassIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.ASSOCIATION:
      return <AssociationIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.ENUMERATION:
      return <EnumerationIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.MEASURE:
      return <MeasureIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.UNIT:
      return <UnitIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.PROFILE:
      return <ProfileIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.FUNCTION:
      return <FunctionIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.FLAT_DATA_STORE:
      return <FlatDataStoreIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.DATABASE:
      return <DatabaseIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.MAPPING:
      return <MappingIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.SERVICE:
      return <ServiceIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.CONNECTION:
      return <ConnectionIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.RUNTIME:
      return <RuntimeIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION:
      return <FileGenerationIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION:
      return <GenerationSpecificationIcon />;
    default: {
      if (type) {
        const extraElementIconGetters = editorStore.pluginManager
          .getStudioPlugins()
          .flatMap(
            (plugin) =>
              (
                plugin as DSL_LegendStudioPlugin_Extension
              ).getExtraElementIconGetters?.() ?? [],
          );
        for (const iconGetter of extraElementIconGetters) {
          const elementIcon = iconGetter(type);
          if (elementIcon) {
            return elementIcon;
          }
        }
      }
      return <UnknownTypeIcon />;
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
