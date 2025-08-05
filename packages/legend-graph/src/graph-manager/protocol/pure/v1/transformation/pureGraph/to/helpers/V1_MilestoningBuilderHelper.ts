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

import { BusinessMilestoning } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/milestoning/BusinessMilestoning.js';
import {
  assertNonEmptyString,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { V1_BusinessMilestoning } from '../../../../model/packageableElements/store/relational/model/milestoning/V1_BusinessMilestoning.js';
import type { V1_Milestoning } from '../../../../model/packageableElements/store/relational/model/milestoning/V1_Milestoning.js';
import type { Milestoning } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/milestoning/Milestoning.js';
import { V1_BusinessSnapshotMilestoning } from '../../../../model/packageableElements/store/relational/model/milestoning/V1_BusinessSnapshotMilestoning.js';
import { BusinessSnapshotMilestoning } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/milestoning/BusinessSnapshotMilestoning.js';
import { V1_ProcessingMilestoning } from '../../../../model/packageableElements/store/relational/model/milestoning/V1_ProcessingMilestoning.js';
import { ProcessingMilestoning } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/milestoning/ProcessingMilestoning.js';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext.js';
import type { STO_Relational_PureProtocolProcessorPlugin_Extension } from '../../../../../extensions/STO_Relational_PureProtocolProcessorPlugin_Extension.js';
import { RawPrimitiveInstanceValue } from '../../../../../../../../graph/metamodel/pure/rawValueSpecification/RawPrimitiveInstanceValue.js';
import { V1_RawValueSpecificationBuilder } from '../V1_RawValueSpecificationBuilder.js';
import { ProcessingSnapshotMilestoning } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/milestoning/ProcessingSnapshotMilestoning.js';
import { V1_ProcessingSnapshotMilestoning } from '../../../../model/packageableElements/store/relational/model/milestoning/V1_ProcessingSnapshotMilestoning.js';

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
      protocol.infinityDate.accept_RawValueSpecificationVisitor(
        new V1_RawValueSpecificationBuilder(context),
      ),
      RawPrimitiveInstanceValue,
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
      protocol.infinityDate.accept_RawValueSpecificationVisitor(
        new V1_RawValueSpecificationBuilder(context),
      ),
      RawPrimitiveInstanceValue,
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
      protocol.infinityDate.accept_RawValueSpecificationVisitor(
        new V1_RawValueSpecificationBuilder(context),
      ),
      RawPrimitiveInstanceValue,
    );
  }
  return metamodel;
};

const buildProcessingSnapshotMilestoning = (
  protocol: V1_ProcessingSnapshotMilestoning,
  context: V1_GraphBuilderContext,
): ProcessingSnapshotMilestoning => {
  assertNonEmptyString(
    protocol.snapshotDate,
    'Processing snapshot milestoning snapshotDate value is required',
  );
  const metamodel = new ProcessingSnapshotMilestoning(protocol.snapshotDate);
  if (protocol.infinityDate) {
    metamodel.infinityDate = guaranteeType(
      protocol.infinityDate.accept_RawValueSpecificationVisitor(
        new V1_RawValueSpecificationBuilder(context),
      ),
      RawPrimitiveInstanceValue,
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
  } else if (protocol instanceof V1_ProcessingSnapshotMilestoning) {
    return buildProcessingSnapshotMilestoning(protocol, context);
  }
  const extraMilestoningBuilders = context.extensions.plugins.flatMap(
    (plugin) =>
      (
        plugin as STO_Relational_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraMilestoningBuilders?.() ?? [],
  );
  for (const builder of extraMilestoningBuilders) {
    const metamodel = builder(protocol, context);
    if (metamodel) {
      return metamodel;
    }
  }
  throw new UnsupportedOperationError(
    `Can't build milestoning: no compatible builder available from plugins`,
    protocol,
  );
};
