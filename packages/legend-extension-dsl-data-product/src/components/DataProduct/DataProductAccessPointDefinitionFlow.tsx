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
  clsx,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  Tooltip,
} from '@finos/legend-art';
import type { CubeDefinitionRefusal } from '@finos/legend-cube-builder/definition-flow';
import { uniq } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { Component, type ReactNode } from 'react';
import type { DataProductAccessPointState } from '../../stores/DataProduct/DataProductAccessPointState.js';
import { DataProductDefinitionFlowFailureKind } from '../../stores/DataProduct/DataProductDefinitionFlow.js';

// An access point's definition as Legend Cube's flow, in the Definition
// panel: an extra view of the Pure. Whatever goes wrong, the panel says so in
// a line and offers the Pure; nothing else in the viewer is affected.

export type DataProductDefinitionView = 'flow' | 'pure';

/**
 * Why Cube can't draw a definition, in a few words, from the kind of its
 * refusal: "No flow for this definition: {words}."
 */
export const describeDefinitionFlowRefusal = (
  refusal: CubeDefinitionRefusal,
): string => {
  const functionName =
    refusal.functionName === undefined
      ? undefined
      : `${refusal.functionName}()`;
  // NOTE: Cube's kinds (`CubeLambdaReadErrorKind`) are read as their text, as
  // Cube's code loads only when a definition opens
  const reason: string = refusal.reason;
  switch (reason) {
    case 'parameters':
      return "it takes parameters, which Cube's flow doesn't show yet";
    case 'noStep':
      return functionName
        ? `it uses ${functionName}, which Cube has no step for yet`
        : 'it uses a function Cube has no step for yet';
    case 'notYet':
      return functionName
        ? `Cube can't show its ${functionName} yet`
        : "Cube can't show one of its steps yet";
    case 'form':
      return functionName
        ? `Cube can't show its ${functionName} in this form yet`
        : "Cube can't show one of its steps in this form yet";
    case 'source':
      return "it reads a source Cube's flow doesn't show yet";
    case 'value':
      return "it uses a value Cube can't show yet";
    default:
      return "Cube can't read part of it yet";
  }
};

/** "A", "A and B", "A, B and C" */
const listNames = (names: string[]): string =>
  names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/**
 * Flow | Pure. When Cube can't draw the definition, Flow can't be picked,
 * and its tooltip says why.
 */
export const DataProductDefinitionViewSwitch: React.FC<{
  view: DataProductDefinitionView;
  onChange: (view: DataProductDefinitionView) => void;
  /** Why the flow can't be shown, if it can't */
  flowUnavailableReason?: string | undefined;
}> = (props) => {
  const { view, onChange, flowUnavailableReason } = props;
  const renderOption = (
    option: DataProductDefinitionView,
    label: string,
    unavailableReason?: string,
  ): React.ReactNode => {
    const isUnavailable = unavailableReason !== undefined;
    // NOTE: not `disabled`, so the button still takes the hover and focus
    // that show its tooltip
    const button = (
      <button
        type="button"
        className={clsx('data-product__viewer__definition-switch__option', {
          'data-product__viewer__definition-switch__option--active':
            view === option,
        })}
        aria-pressed={view === option}
        aria-disabled={isUnavailable}
        onClick={() => {
          if (!isUnavailable) {
            onChange(option);
          }
        }}
      >
        {label}
      </button>
    );
    return isUnavailable ? (
      <Tooltip
        title={unavailableReason}
        placement="top"
        arrow={true}
        describeChild={true}
      >
        {button}
      </Tooltip>
    ) : (
      button
    );
  };

  return (
    <div
      className="data-product__viewer__definition-switch"
      role="group"
      aria-label="Show the definition as"
    >
      {renderOption('flow', 'Flow', flowUnavailableReason)}
      {renderOption('pure', 'Pure')}
    </div>
  );
};

/** A line above the Pure: why Cube can't draw the definition, Cube's own words under Details */
export const DataProductDefinitionFlowRefusal: React.FC<{
  refusal: CubeDefinitionRefusal;
}> = (props) => (
  <div className="data-product__viewer__definition__note" role="note">
    <span className="data-product__viewer__definition__note__text">
      {`No flow for this definition: ${describeDefinitionFlowRefusal(props.refusal)}.`}
    </span>
    <details className="data-product__viewer__definition__note__details">
      <summary>Details</summary>
      {props.refusal.message}
    </details>
  </div>
);

/** Neither view of the definition can be shown: the flow failed, and the Pure couldn't be fetched */
export const DataProductDefinitionUnavailable: React.FC<{
  onRetry: () => void;
}> = (props) => (
  <div className="data-product__viewer__definition-flow__failure" role="alert">
    <div className="data-product__viewer__definition-flow__failure__title">
      Couldn&apos;t load this access point&apos;s definition
    </div>
    <div className="data-product__viewer__definition-flow__failure__text">
      Neither its flow nor its Pure can be shown. Querying the access point
      still works: see <strong>Pure Query</strong>. If this persists, tell the
      data product&apos;s owners.
    </div>
    <div className="data-product__viewer__definition-flow__failure__actions">
      <button
        type="button"
        className="data-product__viewer__definition-flow__failure__action"
        onClick={props.onRetry}
      >
        Try again
      </button>
    </div>
  </div>
);

