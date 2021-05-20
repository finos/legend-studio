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

import { fromElementPathToMappingElementId } from '../../../../../../../MetaModelUtility';
import {
  getClass,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import type { Mapping } from '../../../../../../../metamodels/pure/model/packageableElements/mapping/Mapping';
import { RelationalAssociationImplementation } from '../../../../../../../metamodels/pure/model/packageableElements/mapping/RelationalAssociationImplementation';
import type { AssociationImplementation } from '../../../../../../../metamodels/pure/model/packageableElements/mapping/AssociationImplementation';
import { InferableMappingElementIdImplicitValue } from '../../../../../../../metamodels/pure/model/packageableElements/mapping/InferableMappingElementId';
import type { Association } from '../../../../../../../metamodels/pure/model/packageableElements/domain/Association';
import { V1_RelationalAssociationMapping } from '../../../../model/packageableElements/store/relational/mapping/V1_RelationalAssociationMapping';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import { V1_ProtocolToMetaModelPropertyMappingVisitor } from '../../../../transformation/pureGraph/to/V1_ProtocolToMetaModelPropertyMappingVisitor';
import type { V1_AssociationMapping } from '../../../../model/packageableElements/mapping/V1_AssociationMapping';
import { V1_XStoreAssociationMapping } from '../../../../model/packageableElements/mapping/xStore/V1_XStoreAssociationMapping';
import { XStoreAssociationImplementation } from '../../../../../../../metamodels/pure/model/packageableElements/mapping/xStore/XStoreAssociationImplementation';

const getInferredAssociationMappingId = (
  _association: Association,
  classMapping: V1_RelationalAssociationMapping,
): InferableMappingElementIdImplicitValue =>
  InferableMappingElementIdImplicitValue.create(
    classMapping.id ?? fromElementPathToMappingElementId(_association.path),
    _association.path,
    classMapping.id,
  );

const buildRelationalAssociationMapping = (
  element: V1_RelationalAssociationMapping,
  parentMapping: Mapping,
  context: V1_GraphBuilderContext,
): RelationalAssociationImplementation => {
  const allClassMappings = [parentMapping, ...parentMapping.allIncludedMappings]
    .map((m) => m.classMappings)
    .flat();
  const association = context.resolveAssociation(element.association);
  const relationalAssociationImplementation =
    new RelationalAssociationImplementation(
      getInferredAssociationMappingId(association.value, element),
      parentMapping,
      association,
    );
  relationalAssociationImplementation.stores = element.stores.map(
    context.resolveStore,
  );
  relationalAssociationImplementation.propertyMappings =
    element.propertyMappings.map((propertyMapping) =>
      propertyMapping.accept_PropertyMappingVisitor(
        new V1_ProtocolToMetaModelPropertyMappingVisitor(
          context,
          relationalAssociationImplementation,
          undefined,
          parentMapping.enumerationMappings,
          undefined,
          allClassMappings,
        ),
      ),
    );
  return relationalAssociationImplementation;
};

const buildXStoreAssociationMapping = (
  element: V1_XStoreAssociationMapping,
  parentMapping: Mapping,
  context: V1_GraphBuilderContext,
): XStoreAssociationImplementation => {
  const allClassMappings = [parentMapping, ...parentMapping.allIncludedMappings]
    .map((m) => m.classMappings)
    .flat();
  const association = context.resolveAssociation(element.association);
  const xStoreAssociationImplementation = new XStoreAssociationImplementation(
    getInferredAssociationMappingId(association.value, element),
    parentMapping,
    association,
  );
  xStoreAssociationImplementation.stores = element.stores.map(
    context.resolveStore,
  );
  xStoreAssociationImplementation.propertyMappings =
    element.propertyMappings.map((propertyMapping) =>
      propertyMapping.accept_PropertyMappingVisitor(
        new V1_ProtocolToMetaModelPropertyMappingVisitor(
          context,
          xStoreAssociationImplementation,
          undefined,
          parentMapping.enumerationMappings,
          undefined,
          allClassMappings,
          xStoreAssociationImplementation,
        ),
      ),
    );
  return xStoreAssociationImplementation;
};

// TODO: consider changing to visitor pattern ?
export const V1_buildAssociationMapping = (
  element: V1_AssociationMapping,
  parentMapping: Mapping,
  context: V1_GraphBuilderContext,
): AssociationImplementation => {
  if (element instanceof V1_RelationalAssociationMapping) {
    return buildRelationalAssociationMapping(element, parentMapping, context);
  } else if (element instanceof V1_XStoreAssociationMapping) {
    return buildXStoreAssociationMapping(element, parentMapping, context);
  }
  throw new UnsupportedOperationError(
    `Can't build association mapping of type '${getClass(element).name}'`,
  );
};
