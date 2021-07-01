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

import { BusinessMilestoning } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/milestoning/BusinessMilestoning';
import {
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import { V1_BusinessMilestoning } from '../../../model/packageableElements/store/relational/model/milestoning/V1_BusinessMilestoning';
import type { V1_Milestoning } from '../../../model/packageableElements/store/relational/model/milestoning/V1_Milestoning';
import type { Milestoning } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/milestoning/Milestoning';
import { V1_BusinessSnapshotMilestoning } from '../../../model/packageableElements/store/relational/model/milestoning/V1_BusinessSnapshotMilestoning';
import { BusinessSnapshotMilestoning } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/milestoning/BusinessSnapshotMilestoning';
import { V1_ProcessingMilestoning } from '../../../model/packageableElements/store/relational/model/milestoning/V1_ProcessingMilestoning';
import { ProcessingMilestoning } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/milestoning/ProcessingMilestoning';
import type { StoreRelational_PureProtocolProcessorPlugin_Extension } from '../../../../StoreRelational_PureProtocolProcessorPlugin_Extension';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext';
import { V1_RawInstanceValue } from '../../../model/rawValueSpecification/V1_RawInstanceValue';
import { V1_RawValueSpecificationTransformer } from './V1_RawValueSpecificationTransformer';

const transformBusinessMilesoning = (
  metamodel: BusinessMilestoning,
): V1_BusinessMilestoning => {
  const protocol = new V1_BusinessMilestoning();
  protocol.from = metamodel.from;
  protocol.thru = metamodel.thru;
  protocol.thruIsInclusive = metamodel.thruIsInclusive;
  return protocol;
};

const transformBusinessSnapshotMilestoning = (
  metamodel: BusinessSnapshotMilestoning,
): V1_BusinessSnapshotMilestoning => {
  const protocol = new V1_BusinessSnapshotMilestoning();
  protocol.snapshotDate = metamodel.snapshotDate;
  return protocol;
};

const transformProcessingMilestoning = (
  metamodel: ProcessingMilestoning,
  context: V1_GraphTransformerContext,
): V1_ProcessingMilestoning => {
  const protocol = new V1_ProcessingMilestoning();
  protocol.in = metamodel.in;
  protocol.out = metamodel.out;
  protocol.outIsInclusive = metamodel.outIsInclusive;
  if (metamodel.infinityDate) {
    protocol.infinityDate = guaranteeType(
      metamodel.infinityDate.accept_RawValueSpecificationVisitor(
        new V1_RawValueSpecificationTransformer(context),
      ),
      V1_RawInstanceValue,
    );
  }
  return protocol;
};

export const V1_transformMilestoning = (
  metamodel: Milestoning,
  context: V1_GraphTransformerContext,
): V1_Milestoning => {
  if (metamodel instanceof BusinessMilestoning) {
    return transformBusinessMilesoning(metamodel);
  } else if (metamodel instanceof BusinessSnapshotMilestoning) {
    return transformBusinessSnapshotMilestoning(metamodel);
  } else if (metamodel instanceof ProcessingMilestoning) {
    return transformProcessingMilestoning(metamodel, context);
  }
  const extraMilestoningTransformers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as StoreRelational_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraMilestoningTransformers?.() ?? [],
  );
  for (const transformer of extraMilestoningTransformers) {
    const protocol = transformer(metamodel, context);
    if (protocol) {
      return protocol;
    }
  }
  throw new UnsupportedOperationError(
    `Can't transform milestoning. No compatible transformer available from plugins.`,
    metamodel,
  );
};
