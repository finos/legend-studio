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

import type { PureModel } from '../graph/PureModel';
import { Class } from '../models/metamodels/pure/packageableElements/domain/Class';
import {
  CORE_ELEMENT_PATH,
  MILESTONING_STEROTYPES,
  TYPICAL_MULTIPLICITY_TYPE,
} from '../MetaModelConst';
import type { PropertyOwner } from '../models/metamodels/pure/packageableElements/domain/AbstractProperty';
import { DerivedProperty } from '../models/metamodels/pure/packageableElements/domain/DerivedProperty';
import { GenericTypeExplicitReference } from '../models/metamodels/pure/packageableElements/domain/GenericTypeReference';
import { GenericType } from '../models/metamodels/pure/packageableElements/domain/GenericType';
import { Property } from '../models/metamodels/pure/packageableElements/domain/Property';

export const getMilestoneTemporalStereotype = (
  val: Class,
  graph: PureModel,
): MILESTONING_STEROTYPES | undefined => {
  const milestonedProfile = graph.getProfile(
    CORE_ELEMENT_PATH.PROFILE_TEMPORAL,
  );
  let stereotype;
  const profile = val.stereotypes.find(
    (e) => e.ownerReference.value === milestonedProfile,
  );
  stereotype = Object.values(MILESTONING_STEROTYPES).find(
    (e) => e === profile?.value.value,
  );
  if (stereotype !== undefined) {
    return stereotype;
  }
  val.generalizations.forEach((e) => {
    const superType = e.value.rawType;
    if (superType instanceof Class) {
      const milestonedStereotype = getMilestoneTemporalStereotype(
        superType,
        graph,
      );
      if (milestonedStereotype !== undefined) {
        stereotype = Object.values(MILESTONING_STEROTYPES).find(
          (e) => e === milestonedStereotype,
        );
      }
    }
  });
  return stereotype;
};

export const milestoningPropertyGenerator = (
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
        case MILESTONING_STEROTYPES.BUSINESS_TEMPORAL: {
          const dateProperty = new DerivedProperty(
            `${property.name}`,
            graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
            GenericTypeExplicitReference.create(
              new GenericType(
                graph.getClass(property.genericType.value.rawType.path),
              ),
            ),
            property.owner,
          );
          dateProperty.parameters = [
            {
              _type: 'var',
              class: 'Date',
              name: 'businessDate',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
          ];
          dateProperty.body = [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'var',
                  name: 'this',
                },
              ],
              property: `${property.name}`,
            },
          ];
          const milestonedAllVersions = new Property(
            `${property.name}AllVersions`,
            graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONEMANY),
            GenericTypeExplicitReference.create(
              new GenericType(
                graph.getClass(property.genericType.value.rawType.path),
              ),
            ),
            property.owner,
          );
          const milestonedAllVersionsInRange = new DerivedProperty(
            `${property.name}AllVersionsInRange`,
            graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
            GenericTypeExplicitReference.create(
              new GenericType(
                graph.getClass(property.genericType.value.rawType.path),
              ),
            ),
            property.owner,
          );
          milestonedAllVersionsInRange.parameters = [
            {
              _type: 'var',
              class: 'Date',
              name: 'start',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
            {
              _type: 'var',
              class: 'Date',
              name: 'end',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
          ];
          milestonedAllVersionsInRange.body = [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'var',
                  name: 'this',
                },
              ],
              property: `${property.name}`,
            },
          ];
          propertyOwner._originalMilestonedProperties.push(dateProperty);
          propertyOwner._originalMilestonedProperties.push(
            milestonedAllVersions,
          );
          propertyOwner._originalMilestonedProperties.push(
            milestonedAllVersionsInRange,
          );
          break;
        }
        case MILESTONING_STEROTYPES.PROCESSING_TEMPORAL: {
          const dateProperty = new DerivedProperty(
            `${property.name}`,
            graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
            GenericTypeExplicitReference.create(
              new GenericType(
                graph.getClass(property.genericType.value.rawType.path),
              ),
            ),
            property.owner,
          );
          dateProperty.parameters = [
            {
              _type: 'var',
              class: 'Date',
              name: 'processingDate',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
          ];
          dateProperty.body = [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'var',
                  name: 'this',
                },
              ],
              property: `${property.name}`,
            },
          ];
          const milestonedAllVersions = new Property(
            `${property.name}AllVersions`,
            graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONEMANY),
            GenericTypeExplicitReference.create(
              new GenericType(
                graph.getClass(property.genericType.value.rawType.path),
              ),
            ),
            property.owner,
          );
          const milestonedAllVersionsInRange = new DerivedProperty(
            `${property.name}AllVersionsInRange`,
            graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
            GenericTypeExplicitReference.create(
              new GenericType(
                graph.getClass(property.genericType.value.rawType.path),
              ),
            ),
            property.owner,
          );
          milestonedAllVersionsInRange.parameters = [
            {
              _type: 'var',
              class: 'Date',
              name: 'start',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
            {
              _type: 'var',
              class: 'Date',
              name: 'end',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
          ];
          milestonedAllVersionsInRange.body = [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'var',
                  name: 'this',
                },
              ],
              property: `${property.name}`,
            },
          ];
          propertyOwner._originalMilestonedProperties.push(dateProperty);
          propertyOwner._originalMilestonedProperties.push(
            milestonedAllVersions,
          );
          propertyOwner._originalMilestonedProperties.push(
            milestonedAllVersionsInRange,
          );
          break;
        }
        case MILESTONING_STEROTYPES.BITEMPORAL: {
          const dateProperty = new DerivedProperty(
            `${property.name}`,
            graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
            GenericTypeExplicitReference.create(
              new GenericType(
                graph.getClass(property.genericType.value.rawType.path),
              ),
            ),
            property.owner,
          );
          dateProperty.parameters = [
            {
              _type: 'var',
              class: 'Date',
              name: 'processingDate',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
            {
              _type: 'var',
              class: 'Date',
              name: 'businessDate',
              multiplicity: {
                lowerBound: 1,
                upperBound: 1,
              },
            },
          ];
          dateProperty.body = [
            {
              _type: 'property',
              parameters: [
                {
                  _type: 'var',
                  name: 'this',
                },
              ],
              property: `${property.name}`,
            },
          ];
          const milestonedAllVersions = new Property(
            `${property.name}AllVersions`,
            graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONEMANY),
            GenericTypeExplicitReference.create(
              new GenericType(
                graph.getClass(property.genericType.value.rawType.path),
              ),
            ),
            property.owner,
          );
          propertyOwner._originalMilestonedProperties.push(dateProperty);
          propertyOwner._originalMilestonedProperties.push(
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
