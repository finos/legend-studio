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

import type { PlainObject } from '@finos/legend-shared';
import type { PureModel } from '../../../../../../../../graph/PureModel.js';
import { getMilestoneTemporalStereotype } from '../../../../../../../../graph/helpers/DomainHelper.js';
import {
  PROCESSING_DATE_MILESTONING_PROPERTY_NAME,
  MILESTONING_END_DATE_PARAMETER_NAME,
  MILESTONING_VERSION_PROPERTY_SUFFIX,
  MILESTONING_STEREOTYPE,
  PRIMITIVE_TYPE,
  MILESTONING_START_DATE_PARAMETER_NAME,
  BUSINESS_DATE_MILESTONING_PROPERTY_NAME,
} from '../../../../../../../../graph/MetaModelConst.js';
import type { PropertyOwner } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/AbstractProperty.js';
import { Class } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import { DerivedProperty } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/DerivedProperty.js';
import { GenericType } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/GenericType.js';
import { GenericTypeExplicitReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/GenericTypeReference.js';
import { Property } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Property.js';
import { V1_Multiplicity } from '../../../../model/packageableElements/domain/V1_Multiplicity.js';
import type { V1_ValueSpecification } from '../../../../model/valueSpecification/V1_ValueSpecification.js';
import { V1_Variable } from '../../../../model/valueSpecification/V1_Variable.js';
import { V1_serializeValueSpecification } from '../../../pureProtocol/serializationHelpers/V1_ValueSpecificationSerializer.js';
import type { PureProtocolProcessorPlugin } from '../../../../../PureProtocolProcessorPlugin.js';
import { Multiplicity } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Multiplicity.js';
import { PrimitiveType } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/PrimitiveType.js';
import { V1_createGenericTypeWithElementPath } from '../../from/V1_DomainTransformer.js';

const buildMilestoningParameter = (
  parameterName: string,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_ValueSpecification> => {
  const milestoningParameter = new V1_Variable();
  milestoningParameter.name = parameterName;
  milestoningParameter.multiplicity = V1_Multiplicity.ONE;
  milestoningParameter.genericType = V1_createGenericTypeWithElementPath(
    PRIMITIVE_TYPE.DATE,
  );
  const json = V1_serializeValueSpecification(milestoningParameter, plugins);
  return json;
};

const V1_TEMPORARY__buildMilestoningDateProperty = (
  propertyName: string,
  owner: PropertyOwner,
  graph: PureModel,
): Property =>
  new Property(
    propertyName,
    Multiplicity.ONE,
    GenericTypeExplicitReference.create(new GenericType(PrimitiveType.DATE)),
    owner,
  );

/**
 * Although engine builds these date properties for milestone classes
 * studio should not need too as they are meant for execution flows and have no real use for users.
 * We are temproary generating them to support migration Pure -> Legend which have mappings mapped against
 * these properties
 */
export const V1_TEMPORARY__buildMilestoningClass = (
  _class: Class,
  graph: PureModel,
): void => {
  const milestonedStereotype = getMilestoneTemporalStereotype(_class, graph);
  switch (milestonedStereotype) {
    case MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL: {
      _class._generatedMilestonedProperties.push(
        V1_TEMPORARY__buildMilestoningDateProperty(
          BUSINESS_DATE_MILESTONING_PROPERTY_NAME,
          _class,
          graph,
        ),
      );
      break;
    }
    case MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL: {
      _class._generatedMilestonedProperties.push(
        V1_TEMPORARY__buildMilestoningDateProperty(
          PROCESSING_DATE_MILESTONING_PROPERTY_NAME,
          _class,
          graph,
        ),
      );
      break;
    }
    case MILESTONING_STEREOTYPE.BITEMPORAL: {
      _class._generatedMilestonedProperties.push(
        V1_TEMPORARY__buildMilestoningDateProperty(
          BUSINESS_DATE_MILESTONING_PROPERTY_NAME,
          _class,
          graph,
        ),
      );
      _class._generatedMilestonedProperties.push(
        V1_TEMPORARY__buildMilestoningDateProperty(
          PROCESSING_DATE_MILESTONING_PROPERTY_NAME,
          _class,
          graph,
        ),
      );
      break;
    }
    default:
      break;
  }
};

/**
 * Builds abstract properties `allVersions`, `allVersionsInRange` and derived property with date parameter
 * while processing the milestoning properties of a class or association.
 */
export const V1_buildMilestoningProperties = (
  propertyOwner: PropertyOwner,
  graph: PureModel,
  plugins: PureProtocolProcessorPlugin[],
): void => {
  propertyOwner.properties.forEach((property) => {
    if (property.genericType.value.rawType instanceof Class) {
      const milestonedStereotype = getMilestoneTemporalStereotype(
        property.genericType.value.rawType,
        graph,
      );
      switch (milestonedStereotype) {
        case MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL: {
          const dateProperty = new DerivedProperty(
            property.name,
            property.multiplicity,
            GenericTypeExplicitReference.create(
              new GenericType(property.genericType.value.rawType),
            ),
            property._OWNER,
          );
          dateProperty.parameters = [
            buildMilestoningParameter(
              BUSINESS_DATE_MILESTONING_PROPERTY_NAME,
              plugins,
            ),
          ];
          const milestonedAllVersions = new Property(
            `${property.name}${MILESTONING_VERSION_PROPERTY_SUFFIX.ALL_VERSIONS}`,
            graph.getMultiplicity(property.multiplicity.lowerBound, undefined),
            GenericTypeExplicitReference.create(
              new GenericType(property.genericType.value.rawType),
            ),
            property._OWNER,
          );
          const milestonedAllVersionsInRange = new DerivedProperty(
            `${property.name}${MILESTONING_VERSION_PROPERTY_SUFFIX.ALL_VERSIONS_IN_RANGE}`,
            property.multiplicity,
            GenericTypeExplicitReference.create(
              new GenericType(property.genericType.value.rawType),
            ),
            property._OWNER,
          );
          milestonedAllVersionsInRange.parameters = [
            buildMilestoningParameter(
              MILESTONING_START_DATE_PARAMETER_NAME,
              plugins,
            ),
            buildMilestoningParameter(
              MILESTONING_END_DATE_PARAMETER_NAME,
              plugins,
            ),
          ];
          propertyOwner._generatedMilestonedProperties.push(dateProperty);
          propertyOwner._generatedMilestonedProperties.push(
            milestonedAllVersions,
          );
          propertyOwner._generatedMilestonedProperties.push(
            milestonedAllVersionsInRange,
          );
          break;
        }
        case MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL: {
          const dateProperty = new DerivedProperty(
            property.name,
            property.multiplicity,
            GenericTypeExplicitReference.create(
              new GenericType(property.genericType.value.rawType),
            ),
            property._OWNER,
          );
          dateProperty.parameters = [
            buildMilestoningParameter(
              PROCESSING_DATE_MILESTONING_PROPERTY_NAME,
              plugins,
            ),
          ];
          const milestonedAllVersions = new Property(
            `${property.name}${MILESTONING_VERSION_PROPERTY_SUFFIX.ALL_VERSIONS}`,
            graph.getMultiplicity(property.multiplicity.lowerBound, undefined),
            GenericTypeExplicitReference.create(
              new GenericType(property.genericType.value.rawType),
            ),
            property._OWNER,
          );
          const milestonedAllVersionsInRange = new DerivedProperty(
            `${property.name}${MILESTONING_VERSION_PROPERTY_SUFFIX.ALL_VERSIONS_IN_RANGE}`,
            property.multiplicity,
            GenericTypeExplicitReference.create(
              new GenericType(property.genericType.value.rawType),
            ),
            property._OWNER,
          );
          milestonedAllVersionsInRange.parameters = [
            buildMilestoningParameter(
              MILESTONING_START_DATE_PARAMETER_NAME,
              plugins,
            ),
            buildMilestoningParameter(
              MILESTONING_END_DATE_PARAMETER_NAME,
              plugins,
            ),
          ];
          propertyOwner._generatedMilestonedProperties.push(dateProperty);
          propertyOwner._generatedMilestonedProperties.push(
            milestonedAllVersions,
          );
          propertyOwner._generatedMilestonedProperties.push(
            milestonedAllVersionsInRange,
          );
          break;
        }
        case MILESTONING_STEREOTYPE.BITEMPORAL: {
          const dateProperty = new DerivedProperty(
            property.name,
            property.multiplicity,
            GenericTypeExplicitReference.create(
              new GenericType(property.genericType.value.rawType),
            ),
            property._OWNER,
          );
          dateProperty.parameters = [
            buildMilestoningParameter(
              PROCESSING_DATE_MILESTONING_PROPERTY_NAME,
              plugins,
            ),
            buildMilestoningParameter(
              BUSINESS_DATE_MILESTONING_PROPERTY_NAME,
              plugins,
            ),
          ];
          const milestonedAllVersions = new Property(
            `${property.name}${MILESTONING_VERSION_PROPERTY_SUFFIX.ALL_VERSIONS}`,
            graph.getMultiplicity(property.multiplicity.lowerBound, undefined),
            GenericTypeExplicitReference.create(
              new GenericType(property.genericType.value.rawType),
            ),
            property._OWNER,
          );
          propertyOwner._generatedMilestonedProperties.push(dateProperty);
          propertyOwner._generatedMilestonedProperties.push(
            milestonedAllVersions,
          );
          break;
        }
        default:
          break;
      }
    }
  });
};
