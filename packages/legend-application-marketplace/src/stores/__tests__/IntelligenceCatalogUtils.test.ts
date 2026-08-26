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
import { McpServer } from '@finos/legend-server-marketplace';
import {
  formatMcpTimestamp,
  buildMcpServerVendorIndex,
  OTHER_VENDOR,
  hasMeaningfulMcpDescription,
  isLegendMcpServer,
  resolveMcpServerImageUrl,
} from '../intelligence/IntelligenceCatalogUtils.js';

const createTestMcpServer = (name: string, url: string): McpServer => {
  const server = new McpServer();
  server.name = name;
  server.url = url;
  server.displayName = name;
  server.description = 'Sample MCP server used for testing.';
  server.type = 'STREAMABLE';
  server.active = true;
  server.requireApproval = false;
  server.version = 1;
  return server;
};

describe(unitTest('isLegendMcpServer'), () => {
  test('accepts a service published on the execution server MCP route', () => {
    expect(
      isLegendMcpServer(
        createTestMcpServer(
          'sample-service-mcp',
          'https://example.test/api/mcp/services/server/SampleService?client_name=sample',
        ),
      ),
    ).toBe(true);
  });

  test('accepts the Legend AI orchestrator', () => {
    expect(
      isLegendMcpServer(
        createTestMcpServer('legend-ai-mcp', 'https://example.test/mcp'),
      ),
    ).toBe(true);
  });

  test('rejects servers belonging to other applications', () => {
    expect(
      isLegendMcpServer(
        createTestMcpServer('other-app-mcp', 'https://example.test/mcp'),
      ),
    ).toBe(false);
  });

  test('rejects a server whose route only partially matches', () => {
    expect(
      isLegendMcpServer(
        createTestMcpServer(
          'partial-match-mcp',
          'https://example.test/api/mcp',
        ),
      ),
    ).toBe(false);
  });
});

describe(unitTest('buildMcpServerVendorIndex'), () => {
  const indexOf = (
    ...displayNames: string[]
  ): { vendorOf: (displayName: string) => string | undefined } => {
    const servers = displayNames.map((displayName, position) => {
      const server = createTestMcpServer(
        `sample-mcp-${position}`,
        'https://example.test/mcp',
      );
      server.displayName = displayName;
      return server;
    });
    const index = buildMcpServerVendorIndex(servers);
    return {
      vendorOf: (displayName: string): string | undefined =>
        index.get(`sample-mcp-${displayNames.indexOf(displayName)}`),
    };
  };

  test('reads the vendor from a name that declares one', () => {
    const { vendorOf } = indexOf('Sample Vendor - Sample Catalog');

    expect(vendorOf('Sample Vendor - Sample Catalog')).toBe('Sample Vendor');
  });

  test('accepts an en dash and a missing space on either side', () => {
    const { vendorOf } = indexOf(
      'Sample Vendor – En Dash',
      'Sample Vendor- No Leading Space',
      'Sample Vendor -No Trailing Space',
    );

    expect(vendorOf('Sample Vendor – En Dash')).toBe('Sample Vendor');
    expect(vendorOf('Sample Vendor- No Leading Space')).toBe('Sample Vendor');
    expect(vendorOf('Sample Vendor -No Trailing Space')).toBe('Sample Vendor');
  });

  test('keeps a hyphen that belongs to the vendor name', () => {
    const { vendorOf } = indexOf('E-Trade - Market Data');

    expect(vendorOf('E-Trade - Market Data')).toBe('E-Trade');
  });

  test('attaches a name without a separator to a vendor the catalog declares', () => {
    const { vendorOf } = indexOf(
      'Sample Vendor - Sample Catalog',
      'Sample Vendor Reference Data',
    );

    expect(vendorOf('Sample Vendor Reference Data')).toBe('Sample Vendor');
  });

  test('files a name that matches no declared vendor under the catch-all', () => {
    const { vendorOf } = indexOf(
      'Sample Vendor - Sample Catalog',
      'Internal Tooling Service',
    );

    expect(vendorOf('Internal Tooling Service')).toBe(OTHER_VENDOR);
  });

  test('matches whole tokens so an unrelated name is not claimed', () => {
    const { vendorOf } = indexOf('Ice - Bond Pricing', 'Service Catalog');

    expect(vendorOf('Service Catalog')).toBe(OTHER_VENDOR);
  });

  test('labels one vendor spelled two ways with its most used spelling', () => {
    const { vendorOf } = indexOf(
      'Sample Vendor - One',
      'Sample Vendor - Two',
      'SAMPLE VENDOR - Three',
    );

    expect(vendorOf('SAMPLE VENDOR - Three')).toBe('Sample Vendor');
  });

  test('prefers the longest declared vendor when several could match', () => {
    const { vendorOf } = indexOf(
      'Sample Vendor - One',
      'Sample Vendor Markets - Two',
      'Sample Vendor Markets Reference',
    );

    expect(vendorOf('Sample Vendor Markets Reference')).toBe(
      'Sample Vendor Markets',
    );
  });

  test('files everything under the catch-all when no name declares a vendor', () => {
    const { vendorOf } = indexOf('Alpha Data Feed', 'Beta Reference');

    expect(vendorOf('Alpha Data Feed')).toBe(OTHER_VENDOR);
    expect(vendorOf('Beta Reference')).toBe(OTHER_VENDOR);
  });
});

