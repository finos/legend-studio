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
  SerializationFactory,
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  list,
  optional,
  primitive,
} from 'serializr';
import type { RelationType } from '../../../graph/metamodel/pure/packageableElements/relation/RelationType.js';

export enum IngestionArtifactProducerType {
  APP_DIR = 'AppDir',
  KERBEROS = 'Kerberos',
}

export enum IngestionArtifactQueryType {
  SQL_EXPRESSION = 'SQLExpression',
}

export abstract class IngestionArtifactProducer {}

export class IngestionArtifactAppDirProducer extends IngestionArtifactProducer {
  appDirId!: number;

  static readonly serialization = new SerializationFactory(
    createModelSchema(IngestionArtifactAppDirProducer, {
      _type: usingConstantValueSchema(IngestionArtifactProducerType.APP_DIR),
      appDirId: primitive(),
    }),
  );
}

export class IngestionArtifactKerberosProducer extends IngestionArtifactProducer {
  kerberos!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(IngestionArtifactKerberosProducer, {
      _type: usingConstantValueSchema(IngestionArtifactProducerType.KERBEROS),
      kerberos: primitive(),
    }),
  );
}

const serializeIngestionArtifactProducer = (
  producer: IngestionArtifactProducer,
): PlainObject<IngestionArtifactProducer> => {
  if (producer instanceof IngestionArtifactAppDirProducer) {
    return IngestionArtifactAppDirProducer.serialization.toJson(producer);
  } else if (producer instanceof IngestionArtifactKerberosProducer) {
    return IngestionArtifactKerberosProducer.serialization.toJson(producer);
  }
  throw new UnsupportedOperationError(
    `Can't serialize ingestion artifact producer`,
    producer,
  );
};

