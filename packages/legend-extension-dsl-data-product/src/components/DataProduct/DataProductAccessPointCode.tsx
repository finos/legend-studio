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
  CheckIcon,
  clsx,
  CopyIcon,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  Tooltip,
} from '@finos/legend-art';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { V1_LakehouseAccessPoint } from '@finos/legend-graph';
import { Box, Link } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import type { DataProductAccessPointState } from '../../stores/DataProduct/DataProductAccessPointState.js';
import { AccessPointGroupAccess } from '../../stores/DataProduct/DataProductAPGState.js';
import type { DataProductDataAccessState } from '../../stores/DataProduct/DataProductDataAccessState.js';
import { DSL_DATA_PRODUCT_DOCUMENTATION_KEY } from '../../__lib__/DSL_DataProduct_Documentation.js';
import { getRelationColumnDescription } from '../../utils/LakehouseUtils.js';
import {
  buildAccessPointAccessor,
  buildAccessPointPureQueryExample,
  getAccessPointParameterTypeName,
  MAX_PURE_QUERY_EXAMPLE_COLUMNS,
  PURE_QUERY_EXAMPLE_ROW_LIMIT,
} from '../../utils/AccessPointPureQueryUtils.js';

// the code boxes are as tall as their lines, so their line height is fixed (px)
const CODE_LINE_HEIGHT = 20;
const CODE_PADDING = 10;
const DEFINITION_MAX_LINES = 20;

type CopyOutcome = 'idle' | 'copied' | 'failed';

/**
 * NOTE: `async` turns a missing `navigator.clipboard` (e.g. outside a secure
 * context) into a rejection, while still calling `writeText` synchronously, inside
 * the click that browsers require for clipboard writes.
 */
const writeToClipboard = async (value: string): Promise<void> => {
  await navigator.clipboard.writeText(value);
};

/**
 * Copies a block of code. As with the IDs in the viewer, the only feedback is the
 * tooltip: "Copy {label}", then "Copied" (or "Copy failed") until it closes.
 */
const CopyCodeButton: React.FC<{
  value: string;
  /** What the code is, e.g. "accessor": the button is labelled "Copy {label}" */
  label: string;
}> = (props) => {
  const { value, label } = props;
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [outcome, setOutcome] = useState<CopyOutcome>('idle');
  // NOTE: MUI calls `onOpen` when the enter delay that a hover started runs out,
  // judging by whether the tooltip was open when the hover began. So a click within
  // that delay is followed by an `onOpen` that would wipe the click's outcome: this
  // tells whether the tooltip is open right now.
  const isTooltipOpenRef = useRef(false);
  const setTooltipOpen = (open: boolean): void => {
    isTooltipOpenRef.current = open;
    setIsTooltipOpen(open);
  };

  const copy = (): void => {
    // keep the tooltip open to show the outcome, even if the click came before
    // the tooltip's enter delay was over
    setTooltipOpen(true);
    writeToClipboard(value)
      .then(() => setOutcome('copied'))
      .catch(() => setOutcome('failed'));
  };

  const showsCopied = outcome === 'copied' && isTooltipOpen;

  return (
    <Tooltip
      title={
        outcome === 'copied'
          ? 'Copied'
          : outcome === 'failed'
            ? 'Copy failed'
            : `Copy ${label}`
      }
      placement="top"
      arrow={true}
      // the tooltip describes the button, whose name stays "Copy {label}"
      describeChild={true}
      open={isTooltipOpen}
      onOpen={() => {
        // NOTE: the outcome of the last copy is cleared when the tooltip opens again
        // rather than when it closes, so "Copied" doesn't flip back while the
        // tooltip fades out
        if (!isTooltipOpenRef.current) {
          setOutcome('idle');
        }
        setTooltipOpen(true);
      }}
      onClose={() => setTooltipOpen(false)}
    >
      <button
        type="button"
        className={clsx('data-product__viewer__code-copy', {
          'data-product__viewer__code-copy--copied': showsCopied,
        })}
        aria-label={`Copy ${label}`}
        onClick={copy}
      >
        {showsCopied ? <CheckIcon /> : <CopyIcon />}
        <span>Copy</span>
      </button>
    </Tooltip>
  );
};

