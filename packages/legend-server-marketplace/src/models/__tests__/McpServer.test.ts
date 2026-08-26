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

import { test, describe, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  McpServer,
  McpServerPage,
  McpServerToolsResponse,
} from '../McpServer.js';

const TEST_DATA__mcpServerJson = {
  created_by: 'testuser1',
  updated_by: 'testuser2',
  created_at: '2020-01-02T03:04:05.000000',
  updated_at: '2020-02-03T04:05:06.000000',
  url: 'https://example.test/api/mcp/services/server/SampleService?client_name=sample',
  description: 'Sample MCP server used for testing.',
  display_name: 'Sample Vendor - Sample Catalog',
  type: 'STREAMABLE',
  require_approval: false,
  version: 12345,
  active: true,
  dml_ops_type: 'UPDATE',
  allowed_app_ids: ['sample-app'],
  category: ['sample-category'],
  security_detail: {
    permit_policy_domain: null,
    resource: null,
    action: null,
    data_privacy_classification: 'Sample Privacy Class',
    data_sensitivity_classification: 'Sample Sensitivity Class',
  },
  sample_questions: ['What is in the sample catalog?'],
  allowed_platforms: ['SAMPLE_PLATFORM'],
  functions: null,
  mcp_ownership_info: {
    owner_did: '12345',
    mcp_owner_support_dl: 'sample-support@example.test',
    mcp_owner_dl: 'sample-owner@example.test',
  },
  token_type: 'BEARER',
  mcp_support_info: null,
  name: 'sample-mcp',
};

const TEST_DATA__nullHeavyMcpServerJson = {
  ...TEST_DATA__mcpServerJson,
  name: 'sparse-mcp',
  display_name: 'Sparse Sample Server',
  url: 'https://example.test/mcp',
  token_type: null,
  category: null,
  allowed_platforms: null,
  sample_questions: null,
  security_detail: null,
  mcp_support_info: [
    {
      title: 'Sample Support',
      message: 'Raise a sample ticket.',
      documentation_link: 'https://example.test/docs',
    },
  ],
};

describe(unitTest('McpServer deserialization'), () => {
  test('deserializes a fully populated server', () => {
    const server = McpServer.serialization.fromJson(TEST_DATA__mcpServerJson);

    expect(server.name).toBe('sample-mcp');
    expect(server.displayName).toBe('Sample Vendor - Sample Catalog');
    expect(server.type).toBe('STREAMABLE');
    expect(server.active).toBe(true);
    expect(server.requireApproval).toBe(false);
    expect(server.version).toBe(12345);
    expect(server.tokenType).toBe('BEARER');
    expect(server.allowedAppIds).toEqual(['sample-app']);
    expect(server.allowedPlatforms).toEqual(['SAMPLE_PLATFORM']);
    expect(server.category).toEqual(['sample-category']);
    expect(server.sampleQuestions).toHaveLength(1);
    expect(server.createdAt).toBe('2020-01-02T03:04:05.000000');
    expect(server.securityDetail?.dataPrivacyClassification).toBe(
      'Sample Privacy Class',
    );
    expect(server.securityDetail?.dataSensitivityClassification).toBe(
      'Sample Sensitivity Class',
    );
    expect(server.ownershipInfo?.ownerDid).toBe('12345');
    expect(server.ownershipInfo?.mcpOwnerDl).toBe('sample-owner@example.test');
  });

  test('maps null fields to undefined rather than null', () => {
    const server = McpServer.serialization.fromJson(
      TEST_DATA__nullHeavyMcpServerJson,
    );

    expect(server.tokenType).toBeUndefined();
    expect(server.category).toBeUndefined();
    expect(server.allowedPlatforms).toBeUndefined();
    expect(server.sampleQuestions).toBeUndefined();
    expect(server.securityDetail).toBeUndefined();
  });

  test('preserves falsy scalars rather than dropping them', () => {
    const server = McpServer.serialization.fromJson({
      ...TEST_DATA__mcpServerJson,
      active: false,
      require_approval: false,
      version: 0,
    });

    expect(server.active).toBe(false);
    expect(server.requireApproval).toBe(false);
    expect(server.version).toBe(0);
  });

  test('deserializes the support info list', () => {
    const server = McpServer.serialization.fromJson(
      TEST_DATA__nullHeavyMcpServerJson,
    );

    expect(server.supportInfo).toHaveLength(1);
    expect(server.supportInfo?.[0]?.title).toBe('Sample Support');
    expect(server.supportInfo?.[0]?.documentationLink).toBe(
      'https://example.test/docs',
    );
  });
});

describe(unitTest('McpServerPage deserialization'), () => {
  test('maps nulls to undefined at every depth through the page payload', () => {
    const page = McpServerPage.serialization.fromJson({
      servers: [
        {
          ...TEST_DATA__mcpServerJson,
          token_type: null,
          mcp_ownership_info: {
            owner_did: '12345',
            mcp_owner_support_dl: null,
            mcp_owner_dl: null,
          },
        },
      ],
      total_pages: 1,
    });
    const server = page.servers[0];

    expect(server?.tokenType).toBeUndefined();
    expect(server?.ownershipInfo?.ownerDid).toBe('12345');
    expect(server?.ownershipInfo?.mcpOwnerDl).toBeUndefined();
    expect(server?.ownershipInfo?.mcpOwnerSupportDl).toBeUndefined();
  });

  test('deserializes a page of servers', () => {
    const page = McpServerPage.serialization.fromJson({
      servers: [TEST_DATA__mcpServerJson],
      total: 12345,
      page: 1,
      page_size: 100,
      total_pages: 124,
    });

    expect(page.totalPages).toBe(124);
    expect(page.servers).toHaveLength(1);
    expect(page.servers[0]?.name).toBe('sample-mcp');
  });

  test('preserves a zero total page count rather than dropping it', () => {
    const page = McpServerPage.serialization.fromJson({
      servers: [],
      total_pages: 0,
    });

    expect(page.totalPages).toBe(0);
  });
});

describe(unitTest('McpServerToolsResponse deserialization'), () => {
  test('deserializes tools', () => {
    const response = McpServerToolsResponse.serialization.fromJson({
      server_name: 'sample-mcp',
      tools: [
        {
          name: 'getSampleValue_a1b2c',
          title: 'Legend Service (Sample_MCP_getSampleValueByCode__code_)',
          description:
            "This tool executes the service with pattern '/Sample/MCP/getSampleValueByCode/{code}'.",
          outputSchema: null,
          annotations: null,
        },
      ],
      total: 1,
    });

    expect(response.total).toBe(1);
    expect(response.tools).toHaveLength(1);
    const tool = response.tools[0];
    expect(tool?.name).toBe('getSampleValue_a1b2c');
    expect(tool?.title).toBe(
      'Legend Service (Sample_MCP_getSampleValueByCode__code_)',
    );
  });
});
