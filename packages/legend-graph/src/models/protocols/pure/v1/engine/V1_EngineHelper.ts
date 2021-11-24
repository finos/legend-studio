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
  guaranteeNonEmptyString,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import {
  LightQuery,
  Query,
  QueryStereotype,
  QueryTaggedValue,
} from '../../../../../graphManager/action/query/Query';
import type { V1_LightQuery } from './query/V1_Query';
import { V1_Query } from './query/V1_Query';
import type { PureModel } from '../../../../../graph/PureModel';
import { PackageableElementExplicitReference } from '../../../../metamodels/pure/packageableElements/PackageableElementReference';
import { ServiceTestResult } from '../../../../../graphManager/action/service/ServiceTestResult';
import type { V1_ServiceTestResult } from './service/V1_ServiceTestResult';
import type { V1_ServiceRegistrationResult } from './service/V1_ServiceRegistrationResult';
import { ServiceRegistrationResult } from '../../../../../graphManager/action/service/ServiceRegistrationResult';
import {
  getImportMode,
  ImportConfigurationDescription,
} from '../../../../../graphManager/action/generation/ImportConfigurationDescription';
import type { V1_ImportConfigurationDescription } from './import/V1_ImportConfigurationDescription';
import { GenerationOutput } from '../../../../../graphManager/action/generation/GenerationOutput';
import type { V1_GenerationOutput } from './generation/V1_GenerationOutput';
import {
  GenerationConfigurationDescription,
  GenerationMode,
  GenerationProperty,
  GenerationPropertyItem,
  getGenerationPropertyItemType,
} from '../../../../../graphManager/action/generation/GenerationConfigurationDescription';
import type { V1_GenerationConfigurationDescription } from './generation/V1_GenerationConfigurationDescription';
import type { V1_CompilationError } from './compilation/V1_CompilationError';
import type { V1_ParserError } from './grammar/V1_ParserError';
import {
  CompilationError,
  ParserError,
} from '../../../../../graphManager/action/EngineError';
import type { V1_SourceInformation } from '../model/V1_SourceInformation';
import { SourceInformation } from '../../../../../graphManager/action/SourceInformation';
import { ExecutionError } from '../../../../../graphManager/action/ExecutionError';
import type { V1_ExecutionError } from './execution/V1_ExecutionError';
import type { QuerySearchSpecification } from '../../../../../graphManager/action/query/QuerySearchSpecification';
import {
  V1_QueryProjectCoordinates,
  V1_QuerySearchSpecification,
} from './query/V1_QuerySearchSpecification';
import { V1_TaggedValue } from '../model/packageableElements/domain/V1_TaggedValue';
import { V1_TagPtr } from '../model/packageableElements/domain/V1_TagPtr';
import { V1_StereotypePtr } from '../model/packageableElements/domain/V1_StereotypePtr';

