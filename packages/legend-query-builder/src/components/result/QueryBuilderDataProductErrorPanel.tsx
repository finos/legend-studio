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

import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  clsx,
  ExclamationTriangleIcon,
  LockIcon,
} from '@finos/legend-art';
import {
  ExecutionError,
  isExecutionEntitlementError,
  isExecutionWarehouseError,
} from '@finos/legend-graph';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import type { QueryBuilderResultState } from '../../stores/QueryBuilderResultState.js';
import type { DataProductAccessInfo } from '../../stores/data-access/DataProductAccessInfo.js';
import type { QueryBuilder_LegendApplicationPlugin_Extension } from '../../stores/QueryBuilder_LegendApplicationPlugin_Extension.js';
import { QUERY_BUILDER_DOCUMENTATION_KEY } from '../../__lib__/QueryBuilderDocumentation.js';
import { DataProductQueryBuilderState } from '../../stores/workflows/dataProduct/DataProductQueryBuilderState.js';

const buildAccessRequestLink = (
  info: DataProductAccessInfo,
  queryBuilderState: QueryBuilderState,
): string | undefined => {
  for (const builder of queryBuilderState.applicationStore.pluginManager
    .getApplicationPlugins()
    .flatMap(
      (plugin) =>
        (
          plugin as QueryBuilder_LegendApplicationPlugin_Extension
        ).getDataProductAccessRequestLinkBuilders?.() ?? [],
    )) {
    const link = builder(info, queryBuilderState);
    if (link) {
      return link;
    }
  }
  return undefined;
};

/**
 * The warehouse FAQ is only offered when the host application has registered it -
 * without it there is nothing actionable to show, and the caller falls back to the
 * default execution error view.
 */
const getSnowflakeWarehouseFAQUrl = (
  queryBuilderState: QueryBuilderState,
): string | undefined =>
  queryBuilderState.applicationStore.documentationService.getDocEntry(
    QUERY_BUILDER_DOCUMENTATION_KEY.SNOWFLAKE_ACTIVE_WAREHOUSE_ISSUE_FAQ,
  )?.url;

type DataProductErrorInfoEntry = {
  /**
   * Labels are not unique - a data product can list several support emails - so
   * entries carry their own key.
   */
  key: string;
  label: string;
  value: React.ReactNode;
};