describe(unitTest('hasMeaningfulMcpDescription'), () => {
  const withDescription = (description: string): boolean => {
    const server = createTestMcpServer(
      'sample-mcp',
      'https://example.test/mcp',
    );
    server.description = description;
    return hasMeaningfulMcpDescription(server);
  };

  test('rejects the generated registration description', () => {
    expect(
      withDescription(
        "MCP server to provide access to registered services in Legend platform tagged to the MCP server 'Sample'",
      ),
    ).toBe(false);
  });

  test('accepts an authored description', () => {
    expect(withDescription('Sample catalog of reference data.')).toBe(true);
  });
});

describe(unitTest('resolveMcpServerImageUrl'), () => {
  const TEST_DATA__vendorImages = new Map([
    ['Test Vendor One', '/assets/vendors/test-vendor-one.png'],
  ]);

  const imageUrlFor = (vendor: string, fallbackKey = 'sample-mcp'): string =>
    resolveMcpServerImageUrl(TEST_DATA__vendorImages, vendor, fallbackKey);

  test('uses the vendor artwork when the vendor is known', () => {
    expect(imageUrlFor('Test Vendor One')).toBe(
      '/assets/vendors/test-vendor-one.png',
    );
  });

  test('matches the vendor regardless of case', () => {
    expect(imageUrlFor('TEST VENDOR ONE')).toBe(
      '/assets/vendors/test-vendor-one.png',
    );
  });

  test('falls back to a generic image for an unknown vendor', () => {
    expect(imageUrlFor('Test Vendor Two')).toMatch(
      /^\/assets\/images\d+\.jpg$/u,
    );
  });

  test('keys the generic image on the server name rather than the vendor', () => {
    expect(imageUrlFor('Test Vendor Two')).toBe(
      imageUrlFor('Test Vendor Three'),
    );
  });
});

describe(unitTest('formatMcpTimestamp'), () => {
  test('leaves an absent timestamp absent', () => {
    expect(formatMcpTimestamp(undefined)).toBeUndefined();
  });

  test('surfaces an unparseable timestamp as authored', () => {
    expect(formatMcpTimestamp('not-a-timestamp')).toBe('not-a-timestamp');
  });

  test('formats a microsecond-precision registry timestamp', () => {
    const formatted = formatMcpTimestamp('2026-02-26T01:31:24.841000');

    expect(formatted).toContain('2026');
    expect(formatted).not.toContain('841000');
    expect(formatted).not.toContain('T');
  });
});