export const V1_buildLightQuery = (
  protocol: V1_LightQuery,
  currentUserId: string | undefined,
): LightQuery => {
  const metamodel = new LightQuery();
  metamodel.name = guaranteeNonNullable(
    protocol.name,
    `Query 'name' field is missing`,
  );
  metamodel.id = guaranteeNonNullable(
    protocol.id,
    `Query 'id' field is missing`,
  );
  metamodel.versionId = guaranteeNonNullable(
    protocol.versionId,
    `Query 'versionId' field is missing`,
  );
  metamodel.groupId = guaranteeNonNullable(
    protocol.groupId,
    `Query 'groupId' field is missing`,
  );
  metamodel.artifactId = guaranteeNonNullable(
    protocol.artifactId,
    `Query 'artifactId' field is missing`,
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
  metamodel.name = guaranteeNonNullable(
    protocol.name,
    `Query 'name' field is missing`,
  );
  metamodel.id = guaranteeNonNullable(
    protocol.id,
    `Query 'id' field is missing`,
  );
  metamodel.versionId = guaranteeNonNullable(
    protocol.versionId,
    `Query 'versionId' field is missing`,
  );
  metamodel.groupId = guaranteeNonNullable(
    protocol.groupId,
    `Query 'groupId' field is missing`,
  );
  metamodel.artifactId = guaranteeNonNullable(
    protocol.artifactId,
    `Query 'artifactId' field is missing`,
  );
  metamodel.mapping = PackageableElementExplicitReference.create(
    graph.getMapping(
      guaranteeNonNullable(
        protocol.mapping,
        `Query 'mapping' field is missing`,
      ),
    ),
  );
  metamodel.runtime = PackageableElementExplicitReference.create(
    graph.getRuntime(
      guaranteeNonNullable(
        protocol.runtime,
        `Query 'runtime' field is missing`,
      ),
    ),
  );
  metamodel.content = guaranteeNonNullable(
    protocol.content,
    `Query 'content' field is missing`,
  );
  metamodel.owner = protocol.owner;
  metamodel.isCurrentUserQuery =
    currentUserId !== undefined && protocol.owner === currentUserId;

  // NOTE: we don't properly process tagged values and stereotypes for query
  // because these profiles/tags/stereotypes can come from external systems.
  metamodel.taggedValues = protocol.taggedValues?.map((taggedValueProtocol) => {
    const taggedValue = new QueryTaggedValue();
    taggedValue.profile = guaranteeNonEmptyString(
      taggedValueProtocol.tag.profile,
      `Tagged value 'tag.profile' field is missing or empty`,
    );
    taggedValue.tag = guaranteeNonEmptyString(
      taggedValueProtocol.tag.value,
      `Tagged value 'tag.value' field is missing or empty`,
    );
    taggedValue.value = guaranteeNonEmptyString(
      taggedValueProtocol.value,
      `Tagged value 'value' field is missing or empty`,
    );
    return taggedValue;
  });
  metamodel.stereotypes = protocol.stereotypes?.map((stereotypeProtocol) => {
    const stereotype = new QueryStereotype();
    stereotype.profile = guaranteeNonEmptyString(
      stereotypeProtocol.profile,
      `Stereotype pointer 'profile' field is missing or empty`,
    );
    stereotype.stereotype = guaranteeNonEmptyString(
      stereotypeProtocol.value,
      `Stereotype pointer 'value' field is missing or empty`,
    );
    return stereotype;
  });

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
  protocol.taggedValues = metamodel.taggedValues?.map((_taggedValue) => {
    const taggedValue = new V1_TaggedValue();
    taggedValue.tag = new V1_TagPtr();
    taggedValue.tag.profile = _taggedValue.profile;
    taggedValue.tag.value = _taggedValue.tag;
    taggedValue.value = _taggedValue.value;
    return taggedValue;
  });
  protocol.stereotypes = metamodel.stereotypes?.map((_stereotype) => {
    const stereotype = new V1_StereotypePtr();
    stereotype.profile = _stereotype.profile;
    stereotype.value = _stereotype.stereotype;
    return stereotype;
  });
  return protocol;
};

export const V1_transformQuerySearchSpecification = (
  metamodel: QuerySearchSpecification,
): V1_QuerySearchSpecification => {
  const protocol = new V1_QuerySearchSpecification();
  protocol.searchTerm = metamodel.searchTerm;
  protocol.limit = metamodel.limit;
  protocol.showCurrentUserQueriesOnly = metamodel.showCurrentUserQueriesOnly;
  protocol.projectCoordinates = metamodel.projectCoordinates?.map(
    (_projectCoordinate) => {
      const projectCoordinate = new V1_QueryProjectCoordinates();
      projectCoordinate.groupId = _projectCoordinate.groupId;
      projectCoordinate.artifactId = _projectCoordinate.artifactId;
      return projectCoordinate;
    },
  );
  protocol.taggedValues = metamodel.taggedValues?.map((_taggedValue) => {
    const taggedValue = new V1_TaggedValue();
    taggedValue.tag = new V1_TagPtr();
    taggedValue.tag.profile = _taggedValue.profile;
    taggedValue.tag.value = _taggedValue.tag;
    taggedValue.value = _taggedValue.value;
    return taggedValue;
  });
  protocol.stereotypes = metamodel.stereotypes?.map((_stereotype) => {
    const stereotype = new V1_StereotypePtr();
    stereotype.profile = _stereotype.profile;
    stereotype.value = _stereotype.stereotype;
    return stereotype;
  });
  return protocol;
};

export const V1_buildServiceTestResult = (
  protocol: V1_ServiceTestResult,
): ServiceTestResult => {
  const metamodel = new ServiceTestResult();
  metamodel.name = guaranteeNonNullable(
    protocol.name,
    `Service test result 'name' field is missing`,
  );
  metamodel.result = guaranteeNonNullable(
    protocol.result,
    `Service test result 'result' field is missing`,
  );
  return metamodel;
};

export const V1_buildServiceRegistrationResult = (
  protocol: V1_ServiceRegistrationResult,
): ServiceRegistrationResult => {
  guaranteeNonNullable(
    protocol.serverURL,
    `Service registration result 'serverUrl' field is missing`,
  );
  guaranteeNonNullable(
    protocol.pattern,
    `Service registration result 'pattern' field is missing`,
  );
  guaranteeNonNullable(
    protocol.serviceInstanceId,
    `Service registration 'serviceInstanceId' field is missing`,
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
    `Import configuration description 'key' field is missing`,
  );
  metamodel.label = guaranteeNonNullable(
    protocol.label,
    `Import configuration description 'label' field is missing`,
  );
  metamodel.modelImportMode = getImportMode(
    guaranteeNonNullable(
      protocol.modelImportMode,
      `Import configuration description 'modelImportMode' field is missing`,
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
    `Generation output 'content' field is missing`,
  );
  metamodel.fileName = guaranteeNonNullable(
    protocol.fileName,
    `Generation output 'fileName' field is missing`,
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
    `Generation configuration description 'key' field is missing`,
  );
  metamodel.label = guaranteeNonNullable(
    protocol.label,
    `Generation configuration description 'label' field is missing`,
  );
  metamodel.properties = protocol.properties.map((_property) => {
    const property = new GenerationProperty();
    property.name = guaranteeNonNullable(
      _property.name,
      `Generation property 'name' field is missing`,
    );
    property.description = guaranteeNonNullable(
      _property.description,
      `Generation property 'description' field is missing`,
    );
    property.type = getGenerationPropertyItemType(
      guaranteeNonNullable(
        _property.type,
        `Generation property 'type' field is missing`,
      ),
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
  metamodel.generationMode = guaranteeNonNullable(
    Object.values(GenerationMode).find(
      (mode) => mode === protocol.generationMode,
    ),
    `Generation configuration description 'generationMode' field is missing or not supported`,
  );
  return metamodel;
};

const buildSourceInformation = (
  sourceInformation: V1_SourceInformation,
): SourceInformation =>
  new SourceInformation(
    guaranteeNonNullable(
      sourceInformation.sourceId,
      `Source information 'sourceId' field is missing`,
    ),
    guaranteeNonNullable(
      sourceInformation.startLine,
      `Source information 'startLine' field is missing`,
    ),
    guaranteeNonNullable(
      sourceInformation.startColumn,
      `Source information 'startColumn' field is missing`,
    ),
    guaranteeNonNullable(
      sourceInformation.endLine,
      `Source information 'endLine' field is missing`,
    ),
    guaranteeNonNullable(
      sourceInformation.endColumn,
      `Source information 'endColumn' field is missing`,
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

export const V1_buildExecutionError = (
  protocol: V1_ExecutionError,
): ExecutionError => {
  const executionError = new ExecutionError();
  executionError.message = protocol.message;
  executionError.stack = protocol.trace;
  return executionError;
};
