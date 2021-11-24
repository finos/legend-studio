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
  ClassIcon,
  MappingIcon,
  RuntimeIcon,
  EyeIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import { QUERY_BUILDER_TEST_ID } from './QueryBuilder_TestID';
import type { Class, Mapping, Runtime } from '@finos/legend-graph';
import {
  PRIMITIVE_TYPE,
  PrimitiveInstanceValue,
  VariableExpression,
  isMilestonedClass,
  PackageableElementExplicitReference,
  RuntimePointer,
} from '@finos/legend-graph';
import type { PackageableElementOption } from '@finos/legend-application';
import { MilestoningParameterEditor } from './QueryBuilderParameterPanel';
import { useState } from 'react';
import { FaClock } from 'react-icons/fa';
import { MILESTONING_STEROTYPES } from '../QueryBuilder_Const';

export const QueryBuilderSetupPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const querySetupState = queryBuilderState.querySetupState;
    const elementFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementOption<Class>): string =>
        option.value.path,
    });
    const isQuerySupported = queryBuilderState.isQuerySupported();
    const getParameterValue = (index: number): string | undefined => {
      const parameter = querySetupState.classMilestoningValue[index];
      if (parameter instanceof VariableExpression) {
        return `$${parameter.name}`;
      } else {
        if (
          parameter instanceof PrimitiveInstanceValue &&
          parameter.genericType.value.rawType.name === PRIMITIVE_TYPE.STRICTDATE
        ) {
          return parameter.values[0] as string;
        }
        return '%latest';
      }
    };
    const classLabel = (val: Class): string | JSX.Element => {
      const stereotype = isMilestonedClass(
        val,
        queryBuilderState.graphManagerState.graph,
      );
      if (stereotype) {
        let milestoningParameterValues;
        switch (stereotype) {
          case MILESTONING_STEROTYPES.BUSINESS_TEMPORAL:
            milestoningParameterValues = `BusinessDate: ${getParameterValue(
              0,
            )}`;
            break;
          case MILESTONING_STEROTYPES.PROCESSING_TEMPORAL:
            milestoningParameterValues = `ProcessingDate: ${getParameterValue(
              0,
            )}`;
            break;
          case MILESTONING_STEROTYPES.BITEMPORAL:
            milestoningParameterValues = `BusinessDate: ${getParameterValue(
              0,
            )}, ProcessingDate: ${getParameterValue(1)}`;
            break;
          default:
            milestoningParameterValues = '';
        }

        return (
          <div className="query-builder__setup__config__item__class-label">
            <div className="query-builder__setup__config__item__class-label-content">
              {val.name}
            </div>
            <EyeIcon
              className="query-builder__setup__config__item__class-label-button"
              title={milestoningParameterValues}
            />
          </div>
        );
      }
      return val.name;
    };
    // class
    const classOptions = queryBuilderState.classOptions;
    const selectedClassOption = querySetupState._class
      ? {
          value: querySetupState._class,
          label: classLabel(querySetupState._class),
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
    const [isMilestoned, setIsMilestoned] = useState<boolean>(false);
    const close = (): void => {
      setIsMilestoned(false);
    };
    const isEnabled = queryBuilderState.querySetupState._class
      ? isMilestonedClass(
          queryBuilderState.querySetupState._class,
          queryBuilderState.graphManagerState.graph,
        )
      : undefined;

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
              <ClassIcon />
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
              onClick={(): void => setIsMilestoned(true)}
              disabled={!isEnabled}
              title="Edit Milestoning Parameters"
            >
              <FaClock />
            </button>
          </div>
          <div className="query-builder__setup__config__item">
            <div className="btn--sm query-builder__setup__config__item__label">
              <MappingIcon />
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
          {isMilestoned && isEnabled && (
            <MilestoningParameterEditor
              queryBuilderState={queryBuilderState}
              close={close}
              stereotype={isEnabled}
            />
          )}
          <div className="query-builder__setup__config__item">
            <div className="btn--sm query-builder__setup__config__item__label">
              <RuntimeIcon />
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
