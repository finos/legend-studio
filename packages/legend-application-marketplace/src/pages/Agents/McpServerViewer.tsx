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

import { useCallback, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import { useAuth } from 'react-oidc-context';
import { useParams } from '@finos/legend-application/browser';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  clsx,
  CopyIcon,
  MarkdownTextViewer,
} from '@finos/legend-art';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import type {
  McpServer,
  McpServerTool,
} from '@finos/legend-server-marketplace';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { useIntelligenceCatalogStore } from '../../application/providers/IntelligenceCatalogStoreProvider.js';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import {
  type McpServerPathParams,
  LEGEND_MARKETPLACE_ROUTE_PATTERN,
  LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN,
} from '../../__lib__/LegendMarketplaceNavigation.js';
import {
  formatMcpTimestamp,
  hasMeaningfulMcpDescription,
  NO_DESCRIPTION_PLACEHOLDER,
  NO_VALUE_PLACEHOLDER,
} from '../../stores/intelligence/IntelligenceCatalogUtils.js';
import { parseMcpToolDocumentation } from '../../stores/intelligence/McpToolDocumentation.js';
import { LegendMarketplaceTelemetryHelper } from '../../__lib__/LegendMarketplaceTelemetryHelper.js';

enum MCP_SUPPORT_LINK_TYPE {
  DOCUMENTATION = 'documentation',
  DISTRIBUTION_LIST = 'distribution-list',
}

const displayFieldValue = (value: string | undefined): string =>
  value ?? NO_VALUE_PLACEHOLDER;

type McpServerViewerAccent =
  | 'connection'
  | 'security'
  | 'ownership'
  | 'registry';

const McpServerViewerPanel = (props: {
  title: string;
  accent: McpServerViewerAccent;
  children: React.ReactNode;
}): React.ReactNode => {
  const { title, accent, children } = props;

  return (
    <section
      className={clsx(
        'marketplace-mcp-server-viewer__panel',
        `marketplace-mcp-server-viewer__panel--${accent}`,
      )}
    >
      <h4 className="marketplace-mcp-server-viewer__panel-title">{title}</h4>
      <dl className="marketplace-mcp-server-viewer__fields">{children}</dl>
    </section>
  );
};

const McpServerViewerField = (props: {
  label: string;
  children: React.ReactNode;
}): React.ReactNode => {
  const { label, children } = props;

  return (
    <>
      <dt className="marketplace-mcp-server-viewer__field-label">{label}</dt>
      <dd className="marketplace-mcp-server-viewer__field-value">{children}</dd>
    </>
  );
};

const McpServerViewerSection = (props: {
  title: string;
  count?: number | undefined;
  scrollable: boolean;
  children: React.ReactNode;
}): React.ReactNode => {
  const { title, count, scrollable, children } = props;

  return (
    <section className="marketplace-mcp-server-viewer__section">
      <div className="marketplace-mcp-server-viewer__section-header">
        <Typography
          variant="h5"
          className="marketplace-mcp-server-viewer__section-title"
        >
          {title}
        </Typography>
        {count !== undefined && (
          <span className="marketplace-mcp-server-viewer__section-count">
            {count}
          </span>
        )}
      </div>
      <div
        className={clsx('marketplace-mcp-server-viewer__section-body', {
          'marketplace-mcp-server-viewer__section-body--scrollable': scrollable,
        })}
      >
        {children}
      </div>
    </section>
  );
};

const McpServerViewerChipList = (props: {
  values: string[] | undefined;
}): React.ReactNode => {
  const { values } = props;
  if (values === undefined || values.length === 0) {
    return NO_VALUE_PLACEHOLDER;
  }

  return (
    <span className="marketplace-mcp-server-viewer__chips">
      {values.map((value) => (
        <Chip
          key={value}
          size="small"
          label={value}
          className="marketplace-mcp-server-viewer__chip"
        />
      ))}
    </span>
  );
};

