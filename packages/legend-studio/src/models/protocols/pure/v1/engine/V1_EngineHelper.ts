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

import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  LightQuery,
  Query,
} from '../../../../metamodels/pure/action/query/Query';
import type { V1_LightQuery } from './query/V1_Query';
import { V1_Query } from './query/V1_Query';
import type { PureModel } from '../../../../metamodels/pure/graph/PureModel';
import { PackageableElementExplicitReference } from '../../../../metamodels/pure/model/packageableElements/PackageableElementReference';
import { ServiceTestResult } from '../../../../metamodels/pure/action/service/ServiceTestResult';
import type { V1_ServiceTestResult } from './service/V1_ServiceTestResult';
import type { V1_ServiceRegistrationResult } from './service/V1_ServiceRegistrationResult';
import { ServiceRegistrationResult } from '../../../../metamodels/pure/action/service/ServiceRegistrationResult';
import {
  getImportMode,
  ImportConfigurationDescription,
} from '../../../../metamodels/pure/action/generation/ImportConfigurationDescription';
import type { V1_ImportConfigurationDescription } from './import/V1_ImportConfigurationDescription';
import { GenerationOutput } from '../../../../metamodels/pure/action/generation/GenerationOutput';
import type { V1_GenerationOutput } from './generation/V1_GenerationOutput';
import {
  GenerationConfigurationDescription,
  GenerationProperty,
  GenerationPropertyItem,
  getGenerationPropertyItemType,
} from '../../../../metamodels/pure/action/generation/GenerationConfigurationDescription';
import type { V1_GenerationConfigurationDescription } from './generation/V1_GenerationConfigurationDescription';
import { getGenerationMode } from '../../../../metamodels/pure/model/packageableElements/fileGeneration/FileGenerationSpecification';
import type { V1_CompilationError } from './compilation/V1_CompilationError';
import type { V1_ParserError } from './grammar/V1_ParserError';
import {
  CompilationError,
  ParserError,
} from '../../../../metamodels/pure/action/EngineError';
import type { V1_SourceInformation } from '../model/V1_SourceInformation';
import { SourceInformation } from '../../../../metamodels/pure/action/SourceInformation';

export const V1_buildLightQuery = (
  protocol: V1_LightQuery,
  currentUserId: string | undefined,
): LightQuery => {
  const metamodel = new LightQuery();
  metamodel.name = guaranteeNonNullable(protocol.name, `Query name is missing`);
  metamodel.id = guaranteeNonNullable(protocol.id, `Query ID is missing`);
  metamodel.versionId = guaranteeNonNullable(
    protocol.versionId,
    `Query version is missing`,
  );
  metamodel.groupId = guaranteeNonNullable(
    protocol.groupId,
    `Query project group ID is missing`,
  );
  metamodel.artifactId = guaranteeNonNullable(
    protocol.artifactId,
    `Query project artifact ID is missing`,
  );
  metamodel.owner = protocol.owner;
  metamodel.isCurrentUserQuery =
    currentUserId !== undefined && protocol.owner === currentUserId;
  return metamodel;
};

export const V1_buildQuery = (
  protocol: V1_Query,
  graph: PureModel,
  currentUserId: string | undefined,
): Query => {
  const metamodel = new Query();
  metamodel.name = guaranteeNonNullable(protocol.name, `Query name is missing`);
  metamodel.id = guaranteeNonNullable(protocol.id, `Query ID is missing`);
  metamodel.versionId = guaranteeNonNullable(
    protocol.versionId,
    `Query version is missing`,
  );
  metamodel.groupId = guaranteeNonNullable(
    protocol.groupId,
    `Query project group ID is missing`,
  );
  metamodel.artifactId = guaranteeNonNullable(
    protocol.artifactId,
    `Query project artifact ID is missing`,
  );
  metamodel.mapping = PackageableElementExplicitReference.create(
    graph.getMapping(
      guaranteeNonNullable(protocol.mapping, `Query mapping is missing`),
    ),
  );
  metamodel.runtime = PackageableElementExplicitReference.create(
    graph.getRuntime(
      guaranteeNonNullable(protocol.runtime, `Query runtime is missing`),
    ),
  );
  metamodel.content = guaranteeNonNullable(
    protocol.content,
    `Query content is missing`,
  );
  metamodel.owner = protocol.owner;
  metamodel.isCurrentUserQuery =
    currentUserId !== undefined && protocol.owner === currentUserId;
  return metamodel;
};

export const V1_transformQuery = (metamodel: Query): V1_Query => {
  const protocol = new V1_Query();
  protocol.name = metamodel.name;
  protocol.id = metamodel.id;
  protocol.name = metamodel.name;
  protocol.versionId = metamodel.versionId;
  protocol.groupId = metamodel.groupId;
  protocol.artifactId = metamodel.artifactId;
  protocol.mapping = metamodel.mapping.valueForSerialization ?? '';
  protocol.runtime = metamodel.runtime.valueForSerialization ?? '';
  protocol.content = metamodel.content;
  protocol.owner = metamodel.owner;
  return protocol;
};

