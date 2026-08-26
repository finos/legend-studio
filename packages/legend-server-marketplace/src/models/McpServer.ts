/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  optionalCustomListWithSchema,
  optionalCustomUsingModelSchema,
} from '@finos/legend-shared';
import {
  type PropSchema,
  SKIP,
  alias,
  createModelSchema,
  custom,
  list,
  object,
  primitive,
} from 'serializr';

/**
 * The registry sends explicit nulls for absent values and `optional()` assigns those
 * through unchanged, so they have to be mapped to `undefined` at the property level.
 *
 * `SerializationFactory`'s `deserializeNullAsUndefined` does not cover this shape: it
 * prunes one level deep and only inside `fromJson`, which `object()` and `list(object())`
 * bypass. Servers reach us through `McpServerPage.fromJson`, so a flag on `McpServer`
 * would never run, and nested values such as `mcp_owner_dl` would stay `null` regardless.
 * Falsy values like `0` and `false` are preserved, which `optionalCustom` would drop.
 */
const optionalNullable = (): PropSchema =>
  custom(
    (value) => value ?? SKIP,
    (value) => value ?? SKIP,
  );

export class McpServerSecurityDetail {
  dataPrivacyClassification: string | undefined;
  dataSensitivityClassification: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(McpServerSecurityDetail, {
      dataPrivacyClassification: alias(
        'data_privacy_classification',
        optionalNullable(),
      ),
      dataSensitivityClassification: alias(
        'data_sensitivity_classification',
        optionalNullable(),
      ),
    }),
  );
}

export class McpServerOwnershipInfo {
  ownerDid: string | undefined;
  mcpOwnerSupportDl: string | undefined;
  mcpOwnerDl: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(McpServerOwnershipInfo, {
      ownerDid: alias('owner_did', optionalNullable()),
      mcpOwnerSupportDl: alias('mcp_owner_support_dl', optionalNullable()),
      mcpOwnerDl: alias('mcp_owner_dl', optionalNullable()),
    }),
  );
}

export class McpServerSupportInfo {
  title: string | undefined;
  message: string | undefined;
  documentationLink: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(McpServerSupportInfo, {
      title: optionalNullable(),
      message: optionalNullable(),
      documentationLink: alias('documentation_link', optionalNullable()),
    }),
  );
}

export class McpServer {
  name!: string;
  displayName!: string;
  description!: string;
  url!: string;
  type!: string;
  active!: boolean;
  requireApproval!: boolean;
  version!: number;
  tokenType: string | undefined;
  allowedAppIds: string[] | undefined;
  allowedPlatforms: string[] | undefined;
  category: string[] | undefined;
  sampleQuestions: string[] | undefined;
  securityDetail: McpServerSecurityDetail | undefined;
  ownershipInfo: McpServerOwnershipInfo | undefined;
  supportInfo: McpServerSupportInfo[] | undefined;
  createdAt: string | undefined;
  updatedAt: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(McpServer, {
      name: primitive(),
      displayName: alias('display_name', primitive()),
      description: primitive(),
      url: primitive(),
      type: primitive(),
      active: primitive(),
      requireApproval: alias('require_approval', primitive()),
      version: primitive(),
      tokenType: alias('token_type', optionalNullable()),
      allowedAppIds: alias('allowed_app_ids', optionalNullable()),
      allowedPlatforms: alias('allowed_platforms', optionalNullable()),
      category: optionalNullable(),
      sampleQuestions: alias('sample_questions', optionalNullable()),
      securityDetail: alias(
        'security_detail',
        optionalCustomUsingModelSchema(
          McpServerSecurityDetail.serialization.schema,
        ),
      ),
      ownershipInfo: alias(
        'mcp_ownership_info',
        optionalCustomUsingModelSchema(
          McpServerOwnershipInfo.serialization.schema,
        ),
      ),
      supportInfo: alias(
        'mcp_support_info',
        optionalCustomListWithSchema(McpServerSupportInfo.serialization.schema),
      ),
      createdAt: alias('created_at', optionalNullable()),
      updatedAt: alias('updated_at', optionalNullable()),
    }),
  );
}

export class McpServerPage {
  servers!: McpServer[];
  totalPages: number | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(McpServerPage, {
      servers: list(object(McpServer.serialization.schema)),
      totalPages: alias('total_pages', optionalNullable()),
    }),
  );
}

export class McpServerTool {
  name!: string;
  title: string | undefined;
  description: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(McpServerTool, {
      name: primitive(),
      title: optionalNullable(),
      description: optionalNullable(),
    }),
  );
}

export class McpServerToolsResponse {
  tools!: McpServerTool[];
  total!: number;

  static readonly serialization = new SerializationFactory(
    createModelSchema(McpServerToolsResponse, {
      tools: list(object(McpServerTool.serialization.schema)),
      total: primitive(),
    }),
  );
}
