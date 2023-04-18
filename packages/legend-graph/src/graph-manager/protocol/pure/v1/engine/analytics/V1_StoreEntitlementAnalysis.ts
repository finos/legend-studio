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

import {
  SKIP,
  createModelSchema,
  custom,
  deserialize,
  optional,
  primitive,
  type ModelSchema,
  serialize,
  list,
} from 'serializr';
import type { V1_PureModelContext } from '../../model/context/V1_PureModelContext.js';
import type { V1_RawLambda } from '../../model/rawValueSpecification/V1_RawLambda.js';
import { V1_pureModelContextPropSchema } from '../../transformation/pureProtocol/V1_PureProtocolSerialization.js';
import {
  SerializationFactory,
  type PlainObject,
  usingConstantValueSchema,
  UnsupportedOperationError,
  optionalCustom,
} from '@finos/legend-shared';
import { V1_rawLambdaModelSchema } from '../../transformation/pureProtocol/serializationHelpers/V1_RawValueSpecificationSerializationHelper.js';
import type { PureProtocolProcessorPlugin } from '../../../PureProtocolProcessorPlugin.js';
import {
  type DatasetEntitlementReport,
  DatasetSpecification,
  DatasetEntitlementAccessGrantedReport,
  DatasetEntitlementAccessApprovedReport,
  DatasetEntitlementAccessRequestedReport,
  DatasetEntitlementAccessNotGrantedReport,
  DatasetEntitlementUnsupportedReport,
} from '../../../../../action/analytics/StoreEntitlementAnalysis.js';

export class V1_StoreEntitlementAnalysisInput {
  clientVersion: string | undefined;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  query?: V1_RawLambda | undefined;
  mapping!: string;
  runtime!: string;
  model!: V1_PureModelContext;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_StoreEntitlementAnalysisInput, {
      clientVersion: optional(primitive()),
      mapping: primitive(),
      model: V1_pureModelContextPropSchema,
      query: optionalCustom(
        (val) => serialize(V1_rawLambdaModelSchema, val),
        () => SKIP,
      ),
      runtime: primitive(),
    }),
  );
}

export enum V1_DatasetSpecificationType {
  DATASET_SPECIFICATION = 'datasetSpecification',
}

export class V1_DatasetSpecification {
  name!: string;
  type!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DatasetSpecification, {
      _type: usingConstantValueSchema(
        V1_DatasetSpecificationType.DATASET_SPECIFICATION,
      ),
      name: primitive(),
      type: primitive(),
    }),
  );
}

const V1_deserializeDatasetSpecification = (
  json: PlainObject<V1_DatasetSpecification>,
  plugins: PureProtocolProcessorPlugin[],
): V1_DatasetSpecification => {
  switch (json._type) {
    case V1_DatasetSpecificationType.DATASET_SPECIFICATION:
      return deserialize(V1_DatasetSpecification.serialization.schema, json);
    default: {
      const extraDeserializers = plugins.flatMap(
        (plugin) =>
          plugin.V1_getExtraDatasetSpecificationProtocolDeserializers?.() ?? [],
      );
      for (const deserializer of extraDeserializers) {
        const protocol = deserializer(json, plugins);
        if (protocol) {
          return protocol;
        }
      }
      throw new UnsupportedOperationError(
        `Can't deserialize data specification of type '${json._type}': no compatible deserializer available from plugins`,
      );
    }
  }
};

export class V1_SurveyDatasetsResult {
  datasets: V1_DatasetSpecification[] = [];
}

export const V1_surveyDatasetsResultModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_SurveyDatasetsResult> =>
  createModelSchema(V1_SurveyDatasetsResult, {
    datasets: list(
      custom(
        () => SKIP,
        (val) => V1_deserializeDatasetSpecification(val, plugins),
      ),
    ),
  });