/** The flow couldn't be loaded or drawn: say so, and offer the Pure and another try */
const DefinitionFlowFailure: React.FC<{
  title: string;
  error: Error;
  onShowPure: () => void;
  onRetry: () => void;
}> = (props) => (
  <div className="data-product__viewer__definition-flow__failure" role="alert">
    <div className="data-product__viewer__definition-flow__failure__title">
      {props.title}
    </div>
    <div className="data-product__viewer__definition-flow__failure__text">
      The definition itself is fine: its Pure is one click away.
    </div>
    <details className="data-product__viewer__definition__note__details">
      <summary>Details</summary>
      {props.error.message}
    </details>
    <div className="data-product__viewer__definition-flow__failure__actions">
      <button
        type="button"
        className="data-product__viewer__definition-flow__failure__action data-product__viewer__definition-flow__failure__action--primary"
        onClick={props.onShowPure}
      >
        Show the Pure
      </button>
      <button
        type="button"
        className="data-product__viewer__definition-flow__failure__action"
        onClick={props.onRetry}
      >
        Try again
      </button>
    </div>
  </div>
);

/** Keeps a canvas that fails while drawing inside the panel */
class DefinitionFlowErrorBoundary extends Component<
  {
    children: ReactNode;
    onError: (error: Error) => void;
    fallback: (error: Error, reset: () => void) => ReactNode;
  },
  { error: Error | undefined }
> {
  override state: { error: Error | undefined } = { error: undefined };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    this.props.onError(error);
  }

  reset = (): void => this.setState({ error: undefined });

  override render(): ReactNode {
    return this.state.error
      ? this.props.fallback(this.state.error, this.reset)
      : this.props.children;
  }
}

/**
 * The definition's flow, as Legend Cube draws it, read-only; while it is
 * read, a placeholder of its size; when it can't be shown, why, with the Pure
 * one click away
 */
export const DataProductAccessPointDefinitionFlow = observer(
  (props: {
    accessPointState: DataProductAccessPointState;
    onShowPure: () => void;
    onRetry: () => void;
  }) => {
    const { accessPointState, onShowPure, onRetry } = props;
    const definitionFlow = accessPointState.definitionFlow;
    const { layoutService } = accessPointState.apgState.applicationStore;

    if (definitionFlow === undefined) {
      return (
        <div className="data-product__viewer__definition-flow data-product__viewer__definition-flow--loading">
          <div className="data-product__viewer__definition-flow__loading-icon">
            <CubesLoadingIndicator isLoading={true}>
              <CubesLoadingIndicatorIcon />
            </CubesLoadingIndicator>
          </div>
          <span>Drawing the flow…</span>
        </div>
      );
    }
    if (definitionFlow.kind === 'failed') {
      return (
        <DefinitionFlowFailure
          title={
            definitionFlow.failure === DataProductDefinitionFlowFailureKind.READ
              ? "Couldn't draw the flow"
              : "Couldn't load the flow"
          }
          error={definitionFlow.error}
          onShowPure={onShowPure}
          onRetry={onRetry}
        />
      );
    }
    if (definitionFlow.kind === 'refused') {
      // the panel shows the Pure, and why
      return null;
    }
    const { reading, entry } = definitionFlow;
    const unknownDataSets = uniq(
      reading.unknownDataSets.map((each) => each.dataSet),
    );
    return (
      <>
        {unknownDataSets.length > 0 && (
          <div
            className="data-product__viewer__definition__note data-product__viewer__definition__note--warning"
            role="note"
          >
            {`Couldn't load the columns of ${listNames(unknownDataSets)}, so the steps after ${
              unknownDataSets.length === 1 ? 'it' : 'them'
            } aren't checked.`}
          </div>
        )}
        <DefinitionFlowErrorBoundary
          onError={(error) =>
            accessPointState.logDefinitionFlowFailure(
              DataProductDefinitionFlowFailureKind.DRAW,
              error,
            )
          }
          fallback={(error, reset) => (
            <DefinitionFlowFailure
              title="Couldn't draw the flow"
              error={error}
              onShowPure={onShowPure}
              onRetry={() => {
                reset();
                onRetry();
              }}
            />
          )}
        >
          <div className="data-product__viewer__definition-flow">
            <entry.CubeDefinitionFlow
              flow={reading}
              colorMode={
                layoutService.TEMPORARY__isLightColorThemeEnabled
                  ? 'light'
                  : 'dark'
              }
            />
          </div>
        </DefinitionFlowErrorBoundary>
      </>
    );
  },
);
