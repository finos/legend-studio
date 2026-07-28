/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { useCallback, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ArrowLeftIcon, CaretRightIcon } from '@finos/legend-art';
import { Container, Typography } from '@mui/material';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { LegendMarketplaceAIChatStoreProvider } from '../../application/providers/LegendMarketplaceAIChatStoreProvider.js';
import { MarketplaceAIChatView } from './MarketplaceAIChatView.js';
import { LegendMarketplaceSearchBar } from '../../components/SearchBar/LegendMarketplaceSearchBar.js';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { LegendMarketplaceTelemetryHelper } from '../../__lib__/LegendMarketplaceTelemetryHelper.js';

const AGENT_DESCRIPTION =
  'Ask questions about your data, discover data products, and run queries using natural language.';

const AgentCardsView = observer(
  (props: { onSelectAgent: (query?: string) => void }) => {
    const { onSelectAgent } = props;
    const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
    const applicationStore = legendMarketplaceBaseStore.applicationStore;
    const isDarkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;

    return (
      <>
        <Container className="marketplace-agents__search-container">
          <LegendMarketplaceSearchBar
            onSearch={onSelectAgent}
            placeholder="Ask a question about your data..."
            className="marketplace-agents__search-bar"
            enableAutosuggest={false}
          />
        </Container>
        <div className="marketplace-agents__section-bar">
          <div className="marketplace-agents__section-bar__container">
            <Typography
              variant="h4"
              className="marketplace-agents__section-title"
            >
              Intelligence &amp; AI Agents
            </Typography>
          </div>
        </div>
        <Container
          maxWidth="xxxl"
          className="marketplace-agents__content-container"
        >
          <div className="marketplace-agents__cards">
            <button
              type="button"
              className="marketplace-agents__agent-card"
              onClick={(): void => onSelectAgent()}
            >
              <div className="marketplace-agents__agent-card-icon">
                <img
                  src={
                    isDarkMode
                      ? '/assets/legendmarketplacehomelogodark.png'
                      : '/assets/legendmarketplacehomelogolight.png'
                  }
                  alt="Legend Marketplace AI"
                  className="marketplace-agents__agent-card-logo"
                />
              </div>
              <div className="marketplace-agents__agent-card-content">
                <h3 className="marketplace-agents__agent-card-title">
                  Legend Marketplace AI
                </h3>
                <p className="marketplace-agents__agent-card-desc">
                  {AGENT_DESCRIPTION}
                </p>
              </div>
              <div className="marketplace-agents__agent-card-action">
                Launch Agent <CaretRightIcon />
              </div>
            </button>
          </div>
        </Container>
      </>
    );
  },
);

export const LegendMarketplaceAgents = observer(() => {
  const applicationStore = useLegendMarketplaceBaseStore().applicationStore;
  const [showChat, setShowChat] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string | undefined>(
    undefined,
  );

  const handleSelectAgent = useCallback(
    (query?: string): void => {
      LegendMarketplaceTelemetryHelper.logEvent_AIAgentStart(
        applicationStore.telemetryService,
        query !== undefined,
      );
      setInitialQuery(query);
      setShowChat(true);
    },
    [applicationStore],
  );

  const initialQueryProp = initialQuery === undefined ? {} : { initialQuery };

  return (
    <LegendMarketplacePage className="legend-marketplace-ai-page">
      {showChat ? (
        <LegendMarketplaceAIChatStoreProvider>
          <div className="marketplace-agents__chat-wrapper">
            <button
              type="button"
              className="marketplace-agents__back-btn"
              onClick={(): void => {
                setShowChat(false);
                setInitialQuery(undefined);
              }}
            >
              <ArrowLeftIcon />
              <span>Back to Agents</span>
            </button>
            <MarketplaceAIChatView {...initialQueryProp} />
          </div>
        </LegendMarketplaceAIChatStoreProvider>
      ) : (
        <AgentCardsView onSelectAgent={handleSelectAgent} />
      )}
    </LegendMarketplacePage>
  );
});