export const V1_buildDatasetSpecification = (
  protocol: V1_DatasetSpecification,
  plugins: PureProtocolProcessorPlugin[],
): DatasetSpecification => {
  const extraBuilders = plugins.flatMap(
    (plugin) => plugin.V1_getExtraDatasetSpecificationBuilders?.() ?? [],
  );
  for (const builder of extraBuilders) {
    const metamodel = builder(protocol, plugins);
    if (metamodel) {
      return metamodel;
    }
  }
  const metamodel = new DatasetSpecification();
  metamodel.name = protocol.name;
  metamodel.type = protocol.type;
  return metamodel;
};

export abstract class V1_DatasetEntitlementReport {
  dataset!: V1_DatasetSpecification;
}

export enum V1_DatasetEntitlementReportType {
  ACCESS_GRANTED = 'accessGranted',
  ACCESS_APPROVED = 'accessApproved',
  ACCESS_REQUESTED = 'accessRequested',
  ACCESS_NOT_GRANTED = 'accessNotGranted',
  UNSUPPORTED = 'unsupported',
}

export class V1_DatasetEntitlementAccessGrantedReport extends V1_DatasetEntitlementReport {}

const V1_datasetEntitlementAccessGrantedReportModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DatasetEntitlementAccessGrantedReport> =>
  createModelSchema(V1_DatasetEntitlementAccessGrantedReport, {
    _type: usingConstantValueSchema(
      V1_DatasetEntitlementReportType.ACCESS_GRANTED,
    ),
    dataset: custom(
      () => SKIP,
      (val) => V1_deserializeDatasetSpecification(val, plugins),
    ),
  });

export class V1_DatasetEntitlementAccessApprovedReport extends V1_DatasetEntitlementReport {}

const V1_datasetEntitlementAccessApprovedReportModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DatasetEntitlementAccessApprovedReport> =>
  createModelSchema(V1_DatasetEntitlementAccessApprovedReport, {
    _type: usingConstantValueSchema(
      V1_DatasetEntitlementReportType.ACCESS_APPROVED,
    ),
    dataset: custom(
      () => SKIP,
      (val) => V1_deserializeDatasetSpecification(val, plugins),
    ),
  });

export class V1_DatasetEntitlementAccessRequestedReport extends V1_DatasetEntitlementReport {}

const V1_datasetEntitlementAccessRequestedReportModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DatasetEntitlementAccessRequestedReport> =>
  createModelSchema(V1_DatasetEntitlementAccessRequestedReport, {
    _type: usingConstantValueSchema(
      V1_DatasetEntitlementReportType.ACCESS_REQUESTED,
    ),
    dataset: custom(
      () => SKIP,
      (val) => V1_deserializeDatasetSpecification(val, plugins),
    ),
  });

export class V1_DatasetEntitlementAccessNotGrantedReport extends V1_DatasetEntitlementReport {}

const V1_datasetEntitlementAccessNotGrantedReportModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DatasetEntitlementAccessNotGrantedReport> =>
  createModelSchema(V1_DatasetEntitlementAccessNotGrantedReport, {
    _type: usingConstantValueSchema(
      V1_DatasetEntitlementReportType.ACCESS_NOT_GRANTED,
    ),
    dataset: custom(
      () => SKIP,
      (val) => V1_deserializeDatasetSpecification(val, plugins),
    ),
  });

export class V1_DatasetEntitlementUnsupportedReport extends V1_DatasetEntitlementReport {}

const V1_datasetEntitlementUnsupportedReportModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DatasetEntitlementUnsupportedReport> =>
  createModelSchema(V1_DatasetEntitlementUnsupportedReport, {
    _type: usingConstantValueSchema(
      V1_DatasetEntitlementReportType.UNSUPPORTED,
    ),
    dataset: custom(
      () => SKIP,
      (val) => V1_deserializeDatasetSpecification(val, plugins),
    ),
  });