/** Pure code to read and copy: read-only, in the app's theme, as tall as its lines */
const ReadOnlyPureCode: React.FC<{
  value: string;
  /** Past this many lines, the code scrolls */
  maxLines?: number;
}> = (props) => {
  const { value, maxLines } = props;
  const lineCount = value.split('\n').length;
  const shownLineCount =
    maxLines === undefined ? lineCount : Math.min(lineCount, maxLines);

  return (
    <div
      className="data-product__viewer__code-box"
      style={{
        height: `${shownLineCount * CODE_LINE_HEIGHT + 2 * CODE_PADDING}px`,
      }}
    >
      <CodeEditor
        inputValue={value}
        isReadOnly={true}
        language={CODE_EDITOR_LANGUAGE.PURE}
        hideMinimap={true}
        hideGutter={true}
        hideActionBar={true}
        extraEditorOptions={{
          lineHeight: CODE_LINE_HEIGHT,
          padding: { top: CODE_PADDING, bottom: CODE_PADDING },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          renderLineHighlight: 'none',
          overviewRulerLanes: 0,
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          guides: { indentation: false },
          // the page scrolls past the code once the code can't scroll further
          scrollbar: { alwaysConsumeMouseWheel: false },
        }}
      />
    </div>
  );
};

const CodeLoadingIndicator: React.FC = () => (
  <Box className="data-product__viewer__more-info__loading-indicator">
    <CubesLoadingIndicator isLoading={true}>
      <CubesLoadingIndicatorIcon />
    </CubesLoadingIndicator>
  </Box>
);

/**
 * The Pure Query tab: the `#P` accessor that queries the access point, and an
 * example built from its columns. It is shown whatever the access point's
 * compute target.
 */
export const DataProductPureQueryScreen = observer(
  (props: { accessPointState: DataProductAccessPointState }) => {
    const { accessPointState } = props;
    const dataProductViewerState =
      accessPointState.apgState.dataProductViewerState;

    // the example names the columns, which Column Specifications fetches too
    useEffect(() => {
      if (accessPointState.fetchingRelationTypeState.isInInitialState) {
        accessPointState
          .fetchRelationType(
            accessPointState.apgState.dataProductViewerState
              .dataProductArtifactPromise,
          )
          .catch((error: Error) =>
            accessPointState.apgState.applicationStore.notificationService.notifyError(
              error,
            ),
          );
      }
    }, [accessPointState]);

    const parameters = accessPointState.parameters;
    const accessor = buildAccessPointAccessor(
      dataProductViewerState.product.path,
      accessPointState.accessPoint.id,
      parameters.map((parameter) => parameter.name),
    );
    const isFetchingColumns =
      accessPointState.fetchingRelationTypeState.isInInitialState ||
      accessPointState.fetchingRelationTypeState.isInProgress;
    const columnNames =
      accessPointState.relationType?.columns.map((column) => column.name) ?? [];
    const example = buildAccessPointPureQueryExample(accessor, columnNames);

    return (
      <div className="data-product__viewer__pure-query">
        <div className="data-product__viewer__pure-query__block">
          <div className="data-product__viewer__pure-query__header">
            <div>
              <div className="data-product__viewer__pure-query__title">
                Accessor
              </div>
              <div className="data-product__viewer__pure-query__caption">
                Returns this access point&apos;s rows as a relation. Use it in a
                Pure query, for example in a function in Studio.
              </div>
              {parameters.length > 0 && (
                <div className="data-product__viewer__pure-query__caption">
                  Replace each parameter with a value:{' '}
                  {parameters.map((parameter, index) => {
                    const typeName = getAccessPointParameterTypeName(parameter);
                    return (
                      <span key={parameter.name}>
                        {index > 0 && ', '}
                        <code className="data-product__viewer__pure-query__inline-code">
                          {parameter.name}
                        </code>
                        {typeName !== undefined && ` (${typeName})`}
                      </span>
                    );
                  })}
                  .
                </div>
              )}
            </div>
            <CopyCodeButton value={accessor} label="accessor" />
          </div>
          <ReadOnlyPureCode value={accessor} />
        </div>
        <div className="data-product__viewer__pure-query__block">
          <div className="data-product__viewer__pure-query__header">
            <div>
              <div className="data-product__viewer__pure-query__title">
                Example
              </div>
              {!isFetchingColumns && (
                <div className="data-product__viewer__pure-query__caption">
                  {columnNames.length === 0 ? (
                    `First ${PURE_QUERY_EXAMPLE_ROW_LIMIT} rows.`
                  ) : columnNames.length <= MAX_PURE_QUERY_EXAMPLE_COLUMNS ? (
                    `Every column, first ${PURE_QUERY_EXAMPLE_ROW_LIMIT} rows. Delete the columns you don't need.`
                  ) : (
                    <>
                      {`First ${PURE_QUERY_EXAMPLE_ROW_LIMIT} rows. This access point has ${columnNames.length} columns: add `}
                      <code className="data-product__viewer__pure-query__inline-code">
                        {'->select(~[…])'}
                      </code>
                      {' with the ones you need.'}
                    </>
                  )}
                </div>
              )}
            </div>
            {!isFetchingColumns && (
              <CopyCodeButton value={example} label="example" />
            )}
          </div>
          {isFetchingColumns ? (
            <CodeLoadingIndicator />
          ) : (
            <ReadOnlyPureCode value={example} />
          )}
        </div>
      </div>
    );
  },
);

