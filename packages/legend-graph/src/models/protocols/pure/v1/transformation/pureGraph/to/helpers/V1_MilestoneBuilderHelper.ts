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
import type { PureModel } from '../../../../../../../../graph/PureModel';
import { getMilestoneTemporalStereotype } from '../../../../../../../../helpers/DomainHelper';
import {
  DEFAULT_PROCESSING_DATE_MILESTONING_PARAMETER_NAME,
  MILESTONING_END_DATE_PARAMETER_NAME,
  MILESTONING_VERSION_PROPERTY_SUFFIX,
  MILESTONING_STEREOTYPE,
  PRIMITIVE_TYPE,
  MILESTONING_START_DATE_PARAMETER_NAME,
  DEFAULT_BUSINESS_DATE_MILESTONING_PARAMETER_NAME,
} from '../../../../../../../../MetaModelConst';
import type { PropertyOwner } from '../../../../../../../metamodels/pure/packageableElements/domain/AbstractProperty';
import { Class } from '../../../../../../../metamodels/pure/packageableElements/domain/Class';
import { DerivedProperty } from '../../../../../../../metamodels/pure/packageableElements/domain/DerivedProperty';
import { GenericType } from '../../../../../../../metamodels/pure/packageableElements/domain/GenericType';
import { GenericTypeExplicitReference } from '../../../../../../../metamodels/pure/packageableElements/domain/GenericTypeReference';
import { Multiplicity } from '../../../../../../../metamodels/pure/packageableElements/domain/Multiplicity';
import { Property } from '../../../../../../../metamodels/pure/packageableElements/domain/Property';
import { V1_Multiplicity } from '../../../../model/packageableElements/domain/V1_Multiplicity';
import type { V1_ValueSpecification } from '../../../../model/valueSpecification/V1_ValueSpecification';
import { V1_Variable } from '../../../../model/valueSpecification/V1_Variable';
import { V1_serializeValueSpecification } from '../../../pureProtocol/serializationHelpers/V1_ValueSpecificationSerializer';

const buildMilestoningParameter = (
  parameterName: string,
): PlainObject<V1_ValueSpecification> => {
  const milestoningParameter = new V1_Variable();
  milestoningParameter.name = parameterName;
  const multiplicity = new V1_Multiplicity();
  multiplicity.lowerBound = 1;
  multiplicity.upperBound = 1;
  milestoningParameter.multiplicity = multiplicity;
  milestoningParameter.class = PRIMITIVE_TYPE.DATE;
  const json = V1_serializeValueSpecification(milestoningParameter);
  return json;
};

// Builds abstract properties `allVersions`, `allVersionsInRange` and derived property with date parameter
// while processing the milestoning properties of a class or association.
export const V1_buildMilestoningProperties = (
  propertyOwner: PropertyOwner,
  graph: PureModel,
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
            property.owner,
          );
          dateProperty.parameters = [
            buildMilestoningParameter(
              DEFAULT_BUSINESS_DATE_MILESTONING_PARAMETER_NAME,
            ),
          ];
          const milestonedAllVersions = new Property(
            `${property.name}${MILESTONING_VERSION_PROPERTY_SUFFIX.ALL_VERSIONS}`,
            new Multiplicity(property.multiplicity.lowerBound, undefined),
            GenericTypeExplicitReference.create(
              new GenericType(property.genericType.value.rawType),
            ),
            property.owner,
          );
          const milestonedAllVersionsInRange = new DerivedProperty(
            `${property.name}${MILESTONING_VERSION_PROPERTY_SUFFIX.ALL_VERSIONS_IN_RANGE}`,
            property.multiplicity,
            GenericTypeExplicitReference.create(
              new GenericType(property.genericType.value.rawType),
            ),
            property.owner,
          );
          milestonedAllVersionsInRange.parameters = [
            buildMilestoningParameter(MILESTONING_START_DATE_PARAMETER_NAME),
            buildMilestoningParameter(MILESTONING_END_DATE_PARAMETER_NAME),
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
            property.owner,
          );
          dateProperty.parameters = [
            buildMilestoningParameter(
              DEFAULT_PROCESSING_DATE_MILESTONING_PARAMETER_NAME,
            ),
          ];
          const milestonedAllVersions = new Property(
            `${property.name}${MILESTONING_VERSION_PROPERTY_SUFFIX.ALL_VERSIONS}`,
            new Multiplicity(property.multiplicity.lowerBound, undefined),
            GenericTypeExplicitReference.create(
              new GenericType(property.genericType.value.rawType),
            ),
            property.owner,
          );
          const milestonedAllVersionsInRange = new DerivedProperty(
            `${property.name}${MILESTONING_VERSION_PROPERTY_SUFFIX.ALL_VERSIONS_IN_RANGE}`,
            property.multiplicity,
            GenericTypeExplicitReference.create(
              new GenericType(property.genericType.value.rawType),
            ),
            property.owner,
          );
          milestonedAllVersionsInRange.parameters = [
            buildMilestoningParameter(MILESTONING_START_DATE_PARAMETER_NAME),
            buildMilestoningParameter(MILESTONING_END_DATE_PARAMETER_NAME),
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
            property.owner,
          );
          dateProperty.parameters = [
            buildMilestoningParameter(
              DEFAULT_PROCESSING_DATE_MILESTONING_PARAMETER_NAME,
            ),
            buildMilestoningParameter(
              DEFAULT_BUSINESS_DATE_MILESTONING_PARAMETER_NAME,
            ),
          ];
          const milestonedAllVersions = new Property(
            `${property.name}${MILESTONING_VERSION_PROPERTY_SUFFIX.ALL_VERSIONS}`,
            new Multiplicity(property.multiplicity.lowerBound, undefined),
            GenericTypeExplicitReference.create(
              new GenericType(property.genericType.value.rawType),
            ),
            property.owner,
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