const V1_deserializeDatasetEntitlementReport = (
  json: PlainObject<V1_DatasetEntitlementReport>,
  plugins: PureProtocolProcessorPlugin[],
): V1_DatasetEntitlementReport => {
  switch (json._type) {
    case V1_DatasetEntitlementReportType.ACCESS_GRANTED:
      return deserialize(
        V1_datasetEntitlementAccessGrantedReportModelSchema(plugins),
        json,
      );
    case V1_DatasetEntitlementReportType.ACCESS_APPROVED:
      return deserialize(
        V1_datasetEntitlementAccessApprovedReportModelSchema(plugins),
        json,
      );
    case V1_DatasetEntitlementReportType.ACCESS_REQUESTED:
      return deserialize(
        V1_datasetEntitlementAccessRequestedReportModelSchema(plugins),
        json,
      );
    case V1_DatasetEntitlementReportType.ACCESS_NOT_GRANTED:
      return deserialize(
        V1_datasetEntitlementAccessNotGrantedReportModelSchema(plugins),
        json,
      );
    case V1_DatasetEntitlementReportType.UNSUPPORTED:
      return deserialize(
        V1_datasetEntitlementUnsupportedReportModelSchema(plugins),
        json,
      );
    default: {
      const extraDeserializers = plugins.flatMap(
        (plugin) =>
          plugin.V1_getExtraDatasetEntitlementReportProtocolDeserializers?.() ??
          [],
      );
      for (const deserializer of extraDeserializers) {
        const protocol = deserializer(json, plugins);
        if (protocol) {
          return protocol;
        }
      }
      throw new UnsupportedOperationError(
        `Can't deserialize dataset entitlement report of type '${json._type}': no compatible deserializer available from plugins`,
      );
    }
  }
};

export class V1_CheckEntitlementsResult {
  reports: V1_DatasetEntitlementReport[] = [];
}

export const V1_checkEntitlementsResultModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_CheckEntitlementsResult> =>
  createModelSchema(V1_CheckEntitlementsResult, {
    reports: list(
      custom(
        () => SKIP,
        (val) => V1_deserializeDatasetEntitlementReport(val, plugins),
      ),
    ),
  });

export const V1_buildDatasetEntitlementReport = (
  protocol: V1_DatasetEntitlementReport,
  plugins: PureProtocolProcessorPlugin[],
): DatasetEntitlementReport => {
  const extraBuilders = plugins.flatMap(
    (plugin) => plugin.V1_getExtraDatasetEntitlementReportBuilders?.() ?? [],
  );
  for (const builder of extraBuilders) {
    const metamodel = builder(protocol, plugins);
    if (metamodel) {
      return metamodel;
    }
  }

  if (protocol instanceof V1_DatasetEntitlementAccessGrantedReport) {
    const metamodel = new DatasetEntitlementAccessGrantedReport();
    metamodel.dataset = V1_buildDatasetSpecification(protocol.dataset, plugins);
    return metamodel;
  } else if (protocol instanceof V1_DatasetEntitlementAccessApprovedReport) {
    const metamodel = new DatasetEntitlementAccessApprovedReport();
    metamodel.dataset = V1_buildDatasetSpecification(protocol.dataset, plugins);
    return metamodel;
  } else if (protocol instanceof V1_DatasetEntitlementAccessRequestedReport) {
    const metamodel = new DatasetEntitlementAccessRequestedReport();
    metamodel.dataset = V1_buildDatasetSpecification(protocol.dataset, plugins);
    return metamodel;
  } else if (protocol instanceof V1_DatasetEntitlementAccessNotGrantedReport) {
    const metamodel = new DatasetEntitlementAccessNotGrantedReport();
    metamodel.dataset = V1_buildDatasetSpecification(protocol.dataset, plugins);
    return metamodel;
  } else if (protocol instanceof V1_DatasetEntitlementUnsupportedReport) {
    const metamodel = new DatasetEntitlementUnsupportedReport();
    metamodel.dataset = V1_buildDatasetSpecification(protocol.dataset, plugins);
    return metamodel;
  }

  throw new UnsupportedOperationError(
    `Can't build dataset entitlement report: no compatible builder available from plugins`,
    protocol,
  );
};
