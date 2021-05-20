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

import { BusinessMilestoning } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/milestoning/BusinessMilestoning';
import {
  assertNonEmptyString,
  getClass,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import { V1_BusinessMilestoning } from '../../../../model/packageableElements/store/relational/model/milestoning/V1_BusinessMilestoning';
import type { V1_Milestoning } from '../../../../model/packageableElements/store/relational/model/milestoning/V1_Milestoning';
import type { Milestoning } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/milestoning/Milestoning';
import { V1_BusinessSnapshotMilestoning } from '../../../../model/packageableElements/store/relational/model/milestoning/V1_BusinessSnapshotMilestoning';
import { BusinessSnapshotMilestoning } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/milestoning/BusinessSnapshotMilestoning';
import { V1_ProcessingMilestoning } from '../../../../model/packageableElements/store/relational/model/milestoning/V1_ProcessingMilestoning';
import { ProcessingMilestoning } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/milestoning/ProcessingMilestoning';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext';
import { PrimitiveInstanceValue } from '../../../../../../../metamodels/pure/model/valueSpecification/InstanceValue';
import { V1_buildValueSpecification } from './V1_ValueSpecificationBuilderHelper';
import type { StoreRelational_PureProtocolProcessorPlugin_Extension } from '../../../../../StoreRelational_PureProtocolProcessorPlugin_Extension';

const buildBusinessMilesoning = (
  protocol: V1_BusinessMilestoning,
  context: V1_GraphBuilderContext,
): BusinessMilestoning => {
  assertNonEmptyString(
    protocol.from,
    'Business milestoning from value is required',
  );
  assertNonEmptyString(
    protocol.thru,
    'Business milestoning thru value is required',
  );
  const metamodel = new BusinessMilestoning(
    protocol.from,
    protocol.thru,
    protocol.thruIsInclusive,
  );
  if (protocol.infinityDate) {
    metamodel.infinityDate = guaranteeType(
      V1_buildValueSpecification(protocol.infinityDate, context),
      PrimitiveInstanceValue,
    );
  }
  return metamodel;
};

const buildBusinessSnapshotMilestoning = (
  protocol: V1_BusinessSnapshotMilestoning,
  context: V1_GraphBuilderContext,
): BusinessSnapshotMilestoning => {
  assertNonEmptyString(
    protocol.snapshotDate,
    'Business snapshot milestoning snapshotDate value is required',
  );
  const metamodel = new BusinessSnapshotMilestoning(protocol.snapshotDate);
  if (protocol.infinityDate) {
    metamodel.infinityDate = guaranteeType(
      V1_buildValueSpecification(protocol.infinityDate, context),
      PrimitiveInstanceValue,
    );
  }
  return metamodel;
};

const buildProcessingMilestoning = (
  protocol: V1_ProcessingMilestoning,
  context: V1_GraphBuilderContext,
): ProcessingMilestoning => {
  assertNonEmptyString(
    protocol.in,
    'Processing milestoning in value is required',
  );
  assertNonEmptyString(
    protocol.out,
    'Processing milestoning out value is required',
  );
  const metamodel = new ProcessingMilestoning(
    protocol.in,
    protocol.out,
    protocol.outIsInclusive,
  );
  if (protocol.infinityDate) {
    metamodel.infinityDate = guaranteeType(
      V1_buildValueSpecification(protocol.infinityDate, context),
      PrimitiveInstanceValue,
    );
  }
  return metamodel;
};

export const V1_buildMilestoning = (
  protocol: V1_Milestoning,
  context: V1_GraphBuilderContext,
): Milestoning => {
  if (protocol instanceof V1_BusinessMilestoning) {
    return buildBusinessMilesoning(protocol, context);
  } else if (protocol instanceof V1_BusinessSnapshotMilestoning) {
    return buildBusinessSnapshotMilestoning(protocol, context);
  } else if (protocol instanceof V1_ProcessingMilestoning) {
    return buildProcessingMilestoning(protocol, context);
  }
  const extraMilestoningBuilders = context.extensions.plugins.flatMap(
    (plugin) =>
      (
        plugin as StoreRelational_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraMilestoningBuilders?.() ?? [],
  );
  for (const builder of extraMilestoningBuilders) {
    const metamodel = builder(protocol, context);
    if (metamodel) {
      return metamodel;
    }
  }
  throw new UnsupportedOperationError(
    `Can't build milestoning of type '${
      getClass(protocol).name
    }'. No compatible builder available from plugins.`,
  );
};