const McpServerCopyButton = observer(
  (props: {
    mcpServerName: string;
    label: string;
    value: string;
  }): React.ReactNode => {
    const { mcpServerName, label, value } = props;
    const applicationStore = useLegendMarketplaceBaseStore().applicationStore;

    const copyValue = (event: React.MouseEvent<HTMLButtonElement>): void => {
      event.stopPropagation();
      LegendMarketplaceTelemetryHelper.logEvent_ClickMcpServerCopy(
        applicationStore.telemetryService,
        mcpServerName,
        label,
      );
      applicationStore.clipboardService
        .copyTextToClipboard(value)
        .then(() =>
          applicationStore.notificationService.notifySuccess(
            `Copied ${label} to clipboard`,
          ),
        )
        .catch(applicationStore.alertUnhandledError);
    };

    return (
      <Tooltip title={`Copy ${label}`}>
        <IconButton
          size="small"
          onClick={copyValue}
          aria-label={`Copy ${label}`}
          className="marketplace-mcp-server-viewer__copy-btn"
        >
          <CopyIcon />
        </IconButton>
      </Tooltip>
    );
  },
);

const McpServerDistributionList = observer(
  (props: {
    mcpServerName: string;
    address: string | undefined;
  }): React.ReactNode => {
    const { mcpServerName, address } = props;
    const applicationStore = useLegendMarketplaceBaseStore().applicationStore;
    if (address === undefined) {
      return NO_VALUE_PLACEHOLDER;
    }

    return (
      <a
        href={`mailto:${address}`}
        className="marketplace-mcp-server-viewer__link"
        onClick={(): void =>
          LegendMarketplaceTelemetryHelper.logEvent_ClickMcpServerSupportLink(
            applicationStore.telemetryService,
            mcpServerName,
            MCP_SUPPORT_LINK_TYPE.DISTRIBUTION_LIST,
          )
        }
      >
        {address}
      </a>
    );
  },
);

const McpServerViewerHeader = observer(
  (props: { mcpServer: McpServer }): React.ReactNode => {
    const { mcpServer } = props;
    const intelligenceCatalogStore = useIntelligenceCatalogStore();

    return (
      <header className="marketplace-mcp-server-viewer__header">
        <span className="marketplace-mcp-server-viewer__vendor">
          {intelligenceCatalogStore.getVendorForServer(mcpServer)}
        </span>
        <Typography
          variant="h3"
          className="marketplace-mcp-server-viewer__title"
        >
          {mcpServer.displayName}
        </Typography>
        <div className="marketplace-mcp-server-viewer__tags">
          {mcpServer.active && (
            <Chip
              size="small"
              label="Live"
              className="marketplace-mcp-server-viewer__tag marketplace-mcp-server-viewer__tag--live"
            />
          )}
          <Chip
            size="small"
            label={`v${mcpServer.version}`}
            className="marketplace-mcp-server-viewer__tag marketplace-mcp-server-viewer__tag--version"
          />
          {mcpServer.requireApproval && (
            <Chip
              size="small"
              label="Approval required"
              className="marketplace-mcp-server-viewer__tag marketplace-mcp-server-viewer__tag--approval"
            />
          )}
          {mcpServer.category?.map((category) => (
            <Chip
              key={category}
              size="small"
              label={category}
              className="marketplace-mcp-server-viewer__tag marketplace-mcp-server-viewer__tag--category"
            />
          ))}
        </div>
        <p className="marketplace-mcp-server-viewer__description">
          {hasMeaningfulMcpDescription(mcpServer)
            ? mcpServer.description
            : NO_DESCRIPTION_PLACEHOLDER}
        </p>
      </header>
    );
  },
);

const McpServerConnectionPanel = (props: {
  mcpServer: McpServer;
}): React.ReactNode => {
  const { mcpServer } = props;

  return (
    <McpServerViewerPanel title="Connection" accent="connection">
      <McpServerViewerField label="URL">
        <span className="marketplace-mcp-server-viewer__url">
          <code className="marketplace-mcp-server-viewer__url-text">
            {mcpServer.url}
          </code>
          <McpServerCopyButton
            mcpServerName={mcpServer.name}
            label="connection URL"
            value={mcpServer.url}
          />
        </span>
      </McpServerViewerField>
      <McpServerViewerField label="Transport">
        {mcpServer.type}
      </McpServerViewerField>
      <McpServerViewerField label="Token type">
        {displayFieldValue(mcpServer.tokenType)}
      </McpServerViewerField>
      <McpServerViewerField label="Platforms">
        <McpServerViewerChipList values={mcpServer.allowedPlatforms} />
      </McpServerViewerField>
      <McpServerViewerField label="Allowed apps">
        <McpServerViewerChipList values={mcpServer.allowedAppIds} />
      </McpServerViewerField>
    </McpServerViewerPanel>
  );
};

