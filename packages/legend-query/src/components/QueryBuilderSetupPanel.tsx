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

import {
  CustomSelectorInput,
  createFilter,
  ErrorIcon,
  CogIcon,
  PURE_ClassIcon,
  PURE_MappingIcon,
  PURE_RuntimeIcon,
  EyeIcon,
  ClockIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import { QUERY_BUILDER_TEST_ID } from './QueryBuilder_TestID';
import {
  type Class,
  type Mapping,
  type Runtime,
  type ValueSpecification,
  PRIMITIVE_TYPE,
  LATEST_DATE,
  MILESTONING_STEROTYPE,
  PrimitiveInstanceValue,
  VariableExpression,
  getMilestoneTemporalStereotype,
  PackageableElementExplicitReference,
  RuntimePointer,
  VARIABLE_REFERENCE_TOKEN,
} from '@finos/legend-graph';
import type { PackageableElementOption } from '@finos/legend-application';
import { MilestoningParametersEditor } from './QueryBuilderMilestoneEditor';
import { useState } from 'react';

const getParameterValue = (
  parameter: ValueSpecification | undefined,
): string | undefined => {
  if (parameter instanceof VariableExpression) {
    return `${VARIABLE_REFERENCE_TOKEN}${parameter.name}`;
  } else {
    if (
      parameter instanceof PrimitiveInstanceValue &&
      parameter.genericType.value.rawType.name === PRIMITIVE_TYPE.STRICTDATE
    ) {
      return parameter.values[0] as string;
    } else if (
      parameter instanceof PrimitiveInstanceValue &&
      parameter.genericType.value.rawType.name === PRIMITIVE_TYPE.LATESTDATE
    ) {
      return LATEST_DATE;
    }
    return 'unknown';
  }
};

const generateClassLabel = (
  val: Class,
  queryBuilderState: QueryBuilderState,
): string | JSX.Element => {
  const milestoneStereotype = getMilestoneTemporalStereotype(
    val,
    queryBuilderState.graphManagerState.graph,
  );
  if (milestoneStereotype) {
    let milestoningParameterValues;
    switch (milestoneStereotype) {
      case MILESTONING_STEROTYPE.BUSINESS_TEMPORAL:
        milestoningParameterValues = `Business Date: ${getParameterValue(
          queryBuilderState.querySetupState._businessDate,
        )}`;
        break;
      case MILESTONING_STEROTYPE.PROCESSING_TEMPORAL:
        milestoningParameterValues = `Processing Date: ${getParameterValue(
          queryBuilderState.querySetupState._processingDate,
        )}`;
        break;
      case MILESTONING_STEROTYPE.BITEMPORAL:
        milestoningParameterValues = `Processing Date: ${getParameterValue(
          queryBuilderState.querySetupState._processingDate,
        )}, Business Date: ${getParameterValue(
          queryBuilderState.querySetupState._businessDate,
        )}`;
        break;
      default:
        milestoningParameterValues = '';
    }

    return (
      <div className="query-builder__setup__config__item__class-label">
        <div className="query-builder__setup__config__item__class-label__content">
          {val.name}
        </div>
        <EyeIcon
          className="query-builder__setup__config__item__class-label__btn"
          title={milestoningParameterValues}
        />
      </div>
    );
  }
  return val.name;
};

export const QueryBuilderSetupPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const querySetupState = queryBuilderState.querySetupState;
    const [isMilestoneEditorOpened, setIsMilestoneEditorOpened] =
      useState<boolean>(false);
    const elementFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementOption<Class>): string =>
        option.value.path,
    });
    const isQuerySupported = queryBuilderState.isQuerySupported();
    // class
    const classOptions = queryBuilderState.classOptions;
    const selectedClassOption = querySetupState._class
      ? {
          value: querySetupState._class,
          label: generateClassLabel(querySetupState._class, queryBuilderState),
        }
      : null;
    const changeClass = (val: PackageableElementOption<Class>): void => {
      queryBuilderState.changeClass(val.value);
    };
    // mapping
    const mappingOptions = querySetupState.possibleMappings.map((mapping) => ({
      value: mapping,
      label: mapping.name,
    }));
    const inCompatibleMappingLabel = (
      <div
        className="query-builder__setup__config__item__mapping-option--incompatible"
        title={'Mapping incompatibe with class'}
      >
        <div className="query-builder__setup__config__item__mapping-option--incompatible__label">
          {querySetupState.mapping?.name ?? ''}
        </div>
        <ErrorIcon />
      </div>
    );
    const selectedMappingOption = querySetupState.mapping
      ? {
          value: querySetupState.mapping,
          label:
            querySetupState.isMappingCompatible || !isQuerySupported
              ? querySetupState.mapping.name
              : inCompatibleMappingLabel,
        }
      : null;
    const changeMapping = (val: PackageableElementOption<Mapping>): void => {
      if (querySetupState._class && !querySetupState.mappingIsReadOnly) {
        querySetupState.setMapping(val.value);
        queryBuilderState.resetQueryBuilder();
        queryBuilderState.resetQuerySetup();
      }
    };
    // runtime
    const runtime = querySetupState.runtime;
    const isRuntimePointer = runtime instanceof RuntimePointer;
    const customRuntimeLabel = (
      <div className="service-execution-editor__configuration__runtime-option--custom">
        <CogIcon />
        <div className="service-execution-editor__configuration__runtime-option--custom__label">
          (custom)
        </div>
      </div>
    );
    // only show custom runtime option when a runtime pointer is currently selected
    let runtimeOptions = !isRuntimePointer
      ? []
      : ([{ label: customRuntimeLabel }] as {
          label: string | React.ReactNode;
          value?: Runtime;
        }[]);
    runtimeOptions = runtimeOptions.concat(
      querySetupState.possibleRuntimes.map((rt) => ({
        value: new RuntimePointer(
          PackageableElementExplicitReference.create(rt),
        ),
        label: rt.name,
      })),
    );
    const selectedRuntimeOption = {
      value: runtime,
      label:
        runtime instanceof RuntimePointer
          ? runtime.packageableRuntime.value.name
          : '(custom)',
    };
    const changeRuntime = (val: {
      label: string | React.ReactNode;
      value?: Runtime;
    }): void => {
      if (val.value !== runtime) {
        querySetupState.setRuntime(val.value);
      }
    };
    const runtimeFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: { value: Runtime }): string =>
        option.value instanceof RuntimePointer
          ? option.value.packageableRuntime.value.path
          : '(custom)',
    });
    const close = (): void => {
      setIsMilestoneEditorOpened(false);
    };
    const isMilestonedQuery = Boolean(
      querySetupState._businessDate ?? querySetupState._processingDate,
    );

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP}
        className="panel query-builder__setup"
      >
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">setup</div>
          </div>
        </div>
        <div className="panel__content query-builder__setup__content">
          <div className="query-builder__setup__config__item">
            <div className="btn--sm query-builder__setup__config__item__label">
              <PURE_ClassIcon />
            </div>
            <CustomSelectorInput
              className="panel__content__form__section__dropdown query-builder__setup__config__item__selector query-builder__setup__config__item__selector__milestoned"
              placeholder="Choose a class..."
              options={classOptions}
              onChange={changeClass}
              value={selectedClassOption}
              darkMode={true}
              disabled={!isQuerySupported}
              filterOption={elementFilterOption}
            />
            <button
              className="btn--dark btn__icon--dark"
              tabIndex={-1}
              onClick={(): void => setIsMilestoneEditorOpened(true)}
              disabled={!isMilestonedQuery}
              title="Edit Milestoning Parameters"
            >
              <ClockIcon />
            </button>
          </div>
          <div className="query-builder__setup__config__item">
            <div className="btn--sm query-builder__setup__config__item__label">
              <PURE_MappingIcon />
            </div>
            <CustomSelectorInput
              className="panel__content__form__section__dropdown query-builder__setup__config__item__selector"
              placeholder={
                mappingOptions.length
                  ? 'Choose a mapping...'
                  : 'No mapping found for class'
              }
              disabled={
                querySetupState.mappingIsReadOnly ||
                !querySetupState._class ||
                !mappingOptions.length
              }
              options={mappingOptions}
              onChange={changeMapping}
              value={selectedMappingOption}
              darkMode={true}
              filterOption={elementFilterOption}
              hasError={
                querySetupState.mapping &&
                !querySetupState.isMappingCompatible &&
                isQuerySupported
              }
            />
          </div>
          {isMilestoneEditorOpened && isMilestonedQuery && (
            <MilestoningParametersEditor
              queryBuilderState={queryBuilderState}
              close={close}
            />
          )}
          <div className="query-builder__setup__config__item">
            <div className="btn--sm query-builder__setup__config__item__label">
              <PURE_RuntimeIcon />
            </div>
            <CustomSelectorInput
              className="panel__content__form__section__dropdown query-builder__setup__config__item__selector"
              placeholder="Choose or create a runtime..."
              disabled={
                querySetupState.runtimeIsReadOnly ||
                !querySetupState._class ||
                !querySetupState.mapping
              }
              options={runtimeOptions}
              onChange={changeRuntime}
              value={selectedRuntimeOption}
              darkMode={true}
              filterOption={runtimeFilterOption}
            />
          </div>
        </div>
      </div>
    );
  },
);