const DataProductErrorPanelLayout = observer(
  (props: {
    icon: React.ReactNode;
    severity: 'error' | 'warn';
    headline: string;
    action: React.ReactNode | undefined;
    entries: DataProductErrorInfoEntry[];
    errorMessage?: string | undefined;
    executionTraceId?: string | undefined;
    errorStackTrace?: string | undefined;
  }) => {
    const {
      icon,
      severity,
      headline,
      action,
      entries,
      errorMessage,
      executionTraceId,
      errorStackTrace,
    } = props;
    const [showStackTrace, setShowStackTrace] = useState(false);

    return (
      <div className="query-builder__result__data-product-access">
        <div className="query-builder__result__data-product-access__header">
          <div
            className={clsx(
              'query-builder__result__data-product-access__header__icon',
              `query-builder__result__data-product-access__header__icon--${severity}`,
            )}
          >
            {icon}
          </div>
          <div className="query-builder__result__data-product-access__header__label">
            {headline}
          </div>
        </div>
        {action}
        <div className="query-builder__result__data-product-access__info">
          {entries.map((entry) => (
            <div
              className="query-builder__result__data-product-access__info__entry"
              key={entry.key}
            >
              <div className="query-builder__result__data-product-access__info__entry__label">
                {entry.label}
              </div>
              <div className="query-builder__result__data-product-access__info__entry__value">
                {entry.value}
              </div>
            </div>
          ))}
        </div>
        {errorMessage !== undefined && (
          <div className="query-builder__result__data-product-access__details">
            <div className="query-builder__result__data-product-access__details__header">
              Error details
            </div>
            <div className="query-builder__result__data-product-access__details__message">
              {errorMessage}
            </div>
            {executionTraceId !== undefined && (
              <div className="query-builder__result__data-product-access__details__trace">
                trace: {executionTraceId}
              </div>
            )}
            {errorStackTrace !== undefined && errorStackTrace !== '' && (
              <>
                <button
                  className="query-builder__result__data-product-access__details__toggle"
                  onClick={() => setShowStackTrace(!showStackTrace)}
                >
                  {showStackTrace ? <ChevronDownIcon /> : <ChevronRightIcon />}
                  {showStackTrace ? 'Hide stack trace' : 'Show stack trace'}
                </button>
                {showStackTrace && (
                  <div className="query-builder__result__data-product-access__details__message">
                    {errorStackTrace}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  },
);

const buildSupportEntries = (
  info: DataProductAccessInfo,
): DataProductErrorInfoEntry[] =>
  info.supportEmails.map((email) => ({
    key: `support-${email}`,
    label: 'Support',
    value: (
      <a
        className="query-builder__result__data-product-access__info__entry__value--linkable"
        href={`mailto:${email}`}
      >
        {email}
      </a>
    ),
  }));

/**
 * Shown instead of the generic entitlement banner when a query runs against a data
 * product: the raw execution error does not tell the user which data product they are
 * missing access to, nor where to request it.
 */
export const QueryBuilderDataProductAccessErrorPanel = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    info: DataProductAccessInfo;
    headline: string;
    errorMessage?: string | undefined;
    executionTraceId?: string | undefined;
    errorStackTrace?: string | undefined;
  }) => {
    const {
      queryBuilderState,
      info,
      headline,
      errorMessage,
      executionTraceId,
      errorStackTrace,
    } = props;
    const accessRequestLink = buildAccessRequestLink(info, queryBuilderState);

    const requestAccess = (): void => {
      if (accessRequestLink) {
        queryBuilderState.applicationStore.navigationService.navigator.visitAddress(
          accessRequestLink,
        );
      }
    };

    const entries: DataProductErrorInfoEntry[] = [
      {
        key: 'data-product',
        label: 'Data Product',
        value: info.dataProductLabel,
      },
      ...(info.accessPointGroupLabel !== undefined
        ? [
            {
              key: 'access-point-group',
              label: 'Access Point Group',
              value: info.accessPointGroupLabel,
            },
          ]
        : []),
      ...(info.environment !== undefined
        ? [
            {
              key: 'environment',
              label: 'Environment',
              value: info.environment,
            },
          ]
        : []),
      ...(info.deploymentId !== undefined
        ? [
            {
              key: 'deployment-id',
              label: 'Deployment ID',
              value: info.deploymentId,
            },
          ]
        : []),
      ...(info.warehouse !== undefined
        ? [{ key: 'warehouse', label: 'Warehouse', value: info.warehouse }]
        : []),
      ...buildSupportEntries(info),
    ];

    return (
      <DataProductErrorPanelLayout
        icon={<LockIcon />}
        severity="error"
        headline={headline}
        action={
          accessRequestLink !== undefined ? (
            <button
              className="btn--dark query-builder__result__data-product-access__action"
              title="Open this data product in Marketplace to request access"
              onClick={requestAccess}
            >
              Request Access in Marketplace
            </button>
          ) : undefined
        }
        entries={entries}
        errorMessage={errorMessage}
        executionTraceId={executionTraceId}
        errorStackTrace={errorStackTrace}
      />
    );
  },
);

/**
 * Warehouse failures are about compute rather than grants on the data, so requesting
 * access to the data product would not resolve them - point the user at the warehouse
 * FAQ instead, and name the warehouse the query actually ran against.
 */
export const QueryBuilderDataProductWarehouseErrorPanel = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    info: DataProductAccessInfo;
    faqUrl: string;
    errorMessage?: string | undefined;
    executionTraceId?: string | undefined;
    errorStackTrace?: string | undefined;
  }) => {
    const {
      queryBuilderState,
      info,
      faqUrl,
      errorMessage,
      executionTraceId,
      errorStackTrace,
    } = props;

    const openFAQ = (): void => {
      queryBuilderState.applicationStore.navigationService.navigator.visitAddress(
        faqUrl,
      );
    };

    const entries: DataProductErrorInfoEntry[] = [
      ...(info.warehouse !== undefined
        ? [{ key: 'warehouse', label: 'Warehouse', value: info.warehouse }]
        : []),
      ...(info.environment !== undefined
        ? [
            {
              key: 'environment',
              label: 'Environment',
              value: info.environment,
            },
          ]
        : []),
      {
        key: 'data-product',
        label: 'Data Product',
        value: info.dataProductLabel,
      },
      ...buildSupportEntries(info),
    ];

    return (
      <DataProductErrorPanelLayout
        icon={<ExclamationTriangleIcon />}
        severity="warn"
        headline={
          info.warehouse !== undefined
            ? `Can't access warehouse ${info.warehouse}`
            : `Can't access the compute warehouse`
        }
        action={
          <button
            className="btn--dark query-builder__result__data-product-access__action"
            title="Open the Snowflake warehouse FAQ"
            onClick={openFAQ}
          >
            Snowflake Warehouse FAQ
          </button>
        }
        entries={entries}
        errorMessage={errorMessage}
        executionTraceId={executionTraceId}
        errorStackTrace={errorStackTrace}
      />
    );
  },
);

const getDataProductAccessInfo = (
  queryBuilderState: QueryBuilderState,
): DataProductAccessInfo | undefined =>
  queryBuilderState instanceof DataProductQueryBuilderState
    ? queryBuilderState.dataProductAccessInfo
    : undefined;

/**
 * Builds the view to show in place of the default execution error panel when a query
 * runs against a data product, or `undefined` when the caller should fall back to that
 * default view (not a data product, an error we do not recognize, or a warehouse
 * failure with no FAQ registered to point at).
 */
export const buildDataProductExecutionErrorPanel = (
  resultState: QueryBuilderResultState,
  executionError: string | Error,
): React.ReactNode | undefined => {
  const queryBuilderState = resultState.queryBuilderState;
  const info = getDataProductAccessInfo(queryBuilderState);
  if (!info) {
    return undefined;
  }
  // NOTE: classify on the notification service's message rather than `error.message`:
  // for an `ApplicationError` it returns the detail, which also covers the stack trace
  const classifiableErrorMessage =
    queryBuilderState.applicationStore.notificationService.getErrorMessage(
      executionError,
    );
  const errorMessage =
    executionError instanceof Error ? executionError.message : executionError;
  const errorStackTrace =
    executionError instanceof ExecutionError ? executionError.stack : '';

  if (isExecutionWarehouseError(classifiableErrorMessage)) {
    const faqUrl = getSnowflakeWarehouseFAQUrl(queryBuilderState);
    return faqUrl !== undefined ? (
      <QueryBuilderDataProductWarehouseErrorPanel
        queryBuilderState={queryBuilderState}
        info={info}
        faqUrl={faqUrl}
        errorMessage={errorMessage}
        executionTraceId={resultState.executionTraceId}
        errorStackTrace={errorStackTrace}
      />
    ) : undefined;
  }

  if (isExecutionEntitlementError(classifiableErrorMessage)) {
    return (
      <QueryBuilderDataProductAccessErrorPanel
        queryBuilderState={queryBuilderState}
        info={info}
        headline={`You don't have access to ${
          info.accessPointGroupLabel
            ? `${info.accessPointGroupLabel} in ${info.dataProductLabel}`
            : info.dataProductLabel
        }`}
        errorMessage={errorMessage}
        executionTraceId={resultState.executionTraceId}
        errorStackTrace={errorStackTrace}
      />
    );
  }

  return undefined;
};

/**
 * A row access policy filters rows out silently rather than failing the query, so an
 * empty result is also a plausible entitlement problem for data products.
 */
export const buildDataProductEmptyResultPanel = (
  queryBuilderState: QueryBuilderState,
): React.ReactNode | undefined => {
  const info = getDataProductAccessInfo(queryBuilderState);
  return info ? (
    <QueryBuilderDataProductAccessErrorPanel
      queryBuilderState={queryBuilderState}
      info={info}
      headline="Query returned no data - this may be a row-level access policy"
    />
  ) : undefined;
};