const McpServerClassificationPanel = (props: {
  mcpServer: McpServer;
}): React.ReactNode => {
  const { mcpServer } = props;

  return (
    <McpServerViewerPanel title="Security & classification" accent="security">
      <McpServerViewerField label="Data privacy">
        {displayFieldValue(mcpServer.securityDetail?.dataPrivacyClassification)}
      </McpServerViewerField>
      <McpServerViewerField label="Data sensitivity">
        {displayFieldValue(
          mcpServer.securityDetail?.dataSensitivityClassification,
        )}
      </McpServerViewerField>
    </McpServerViewerPanel>
  );
};

const McpServerOwnershipPanel = (props: {
  mcpServer: McpServer;
}): React.ReactNode => {
  const { mcpServer } = props;

  return (
    <McpServerViewerPanel title="Ownership" accent="ownership">
      <McpServerViewerField label="Owner DID">
        {displayFieldValue(mcpServer.ownershipInfo?.ownerDid)}
      </McpServerViewerField>
      <McpServerViewerField label="Owner DL">
        <McpServerDistributionList
          mcpServerName={mcpServer.name}
          address={mcpServer.ownershipInfo?.mcpOwnerDl}
        />
      </McpServerViewerField>
      <McpServerViewerField label="Support DL">
        <McpServerDistributionList
          mcpServerName={mcpServer.name}
          address={mcpServer.ownershipInfo?.mcpOwnerSupportDl}
        />
      </McpServerViewerField>
    </McpServerViewerPanel>
  );
};

const McpServerRegistrationPanel = (props: {
  mcpServer: McpServer;
}): React.ReactNode => {
  const { mcpServer } = props;

  return (
    <McpServerViewerPanel title="Registration" accent="registry">
      <McpServerViewerField label="Registry name">
        <code className="marketplace-mcp-server-viewer__code">
          {mcpServer.name}
        </code>
      </McpServerViewerField>
      <McpServerViewerField label="Created">
        {displayFieldValue(formatMcpTimestamp(mcpServer.createdAt))}
      </McpServerViewerField>
      <McpServerViewerField label="Last updated">
        {displayFieldValue(formatMcpTimestamp(mcpServer.updatedAt))}
      </McpServerViewerField>
    </McpServerViewerPanel>
  );
};

const McpServerSampleQuestionList = (props: {
  mcpServerName: string;
  questions: string[];
}): React.ReactNode => {
  const { mcpServerName, questions } = props;

  return (
    <ul className="marketplace-mcp-server-viewer__questions">
      {questions.map((question) => (
        <li key={question} className="marketplace-mcp-server-viewer__question">
          <span className="marketplace-mcp-server-viewer__question-text">
            {question}
          </span>
          <McpServerCopyButton
            mcpServerName={mcpServerName}
            label="question"
            value={question}
          />
        </li>
      ))}
    </ul>
  );
};

