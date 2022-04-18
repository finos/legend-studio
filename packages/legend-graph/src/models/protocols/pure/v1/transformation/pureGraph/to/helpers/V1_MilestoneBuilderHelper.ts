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
  MilestoneVersionPropertySufixes,
  MILESTONING_STEROTYPE,
  PRIMITIVE_TYPE,
  MILESTONING_START_DATE_PARAMETER_NAME,
  TYPICAL_MULTIPLICITY_TYPE,
  DEFAULT_BUSINESS_DATE_MILESTONING_PARAMETER_NAME,
} from '../../../../../../../../MetaModelConst';
import type { PropertyOwner } from '../../../../../../../metamodels/pure/packageableElements/domain/AbstractProperty';
import { Class } from '../../../../../../../metamodels/pure/packageableElements/domain/Class';
import { DerivedProperty } from '../../../../../../../metamodels/pure/packageableElements/domain/DerivedProperty';
import { GenericType } from '../../../../../../../metamodels/pure/packageableElements/domain/GenericType';
import { GenericTypeExplicitReference } from '../../../../../../../metamodels/pure/packageableElements/domain/GenericTypeReference';
import { Multiplicity } from '../../../../../../../metamodels/pure/packageableElements/domain/Multiplicity';
import { Property } from '../../../../../../../metamodels/pure/packageableElements/domain/Property';
import { VariableExpression } from '../../../../../../../metamodels/pure/valueSpecification/VariableExpression';
import type { V1_ValueSpecification } from '../../../../model/valueSpecification/V1_ValueSpecification';
import { V1_serializeValueSpecification } from '../../../pureProtocol/serializationHelpers/V1_ValueSpecificationSerializer';
import { V1_transformRootValueSpecification } from '../../from/V1_ValueSpecificationTransformer';

const buildMilestoningParameter = (
  parameterName: string,
  graph: PureModel,
): PlainObject<V1_ValueSpecification> => {
  const milestoningParameter = new VariableExpression(
    parameterName,
    graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
    GenericTypeExplicitReference.create(
      new GenericType(graph.getPrimitiveType(PRIMITIVE_TYPE.DATE)),
    ),
  );
  const json = V1_serializeValueSpecification(
    V1_transformRootValueSpecification(milestoningParameter),
  );
  return json;
};

export const V1_ProcessMilestoningProperties = (
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
        case MILESTONING_STEROTYPE.BUSINESS_TEMPORAL: {
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
              graph,
            ),
          ];
          const milestonedAllVersions = new Property(
            `${property.name}${MilestoneVersionPropertySufixes.ALL_VERSIONS}`,
            new Multiplicity(property.multiplicity.lowerBound, undefined),
            GenericTypeExplicitReference.create(
              new GenericType(property.genericType.value.rawType),
            ),
            property.owner,
          );
          const milestonedAllVersionsInRange = new DerivedProperty(
            `${property.name}${MilestoneVersionPropertySufixes.ALL_VERSIONS_IN_RANGE}`,
            property.multiplicity,
            GenericTypeExplicitReference.create(
              new GenericType(property.genericType.value.rawType),
            ),
            property.owner,
          );
          milestonedAllVersionsInRange.parameters = [
            buildMilestoningParameter(
              MILESTONING_START_DATE_PARAMETER_NAME,
              graph,
            ),
            buildMilestoningParameter(
              MILESTONING_END_DATE_PARAMETER_NAME,
              graph,
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
        case MILESTONING_STEROTYPE.PROCESSING_TEMPORAL: {
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
              graph,
            ),
          ];
          const milestonedAllVersions = new Property(
            `${property.name}${MilestoneVersionPropertySufixes.ALL_VERSIONS}`,
            new Multiplicity(property.multiplicity.lowerBound, undefined),
            GenericTypeExplicitReference.create(
              new GenericType(property.genericType.value.rawType),
            ),
            property.owner,
          );
          const milestonedAllVersionsInRange = new DerivedProperty(
            `${property.name}${MilestoneVersionPropertySufixes.ALL_VERSIONS_IN_RANGE}`,
            property.multiplicity,
            GenericTypeExplicitReference.create(
              new GenericType(property.genericType.value.rawType),
            ),
            property.owner,
          );
          milestonedAllVersionsInRange.parameters = [
            buildMilestoningParameter(
              MILESTONING_START_DATE_PARAMETER_NAME,
              graph,
            ),
            buildMilestoningParameter(
              MILESTONING_END_DATE_PARAMETER_NAME,
              graph,
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
        case MILESTONING_STEROTYPE.BITEMPORAL: {
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
              graph,
            ),
            buildMilestoningParameter(
              DEFAULT_BUSINESS_DATE_MILESTONING_PARAMETER_NAME,
              graph,
            ),
          ];
          const milestonedAllVersions = new Property(
            `${property.name}${MilestoneVersionPropertySufixes.ALL_VERSIONS}`,
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
