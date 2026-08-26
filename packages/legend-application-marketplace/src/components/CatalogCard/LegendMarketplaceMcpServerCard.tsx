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
  type CatalogCardTag,
  LegendMarketplaceCatalogCard,
} from './LegendMarketplaceCatalogCard.js';
import {
  hasMeaningfulMcpDescription,
  truncateCardDescription,
  CATALOG_LIVE_TAG,
  MAX_CARD_CATEGORY_CHIPS,
  NO_DESCRIPTION_PLACEHOLDER,
} from '../../stores/intelligence/IntelligenceCatalogUtils.js';

/**
 * Generated descriptions carry no information, so a sample question is a better
 * summary when one is available.
 */
const buildSummary = (mcpServer: McpServer): string =>
  truncateCardDescription(
    hasMeaningfulMcpDescription(mcpServer)
      ? mcpServer.description
      : (mcpServer.sampleQuestions?.[0] ?? NO_DESCRIPTION_PLACEHOLDER),
  );

const buildTags = (mcpServer: McpServer): CatalogCardTag[] => [
  ...(mcpServer.active ? [{ label: CATALOG_LIVE_TAG, isLive: true }] : []),
  ...(mcpServer.category?.slice(0, MAX_CARD_CATEGORY_CHIPS) ?? []).map(
    (category) => ({ label: category }),
  ),
  { label: `v${mcpServer.version}` },
];

export const LegendMarketplaceMcpServerCard = (props: {
  mcpServer: McpServer;
  imageUrl: string;
  vendor: string;
  isLastViewed: boolean;
  onClick: () => void;
}): React.ReactNode => {
  const { mcpServer, imageUrl, vendor, isLastViewed, onClick } = props;

  return (
    <LegendMarketplaceCatalogCard
      title={mcpServer.displayName}
      vendor={vendor}
      description={buildSummary(mcpServer)}
      tags={buildTags(mcpServer)}
      imageUrl={imageUrl}
      onClick={onClick}
      isLastViewed={isLastViewed}
    />
  );
};