const deserializeIngestionArtifactProducer = (
  json: PlainObject<IngestionArtifactProducer>,
): IngestionArtifactProducer => {
  switch (json._type) {
    case IngestionArtifactProducerType.APP_DIR:
      return IngestionArtifactAppDirProducer.serialization.fromJson(json);
    case IngestionArtifactProducerType.KERBEROS:
      return IngestionArtifactKerberosProducer.serialization.fromJson(json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize ingestion artifact producer of type '${json._type}'`,
      );
  }
};

export class IngestionArtifactIngestDefinitionRef {
  path!: string;
  producer!: IngestionArtifactProducer;

  static readonly serialization = new SerializationFactory(
    createModelSchema(IngestionArtifactIngestDefinitionRef, {
      path: primitive(),
      producer: custom(
        serializeIngestionArtifactProducer,
        deserializeIngestionArtifactProducer,
      ),
    }),
  );
}

export class IngestionArtifactStoreClusterKeys {
  dataset!: string;
  clusterKeys: string[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(IngestionArtifactStoreClusterKeys, {
      dataset: primitive(),
      clusterKeys: list(primitive()),
    }),
  );
}

export class IngestionArtifactDependentDataset {
  schema!: string;
  dataset!: string;
  ingestDefinition!: IngestionArtifactIngestDefinitionRef;

  static readonly serialization = new SerializationFactory(
    createModelSchema(IngestionArtifactDependentDataset, {
      schema: primitive(),
      dataset: primitive(),
      ingestDefinition: usingModelSchema(
        IngestionArtifactIngestDefinitionRef.serialization.schema,
      ),
    }),
  );
}

export class IngestionArtifactDataProductRef {
  path!: string;
  deploymentId!: string;
  description: string | undefined;
  title: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(IngestionArtifactDataProductRef, {
      path: primitive(),
      deploymentId: primitive(),
      description: optional(primitive()),
      title: optional(primitive()),
    }),
  );
}

export class IngestionArtifactDependentAccessPoint {
  accessPoint!: string;
  dataProduct!: IngestionArtifactDataProductRef;

  static readonly serialization = new SerializationFactory(
    createModelSchema(IngestionArtifactDependentAccessPoint, {
      accessPoint: primitive(),
      dataProduct: usingModelSchema(
        IngestionArtifactDataProductRef.serialization.schema,
      ),
    }),
  );
}

export class IngestionArtifactSQLQuery {
  sql!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(IngestionArtifactSQLQuery, {
      _type: usingConstantValueSchema(
        IngestionArtifactQueryType.SQL_EXPRESSION,
      ),
      sql: primitive(),
    }),
  );
}

export class IngestionArtifactMatViewImplementation {
  datasetName!: string;
  refreshType!: string;
  autoTrigger = false;
  primaryKey: string[] = [];
  dependentDatasets: IngestionArtifactDependentDataset[] = [];
  dependentAccessPoints: IngestionArtifactDependentAccessPoint[] = [];
  viewFunctionQuery!: IngestionArtifactSQLQuery;
  barrierQuery: IngestionArtifactSQLQuery | undefined;
  selectQuery: IngestionArtifactSQLQuery | undefined;
  /**
   * Metamodel `RelationType` built from the raw `V1_RelationType` payload
   * carried by the artifact. Populated lazily in `IngestionDefinitionArtifact.fromJson`
   * via a caller-supplied builder (which owns the V1 → metamodel translation
   * and access to the `PureModel` needed to resolve column types). Left
   * `undefined` if the payload is missing or building fails.
   */
  schema: RelationType | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(IngestionArtifactMatViewImplementation, {
      datasetName: primitive(),
      refreshType: primitive(),
      autoTrigger: primitive(),
      primaryKey: list(primitive()),
      dependentDatasets: list(
        usingModelSchema(
          IngestionArtifactDependentDataset.serialization.schema,
        ),
      ),
      dependentAccessPoints: list(
        usingModelSchema(
          IngestionArtifactDependentAccessPoint.serialization.schema,
        ),
      ),
      viewFunctionQuery: usingModelSchema(
        IngestionArtifactSQLQuery.serialization.schema,
      ),
      barrierQuery: optional(
        usingModelSchema(IngestionArtifactSQLQuery.serialization.schema),
      ),
      selectQuery: optional(
        usingModelSchema(IngestionArtifactSQLQuery.serialization.schema),
      ),
    }),
  );
}

export class IngestionDefinitionArtifact {
  ingestDefinition!: IngestionArtifactIngestDefinitionRef;
  storeClusterKeys: IngestionArtifactStoreClusterKeys[] = [];
  matViewImplementations: IngestionArtifactMatViewImplementation[] = [];
  content!: PlainObject;

  static readonly serialization = new SerializationFactory(
    createModelSchema(IngestionDefinitionArtifact, {
      ingestDefinition: usingModelSchema(
        IngestionArtifactIngestDefinitionRef.serialization.schema,
      ),
      storeClusterKeys: list(
        usingModelSchema(
          IngestionArtifactStoreClusterKeys.serialization.schema,
        ),
      ),
      matViewImplementations: list(
        usingModelSchema(
          IngestionArtifactMatViewImplementation.serialization.schema,
        ),
      ),
    }),
  );

  static fromJson(
    json: PlainObject<IngestionDefinitionArtifact>,
    buildRelationType?: (rawSchema: PlainObject) => RelationType | undefined,
  ): IngestionDefinitionArtifact {
    const artifact = IngestionDefinitionArtifact.serialization.fromJson(json);
    artifact.content = json;
    if (buildRelationType) {
      const rawMatViews =
        (json.matViewImplementations as PlainObject[] | undefined) ?? [];
      artifact.matViewImplementations.forEach((matView, idx) => {
        const rawSchema = rawMatViews[idx]?.schema as PlainObject | undefined;
        if (rawSchema) {
          try {
            matView.schema = buildRelationType(rawSchema);
          } catch {
            // Swallow any build error: unresolved types or malformed payload
            // should not fail artifact loading. The viewer will simply omit
            // the schema section.
            matView.schema = undefined;
          }
        }
      });
    }
    return artifact;
  }
}
