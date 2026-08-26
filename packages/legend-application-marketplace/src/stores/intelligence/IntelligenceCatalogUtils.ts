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

import type { McpServer } from '@finos/legend-server-marketplace';
import {
  buildGenericCardImageUrl,
  findVendorImageUrl,
  getGenericCardImageIndex,
} from '../CardImageUtils.js';

const LEGEND_MCP_SERVICE_URL_FRAGMENT = '/api/mcp/services/server/';
const LEGEND_AI_MCP_SERVER_NAME = 'legend-ai-mcp';
const MCP_GENERATED_DESCRIPTION_PREFIX =
  'MCP server to provide access to registered services';
const MCP_VENDOR_SEPARATOR_PATTERN = /\s[-–]|[-–]\s/u;
const MCP_VENDOR_TOKEN_PATTERN = /[A-Za-z0-9&']+/gu;
const MAX_CARD_DESCRIPTION_LENGTH = 180;

export const NO_DESCRIPTION_PLACEHOLDER = 'No description provided';
export const NO_VALUE_PLACEHOLDER = 'Not specified';
export const MAX_CARD_CATEGORY_CHIPS = 3;

const MCP_TIMESTAMP_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

export const CATALOG_LIVE_TAG = 'Live';

export const OTHER_VENDOR = 'Other';

/**
 * The card fields the catalog search reads, satisfied by both registry servers
 * and the built-in agent so a single matcher covers every catalog entry.
 */
export interface CatalogSearchableEntry {
  name: string;
  displayName: string;
  description: string;
}

export const LEGEND_MARKETPLACE_AI_AGENT = {
  name: 'legend-marketplace-ai',
  displayName: 'Legend Marketplace AI',
  vendor: 'Legend',
  description:
    'Ask questions about your data, discover data products, and run queries using natural language.',
};

export const LEGEND_MARKETPLACE_AI_AGENT_LOGO = {
  light: '/assets/legendmarketplacehomelogolight.png',
  dark: '/assets/legendmarketplacehomelogodark.png',
};

export const truncateCardDescription = (description: string): string =>
  description.length > MAX_CARD_DESCRIPTION_LENGTH
    ? `${description.substring(0, MAX_CARD_DESCRIPTION_LENGTH)}...`
    : description;

/**
 * A Legend MCP is a service published on the execution server's MCP route, plus the
 * Legend AI orchestrator; the rest of the registry belongs to other applications.
 */
export const isLegendMcpServer = (server: McpServer): boolean =>
  server.url.includes(LEGEND_MCP_SERVICE_URL_FRAGMENT) ||
  server.name === LEGEND_AI_MCP_SERVER_NAME;

const toVendorTokens = (value: string): string[] =>
  value.toUpperCase().match(MCP_VENDOR_TOKEN_PATTERN) ?? [];

/**
 * Only a name written as `Vendor - Product` states its vendor; the registry carries no
 * vendor field, so every other name has to be attached to one of those or left unknown.
 */
const getDeclaredVendor = (displayName: string): string | undefined => {
  if (!MCP_VENDOR_SEPARATOR_PATTERN.test(displayName)) {
    return undefined;
  }
  const declared = displayName.split(MCP_VENDOR_SEPARATOR_PATTERN)[0]?.trim();
  return declared !== undefined && declared.length > 0 ? declared : undefined;
};

/**
 * Vendors are read off the catalog rather than listed anywhere: the names that declare
 * one define the set, and the rest join it by leading token or fall to `OTHER_VENDOR`.
 */
export const buildMcpServerVendorIndex = (
  servers: McpServer[],
): Map<string, string> => {
  const spellingsByVendor = new Map<string, Map<string, number>>();
  servers.forEach((server) => {
    const declared = getDeclaredVendor(server.displayName);
    if (declared === undefined) {
      return;
    }
    const spellings =
      spellingsByVendor.get(declared.toUpperCase()) ??
      new Map<string, number>();
    spellings.set(declared, (spellings.get(declared) ?? 0) + 1);
    spellingsByVendor.set(declared.toUpperCase(), spellings);
  });

  const canonicalVendors = new Map<string, string>();
  spellingsByVendor.forEach((spellings, key) => {
    const canonical = Array.from(spellings.entries()).sort(
      (first, second) =>
        second[1] - first[1] || first[0].localeCompare(second[0]),
    )[0];
    if (canonical !== undefined) {
      canonicalVendors.set(key, canonical[0]);
    }
  });

  const vendorPrefixes = Array.from(canonicalVendors.keys())
    .map((key) => ({ key, tokens: toVendorTokens(key) }))
    .filter((vendor) => vendor.tokens.length > 0);

  const vendorByServerName = new Map<string, string>();
  servers.forEach((server) => {
    const declared = getDeclaredVendor(server.displayName);
    if (declared !== undefined) {
      vendorByServerName.set(
        server.name,
        canonicalVendors.get(declared.toUpperCase()) ?? declared,
      );
      return;
    }
    const tokens = toVendorTokens(server.displayName);
    const matched = vendorPrefixes
      .filter((vendor) =>
        vendor.tokens.every((token, index) => tokens[index] === token),
      )
      .sort((first, second) => second.tokens.length - first.tokens.length)[0];
    vendorByServerName.set(
      server.name,
      matched !== undefined
        ? (canonicalVendors.get(matched.key) ?? OTHER_VENDOR)
        : OTHER_VENDOR,
    );
  });
  return vendorByServerName;
};

/**
 * Matches the fields a user can read on a card. The registry can only search MCP
 * servers, and cannot filter by vendor at all, so the catalog searches locally.
 */
export const matchesCatalogSearch = (
  entry: CatalogSearchableEntry,
  searchQuery: string,
): boolean => {
  const query = searchQuery.trim().toLowerCase();
  if (query.length === 0) {
    return true;
  }
  return (
    entry.displayName.toLowerCase().includes(query) ||
    entry.description.toLowerCase().includes(query) ||
    entry.name.toLowerCase().includes(query)
  );
};

/**
 * Most descriptions are generated at registration and only repeat the server name,
 * so they are suppressed in favour of the sample questions.
 */
export const hasMeaningfulMcpDescription = (server: McpServer): boolean =>
  !server.description.startsWith(MCP_GENERATED_DESCRIPTION_PREFIX);

/**
 * Vendor artwork is matched on the vendor name the display name carries; servers with
 * no match fall back to the generic images the data product cards use.
 */
export const resolveMcpServerImageUrl = (
  vendorImageMap: ReadonlyMap<string, string>,
  vendor: string,
  fallbackKey: string,
): string => {
  const vendorImageUrl =
    vendor === OTHER_VENDOR
      ? undefined
      : findVendorImageUrl(vendorImageMap, vendor);
  return (
    vendorImageUrl ??
    buildGenericCardImageUrl(getGenericCardImageIndex(fallbackKey))
  );
};

/**
 * Registry timestamps carry microsecond precision and no timezone, so unparseable
 * values are surfaced as authored rather than rendered as an invalid date.
 */
export const formatMcpTimestamp = (
  timestamp: string | undefined,
): string | undefined => {
  if (timestamp === undefined) {
    return undefined;
  }
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime())
    ? timestamp
    : parsed.toLocaleDateString(undefined, MCP_TIMESTAMP_FORMAT);
};