/** How the producer defined the access point (its function as Pure), fetched when first shown */
const DataProductAccessPointDefinition = observer(
  (props: { accessPointState: DataProductAccessPointState }) => {
    const { accessPointState } = props;

    useEffect(() => {
      if (accessPointState.fetchingGrammarState.isInInitialState) {
        accessPointState
          .fetchGrammar()
          .catch((error: Error) =>
            accessPointState.apgState.applicationStore.notificationService.notifyError(
              error,
            ),
          );
      }
    }, [accessPointState]);

    const definition = accessPointState.grammar;
    const isFetching =
      accessPointState.fetchingGrammarState.isInInitialState ||
      accessPointState.fetchingGrammarState.isInProgress;

    return (
      <section
        className="data-product__viewer__definition"
        aria-label="Definition"
      >
        <div className="data-product__viewer__definition__header">
          <div>
            <div className="data-product__viewer__definition__title">
              Definition
            </div>
            <div className="data-product__viewer__definition__caption">
              How the producer defined this access point. To query it, use{' '}
              <strong>Pure Query</strong>.
            </div>
          </div>
          {definition !== undefined && (
            <CopyCodeButton value={definition} label="definition" />
          )}
        </div>
        {isFetching ? (
          <CodeLoadingIndicator />
        ) : definition !== undefined ? (
          <ReadOnlyPureCode
            value={definition}
            maxLines={DEFINITION_MAX_LINES}
          />
        ) : (
          <div className="data-product__viewer__definition__message">
            Unable to fetch the definition
          </div>
        )}
      </section>
    );
  },
);

// without access, the engine can't sample the data
const ACCESS_WITHOUT_DATA: AccessPointGroupAccess[] = [
  AccessPointGroupAccess.NO_ACCESS,
  AccessPointGroupAccess.DENIED,
  AccessPointGroupAccess.SUBMITTED_FOR_APPROVALS,
  AccessPointGroupAccess.PENDING_MANAGER_APPROVAL,
  AccessPointGroupAccess.PENDING_DATA_OWNER_APPROVAL,
];

const DocumentationHintLink: React.FC<{
  url: string;
  children: React.ReactNode;
}> = (props) => (
  <Link
    className="data-product__viewer__columns-strip__link"
    href={props.url}
    target="_blank"
    rel="noopener noreferrer"
  >
    {props.children}
    <span aria-hidden={true}> ↗</span>
  </Link>
);

/**
 * What the columns lack, after the column count, said to those who can act on it:
 * - the data product's owners, and the producer in Studio's preview, read that no
 *   column has a description, or that there are no sample values, with links to
 *   how to add them (when the documentation is configured);
 * - anyone else without access reads that sample values show once they have it.
 */
