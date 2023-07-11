/**
 * Copyright (c) 2020-present, Goldman Sachs
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
import React from 'react';
import {
  type ExecutionPlanState,
  EXECUTION_PLAN_VIEW_MODE,
} from '../../stores/execution-plan/ExecutionPlanState.js';
import {
  type VariableExpression,
  type ParameterValidationContext,
  type ResultType,
  Multiplicity,
} from '@finos/legend-graph';
import {
  PanelListItem,
  PanelDivider,
  Button,
  PanelContent,
} from '@finos/legend-art';
import { ResultTypeViewer } from './ResultTypeViewer.js';

export const FunctionParametersValidationNodeViewer: React.FC<{
  functionParameters: VariableExpression[];
  parameterValidationContext: ParameterValidationContext[];
  resultType: ResultType;
  executionPlanState: ExecutionPlanState;
}> = observer((props) => {
  const { functionParameters, resultType, executionPlanState } = props;
  const applicationStore = executionPlanState.applicationStore;

  const showMultiplicity = (multiplicity: Multiplicity): string => {
    if (multiplicity === Multiplicity.ZERO) {
      return '[0]';
    }
    if (multiplicity === Multiplicity.ONE) {
      return '[1]';
    }
    if (multiplicity === Multiplicity.ZERO_ONE) {
      return '[0..1]';
    }
    if (
      multiplicity === Multiplicity.ZERO_MANY ||
      multiplicity === Multiplicity.ONE_MANY
    ) {
      return '[*]';
    }
    if (multiplicity.upperBound === undefined) {
      return `[${multiplicity.lowerBound.toString()}.. *]`;
    }
    return `[${multiplicity.lowerBound.toString()}..${multiplicity.upperBound.toString()}]`;
  };
  return (
    <PanelContent
      darkMode={
        !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
      }
    >
      <div className="query-builder__function-parameters-validation__container">
        <div>
          <PanelListItem className="query-builder__function-parameters-validation__container__item__label">
            Variables Details
          </PanelListItem>
          <PanelDivider />
          <table className="table query-builder__function-parameters-validation__container__table">
            <thead>
              <tr>
                <th className="table__cell--left">Name</th>
                <th className="table__cell--left">Type</th>
              </tr>
            </thead>
            <tbody>
              {functionParameters.map((parameter) => (
                <React.Fragment key={parameter.name}>
                  <tr>
                    <td className="table__cell--left">{parameter.name}</td>
                    <td className="table__cell--left">
                      {`${parameter.genericType?.value.rawType
                        .name} ${showMultiplicity(parameter.multiplicity)}`}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <PanelDivider />
      <ResultTypeViewer resultType={resultType} />
      <div className="query-builder__function-parameters-validation__container">
        <Button
          className="btn--dark execution-node-viewer__unsupported-view__to-text-mode__btn"
          onClick={(): void =>
            executionPlanState.setViewMode(EXECUTION_PLAN_VIEW_MODE.JSON)
          }
          text="View JSON"
        />
      </div>
      <PanelDivider />
    </PanelContent>
  );
});
