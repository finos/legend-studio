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

import { fromElementPathToMappingElementId } from '../../../../../../../../graph/MetaModelUtils.js';
import { UnsupportedOperationError } from '@finos/legend-shared';
import type { Mapping } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import { RelationalAssociationImplementation } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/RelationalAssociationImplementation.js';
import type { AssociationImplementation } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/AssociationImplementation.js';
import { InferableMappingElementIdImplicitValue } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/InferableMappingElementId.js';
import type { Association } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Association.js';
import { V1_RelationalAssociationMapping } from '../../../../model/packageableElements/store/relational/mapping/V1_RelationalAssociationMapping.js';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext.js';
import { V1_PropertyMappingBuilder } from '../V1_PropertyMappingBuilder.js';
import type { V1_AssociationMapping } from '../../../../model/packageableElements/mapping/V1_AssociationMapping.js';
import { V1_XStoreAssociationMapping } from '../../../../model/packageableElements/mapping/xStore/V1_XStoreAssociationMapping.js';
import { XStoreAssociationImplementation } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/xStore/XStoreAssociationImplementation.js';
import {
  getAllEnumerationMappings,
  getAllIncludedMappings,
} from '../../../../../../../../graph/helpers/DSL_Mapping_Helper.js';
import { FlatDataAssociationImplementation } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/FlatDataAssociationImplementation.js';
import { V1_FlatDataAssociationMapping } from '../../../../model/packageableElements/store/flatData/mapping/V1_FlatDataAssociationMapping.js';

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
  const allClassMappings = [
    parentMapping,
    ...getAllIncludedMappings(parentMapping),
  ]
    .map((m) => m.classMappings)
    .flat();
  const association = context.resolveAssociation(element.association.path);
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
        new V1_PropertyMappingBuilder(
          context,
          relationalAssociationImplementation,
          undefined,
          getAllEnumerationMappings(parentMapping),
          undefined,
          allClassMappings,
        ),
      ),
    );
  return relationalAssociationImplementation;
};

const buildFlatDataAssociationMapping = (
  element: V1_FlatDataAssociationMapping,
  parentMapping: Mapping,
  context: V1_GraphBuilderContext,
): FlatDataAssociationImplementation => {
  const allClassMappings = [
    parentMapping,
    ...getAllIncludedMappings(parentMapping),
  ]
    .map((m) => m.classMappings)
    .flat();
  const association = context.resolveAssociation(element.association.path);
  const flatDataAssociationImplementation =
    new FlatDataAssociationImplementation(
      getInferredAssociationMappingId(association.value, element),
      parentMapping,
      association,
    );
  flatDataAssociationImplementation.stores = element.stores.map(
    context.resolveStore,
  );
  flatDataAssociationImplementation.propertyMappings =
    element.propertyMappings.map((propertyMapping) =>
      propertyMapping.accept_PropertyMappingVisitor(
        new V1_PropertyMappingBuilder(
          context,
          flatDataAssociationImplementation,
          undefined,
          getAllEnumerationMappings(parentMapping),
          undefined,
          allClassMappings,
        ),
      ),
    );
  return flatDataAssociationImplementation;
};

const buildXStoreAssociationMapping = (
  element: V1_XStoreAssociationMapping,
  parentMapping: Mapping,
  context: V1_GraphBuilderContext,
): XStoreAssociationImplementation => {
  const allClassMappings = [
    parentMapping,
    ...getAllIncludedMappings(parentMapping),
  ]
    .map((m) => m.classMappings)
    .flat();
  const association = context.resolveAssociation(element.association.path);
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
        new V1_PropertyMappingBuilder(
          context,
          xStoreAssociationImplementation,
          undefined,
          getAllEnumerationMappings(parentMapping),
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
  } else if (element instanceof V1_FlatDataAssociationMapping) {
    return buildFlatDataAssociationMapping(element, parentMapping, context);
  }
  throw new UnsupportedOperationError(
    `Can't build association mapping`,
    element,
  );
};