const DataProductAccessPointColumnsHint = observer(
  (props: {
    accessPointState: DataProductAccessPointState;
    dataAccessState: DataProductDataAccessState | undefined;
  }) => {
    const { accessPointState, dataAccessState } = props;
    const columns = accessPointState.relationType?.columns ?? [];
    const viewerState = accessPointState.apgState.dataProductViewerState;
    const isProducer =
      viewerState.isPreview || Boolean(dataAccessState?.isCurrentUserOwner);
    const lacksSampleValues =
      !accessPointState.fetchingSampleDataState.isInProgress &&
      !accessPointState.hasSampleValues;
    const showsNoDescriptions =
      isProducer &&
      columns.every((column) => !getRelationColumnDescription(column));
    // NOTE: sample values the producer saved may not show here, e.g. in Studio's
    // preview, so they are said to be missing only when the data product has none
    const showsNoSampleValues =
      isProducer && lacksSampleValues && !viewerState.definesSampleValues;
    const showsSampleValuesNeedAccess =
      !isProducer &&
      lacksSampleValues &&
      ACCESS_WITHOUT_DATA.includes(accessPointState.apgState.access);
    if (
      columns.length === 0 ||
      (!showsNoDescriptions &&
        !showsNoSampleValues &&
        !showsSampleValuesNeedAccess)
    ) {
      return null;
    }
    const documentationService =
      accessPointState.apgState.applicationStore.documentationService;
    const descriptionsUrl = documentationService.getDocEntry(
      DSL_DATA_PRODUCT_DOCUMENTATION_KEY.COLUMN_DESCRIPTIONS,
    )?.url;
    const sampleValuesUrl = documentationService.getDocEntry(
      DSL_DATA_PRODUCT_DOCUMENTATION_KEY.SAMPLE_VALUES,
    )?.url;

    return (
      <span className="data-product__viewer__columns-strip__hint">
        {showsNoDescriptions && <span>{' · No descriptions'}</span>}
        {showsNoSampleValues && <span>{' · No sample values'}</span>}
        {showsSampleValuesNeedAccess && (
          <span>{' · Sample values show once you have access'}</span>
        )}
        {showsNoDescriptions && descriptionsUrl !== undefined && (
          <DocumentationHintLink url={descriptionsUrl}>
            How to add descriptions
          </DocumentationHintLink>
        )}
        {showsNoSampleValues && sampleValuesUrl !== undefined && (
          <DocumentationHintLink url={sampleValuesUrl}>
            How to add sample values
          </DocumentationHintLink>
        )}
      </span>
    );
  },
);

/**
 * The strip above the column grid: the column count, what the columns lack, and
 * a quiet toggle that shows the access point's definition between the strip and
 * the grid.
 */
export const DataProductAccessPointColumnsStrip = observer(
  (props: {
    accessPointState: DataProductAccessPointState;
    dataAccessState: DataProductDataAccessState | undefined;
  }) => {
    const { accessPointState, dataAccessState } = props;
    const [isDefinitionOpen, setIsDefinitionOpen] = useState(false);
    const columnCount = accessPointState.relationType?.columns.length;

    return (
      <>
        <div className="data-product__viewer__columns-strip">
          <span className="data-product__viewer__columns-strip__summary">
            <span className="data-product__viewer__columns-strip__count">
              {columnCount !== undefined &&
                `${columnCount} column${columnCount === 1 ? '' : 's'}`}
            </span>
            <DataProductAccessPointColumnsHint
              accessPointState={accessPointState}
              dataAccessState={dataAccessState}
            />
          </span>
          {accessPointState.accessPoint instanceof V1_LakehouseAccessPoint && (
            <button
              type="button"
              className={clsx('data-product__viewer__definition-toggle', {
                'data-product__viewer__definition-toggle--open':
                  isDefinitionOpen,
              })}
              aria-expanded={isDefinitionOpen}
              onClick={() => setIsDefinitionOpen(!isDefinitionOpen)}
            >
              <span
                className="data-product__viewer__definition-toggle__icon"
                aria-hidden={true}
              >
                {'</>'}
              </span>
              {isDefinitionOpen ? 'Hide definition' : 'View definition'}
            </button>
          )}
        </div>
        {isDefinitionOpen && (
          <DataProductAccessPointDefinition
            accessPointState={accessPointState}
          />
        )}
      </>
    );
  },
);