const McpServerToolAccordion = (props: {
  mcpServerName: string;
  tool: McpServerTool;
}): React.ReactNode => {
  const { mcpServerName, tool } = props;
  const applicationStore = useLegendMarketplaceBaseStore().applicationStore;
  const { servicePattern, documentation, groundingRules } =
    parseMcpToolDocumentation(tool.description ?? '');

  return (
    <Accordion
      className="marketplace-mcp-server-viewer__tool"
      onChange={(_, expanded): void => {
        if (expanded) {
          LegendMarketplaceTelemetryHelper.logEvent_ExpandMcpServerTool(
            applicationStore.telemetryService,
            mcpServerName,
            tool.name,
          );
        }
      }}
    >
      <AccordionSummary
        expandIcon={<ChevronDownIcon />}
        className="marketplace-mcp-server-viewer__tool-summary"
      >
        <span className="marketplace-mcp-server-viewer__tool-heading">
          <code className="marketplace-mcp-server-viewer__tool-title">
            {tool.title ?? tool.name}
          </code>
          <McpServerCopyButton
            mcpServerName={mcpServerName}
            label="tool name"
            value={tool.name}
          />
        </span>
        {servicePattern !== undefined && (
          <Chip
            size="small"
            label={servicePattern}
            className="marketplace-mcp-server-viewer__tool-pattern"
          />
        )}
      </AccordionSummary>
      <AccordionDetails className="marketplace-mcp-server-viewer__tool-details">
        <MarkdownTextViewer value={{ value: documentation }} />
        {groundingRules !== undefined && (
          <Accordion
            className="marketplace-mcp-server-viewer__tool-grounding"
            onChange={(_, expanded): void => {
              if (expanded) {
                LegendMarketplaceTelemetryHelper.logEvent_ExpandMcpServerGroundingRules(
                  applicationStore.telemetryService,
                  mcpServerName,
                  tool.name,
                );
              }
            }}
          >
            <AccordionSummary expandIcon={<ChevronDownIcon />}>
              LLM grounding rules
            </AccordionSummary>
            <AccordionDetails>
              <MarkdownTextViewer value={{ value: groundingRules }} />
            </AccordionDetails>
          </Accordion>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

const McpServerSupportSection = observer(
  (props: { mcpServer: McpServer }): React.ReactNode => {
    const { mcpServer } = props;
    const applicationStore = useLegendMarketplaceBaseStore().applicationStore;
    const supportInfo = mcpServer.supportInfo;
    if (supportInfo === undefined || supportInfo.length === 0) {
      return null;
    }

    return (
      <McpServerViewerSection title="Support" scrollable={false}>
        <dl className="marketplace-mcp-server-viewer__fields">
          {supportInfo.map((support) => (
            <McpServerViewerField
              key={`${support.title ?? ''}|${support.documentationLink ?? ''}|${support.message ?? ''}`}
              label={support.title ?? 'Support'}
            >
              {support.message ?? NO_VALUE_PLACEHOLDER}
              {support.documentationLink !== undefined && (
                <a
                  href={support.documentationLink}
                  target="_blank"
                  rel="noreferrer"
                  className="marketplace-mcp-server-viewer__link"
                  onClick={(): void =>
                    LegendMarketplaceTelemetryHelper.logEvent_ClickMcpServerSupportLink(
                      applicationStore.telemetryService,
                      mcpServer.name,
                      MCP_SUPPORT_LINK_TYPE.DOCUMENTATION,
                    )
                  }
                >
                  Documentation
                </a>
              )}
            </McpServerViewerField>
          ))}
        </dl>
      </McpServerViewerSection>
    );
  },
);

const McpServerToolsSection = observer(
  (props: { mcpServer: McpServer }): React.ReactNode => {
    const { mcpServer } = props;
    const intelligenceCatalogStore = useIntelligenceCatalogStore();
    const tools = intelligenceCatalogStore.toolsByServerName.get(
      mcpServer.name,
    );

    if (intelligenceCatalogStore.isFetchingToolsFor(mcpServer.name)) {
      return (
        <McpServerViewerSection title="Tools" scrollable={false}>
          <CircularProgress />
        </McpServerViewerSection>
      );
    }

    return (
      <McpServerViewerSection
        title="Tools"
        count={tools?.tools.length}
        scrollable={false}
      >
        {tools === undefined || tools.tools.length === 0 ? (
          <div className="marketplace-mcp-server-viewer__empty">
            This server exposes no tools
          </div>
        ) : (
          tools.tools.map((tool) => (
            <McpServerToolAccordion
              key={tool.name}
              mcpServerName={mcpServer.name}
              tool={tool}
            />
          ))
        )}
      </McpServerViewerSection>
    );
  },
);

const McpServerViewerContent = observer(
  (props: { mcpServer: McpServer }): React.ReactNode => {
    const { mcpServer } = props;
    const intelligenceCatalogStore = useIntelligenceCatalogStore();
    const applicationStore = useLegendMarketplaceBaseStore().applicationStore;
    const auth = useAuth();
    const token = auth.user?.access_token;
    const tokenRef = useRef(token);
    tokenRef.current = token;
    // the registry does not guarantee distinct questions, and a repeated one would
    // both render twice and collide as a React key
    const sampleQuestions = mcpServer.sampleQuestions
      ? Array.from(new Set(mcpServer.sampleQuestions))
      : undefined;

    useEffect(() => {
      const currentToken = tokenRef.current;
      if (currentToken) {
        flowResult(
          intelligenceCatalogStore.fetchMcpServerTools(
            mcpServer.name,
            currentToken,
          ),
        ).catch(applicationStore.alertUnhandledError);
      }
    }, [intelligenceCatalogStore, mcpServer.name, token, applicationStore]);

    return (
      <div className="marketplace-mcp-server-viewer__content-container">
        <McpServerViewerHeader mcpServer={mcpServer} />
        <div className="marketplace-mcp-server-viewer__layout">
          <div className="marketplace-mcp-server-viewer__main">
            {sampleQuestions !== undefined && sampleQuestions.length > 0 && (
              <McpServerViewerSection
                title="Sample questions"
                count={sampleQuestions.length}
                scrollable={true}
              >
                <McpServerSampleQuestionList
                  mcpServerName={mcpServer.name}
                  questions={sampleQuestions}
                />
              </McpServerViewerSection>
            )}
            <McpServerToolsSection mcpServer={mcpServer} />
            <McpServerSupportSection mcpServer={mcpServer} />
          </div>
          <aside className="marketplace-mcp-server-viewer__rail">
            <McpServerConnectionPanel mcpServer={mcpServer} />
            <McpServerClassificationPanel mcpServer={mcpServer} />
            <McpServerOwnershipPanel mcpServer={mcpServer} />
            <McpServerRegistrationPanel mcpServer={mcpServer} />
          </aside>
        </div>
      </div>
    );
  },
);

export const McpServerViewer = observer(() => {
  const intelligenceCatalogStore = useIntelligenceCatalogStore();
  const applicationStore = useLegendMarketplaceBaseStore().applicationStore;
  const auth = useAuth();
  const token = auth.user?.access_token;
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const params = useParams<McpServerPathParams>();
  const mcpServerName = decodeURIComponent(
    guaranteeNonNullable(
      params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.MCP_SERVER_NAME],
    ),
  );
  const mcpServer = intelligenceCatalogStore.findLegendMcpServer(mcpServerName);

  const fetchMcpServers = useCallback((): void => {
    const currentToken = tokenRef.current;
    if (currentToken) {
      flowResult(intelligenceCatalogStore.fetchMcpServers(currentToken)).catch(
        applicationStore.alertUnhandledError,
      );
    }
  }, [intelligenceCatalogStore, applicationStore]);

  useEffect(() => {
    fetchMcpServers();
  }, [fetchMcpServers, token]);

  const renderContent = (): React.ReactNode => {
    if (mcpServer) {
      return <McpServerViewerContent mcpServer={mcpServer} />;
    }
    if (intelligenceCatalogStore.fetchingServersState.hasFailed) {
      return (
        <div className="marketplace-mcp-server-viewer__empty">
          <span>Could not load MCP servers from the registry</span>
          <button
            type="button"
            className="marketplace-mcp-server-viewer__retry"
            onClick={(): void => {
              LegendMarketplaceTelemetryHelper.logEvent_ClickMcpServerRetry(
                applicationStore.telemetryService,
                mcpServerName,
              );
              fetchMcpServers();
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    if (intelligenceCatalogStore.fetchingServersState.hasSucceeded) {
      return (
        <div className="marketplace-mcp-server-viewer__empty">
          MCP server &apos;{mcpServerName}&apos; not found
        </div>
      );
    }
    return <CircularProgress />;
  };

  return (
    <LegendMarketplacePage className="marketplace-mcp-server-viewer">
      <Container
        maxWidth="xxxl"
        className="marketplace-mcp-server-viewer__page-container"
      >
        <button
          type="button"
          className="marketplace-mcp-server-viewer__back-btn"
          onClick={(): void => {
            LegendMarketplaceTelemetryHelper.logEvent_ClickMcpServerBack(
              applicationStore.telemetryService,
              mcpServerName,
            );
            applicationStore.navigationService.navigator.goToLocation(
              LEGEND_MARKETPLACE_ROUTE_PATTERN.AGENTS,
            );
          }}
        >
          <ArrowLeftIcon />
          <span>Back to MCPs</span>
        </button>
        {renderContent()}
      </Container>
    </LegendMarketplacePage>
  );
});
