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
import { CORE_PURE_PATH, MILESTONING_STEROTYPES } from '../MetaModelConst';

export const getMilestoneTemporalStereotype = (
  val: Class,
  graph: PureModel,
): MILESTONING_STEROTYPES | undefined => {
  const milestonedProfile = graph.getProfile(CORE_PURE_PATH.PROFILE_TEMPORAL);
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