export const V1_buildServiceTestResult = (
  protocol: V1_ServiceTestResult,
): ServiceTestResult => {
  const metamodel = new ServiceTestResult();
  metamodel.name = guaranteeNonNullable(
    protocol.name,
    'Service test result test name is missing',
  );
  metamodel.result = guaranteeNonNullable(
    protocol.result,
    'Service test result result is missing',
  );
  return metamodel;
};

export const V1_buildServiceRegistrationResult = (
  protocol: V1_ServiceRegistrationResult,
): ServiceRegistrationResult => {
  guaranteeNonNullable(
    protocol.serverURL,
    'Service registration result server URL is missing',
  );
  guaranteeNonNullable(
    protocol.pattern,
    'Service registration result pattern is missing',
  );
  guaranteeNonNullable(
    protocol.serviceInstanceId,
    'Service registration serviceInstanceId is missing',
  );
  return new ServiceRegistrationResult(
    protocol.serverURL,
    protocol.pattern,
    protocol.serviceInstanceId,
  );
};

export const V1_buildImportConfigurationDescription = (
  protocol: V1_ImportConfigurationDescription,
): ImportConfigurationDescription => {
  const metamodel = new ImportConfigurationDescription();
  metamodel.key = guaranteeNonNullable(
    protocol.key,
    'Generation configuration description name is missing',
  );
  metamodel.label = guaranteeNonNullable(
    protocol.label,
    'Generation configuration description label is missing',
  );
  metamodel.modelImportMode = getImportMode(
    guaranteeNonNullable(
      protocol.modelImportMode,
      'Generation configuration description mode is missing',
    ),
  );
  return metamodel;
};

export const V1_buildGenerationOutput = (
  protocol: V1_GenerationOutput,
): GenerationOutput => {
  const metamodel = new GenerationOutput();
  metamodel.content = guaranteeNonNullable(
    protocol.content,
    'Generation output content is missing',
  );
  metamodel.fileName = guaranteeNonNullable(
    protocol.fileName,
    'Generation output file name is missing',
  );
  metamodel.format = protocol.format;
  return metamodel;
};

export const V1_buildGenerationConfigurationDescription = (
  protocol: V1_GenerationConfigurationDescription,
): GenerationConfigurationDescription => {
  const metamodel = new GenerationConfigurationDescription();
  metamodel.key = guaranteeNonNullable(
    protocol.key,
    'Generation configuration description key is missing',
  );
  metamodel.label = guaranteeNonNullable(
    protocol.label,
    'Generation configuration description label is missing',
  );
  metamodel.properties = protocol.properties.map((_property) => {
    const property = new GenerationProperty();
    property.name = guaranteeNonNullable(
      _property.name,
      'Generation property name is missing',
    );
    property.description = guaranteeNonNullable(
      _property.description,
      'Generation description is missing',
    );
    property.type = getGenerationPropertyItemType(
      guaranteeNonNullable(_property.type, 'Generation type is missing'),
    );
    if (_property.items) {
      const generationPropertyItem = new GenerationPropertyItem();
      generationPropertyItem.types = _property.items.types.map(
        getGenerationPropertyItemType,
      );
      generationPropertyItem.enums = _property.items.enums;
      property.items = generationPropertyItem;
    }
    property.defaultValue = _property.defaultValue;
    property.required = _property.required;
    return property;
  });
  metamodel.generationMode = getGenerationMode(
    guaranteeNonNullable(
      protocol.generationMode,
      'Generation configuration description mode is missing',
    ),
  );
  return metamodel;
};

const buildSourceInformation = (
  sourceInformation: V1_SourceInformation,
): SourceInformation =>
  new SourceInformation(
    guaranteeNonNullable(
      sourceInformation.sourceId,
      'Source information source ID is missing',
    ),
    guaranteeNonNullable(
      sourceInformation.startLine,
      'Source information start line is missing',
    ),
    guaranteeNonNullable(
      sourceInformation.startColumn,
      'Source information start column is missing',
    ),
    guaranteeNonNullable(
      sourceInformation.endLine,
      'Source information end line is missing',
    ),
    guaranteeNonNullable(
      sourceInformation.endColumn,
      'Source information end column is missing',
    ),
  );

export const V1_buildCompilationError = (
  protocol: V1_CompilationError,
): CompilationError => {
  const metamodel = new CompilationError();
  metamodel.message = protocol.message;
  metamodel.sourceInformation = protocol.sourceInformation
    ? buildSourceInformation(protocol.sourceInformation)
    : undefined;
  return metamodel;
};

export const V1_buildParserError = (protocol: V1_ParserError): ParserError => {
  const metamodel = new ParserError();
  metamodel.message = protocol.message;
  metamodel.sourceInformation = protocol.sourceInformation
    ? buildSourceInformation(protocol.sourceInformation)
    : undefined;
  return metamodel;
};
