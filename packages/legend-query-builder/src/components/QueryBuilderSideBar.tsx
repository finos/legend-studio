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
  CogIcon,
  PURE_ClassIcon,
  PURE_MappingIcon,
  PURE_RuntimeIcon,
  ClockIcon,
  clsx,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import { QUERY_BUILDER_TEST_ID } from './QueryBuilder_TestID.js';
import {
  type Class,
  type Mapping,
  type Runtime,
  type ValueSpecification,
  PRIMITIVE_TYPE,
  LATEST_DATE,
  MILESTONING_STEREOTYPE,
  PrimitiveInstanceValue,
  VariableExpression,
  getMilestoneTemporalStereotype,
  PackageableElementExplicitReference,
  RuntimePointer,
  VARIABLE_REFERENCE_TOKEN,
  isElementDeprecated,
} from '@finos/legend-graph';
import {
  type PackageableElementOption,
  getPackageableElementOptionFormatter,
  buildElementOption,
  useApplicationStore,
} from '@finos/legend-application';
import { MilestoningParametersEditor } from './explorer/QueryBuilderMilestoningEditor.js';

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
    return '(unknown)';
  }
};

const generateClassLabel = (
  val: Class,
  queryBuilderState: QueryBuilderState,
): string | React.ReactNode => {
  const milestoneStereotype = getMilestoneTemporalStereotype(
    val,
    queryBuilderState.graphManagerState.graph,
  );

  const isDeprecatedClass = isElementDeprecated(
    val,
    queryBuilderState.graphManagerState.graph,
  );

  let milestoningTooltipText: string | undefined;
  switch (milestoneStereotype) {
    case MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL:
      milestoningTooltipText = `Business Date: ${getParameterValue(
        queryBuilderState.milestoningState.businessDate,
      )}`;
      break;
    case MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL:
      milestoningTooltipText = `Processing Date: ${getParameterValue(
        queryBuilderState.milestoningState.processingDate,
      )}`;
      break;
    case MILESTONING_STEREOTYPE.BITEMPORAL:
      milestoningTooltipText = `Processing Date: ${getParameterValue(
        queryBuilderState.milestoningState.processingDate,
      )}, Business Date: ${getParameterValue(
        queryBuilderState.milestoningState.businessDate,
      )}`;
      break;
    default:
      milestoningTooltipText = undefined;
  }

  return (
    <div
      className={clsx('query-builder__setup__class-option-label', {
        'query-builder__setup__class-option-label--deprecated':
          isDeprecatedClass,
      })}
    >
      <div className="query-builder__setup__class-option-label__name">
        {val.name}
      </div>
      {milestoningTooltipText && (
        <ClockIcon
          className="query-builder__setup__class-option-label__milestoning"
          title={`This class is milestoned:\n${milestoningTooltipText}`}
        />
      )}
    </div>
  );
};

export const QueryBuilderClassSelector = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    classes: Class[];
    onClassChange?: ((val: Class) => void) | undefined;
    noMatchMessage?: string | undefined;
  }) => {
    const { queryBuilderState, classes, onClassChange, noMatchMessage } = props;
    const milestoningState = queryBuilderState.milestoningState;
    const applicationStore = useApplicationStore();

    // class
    const elementFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementOption<Class>): string =>
        option.value.path,
    });

    const classOptions = classes.map((_class) => ({
      value: _class,
      label: generateClassLabel(_class, queryBuilderState),
    }));
    const selectedClassOption = queryBuilderState.class
      ? {
          value: queryBuilderState.class,
          label: generateClassLabel(queryBuilderState.class, queryBuilderState),
        }
      : null;
    const changeClass = (val: PackageableElementOption<Class>): void => {
      if (val.value === queryBuilderState.class) {
        return;
      }
      queryBuilderState.changeClass(val.value);
      onClassChange?.(val.value);
    };

    // milestoning
    const showMilestoningEditor = (): void =>
      milestoningState.setShowMilestoningEditor(true);

    return (
      <div className="query-builder__setup__config-group query-builder__setup__config-group--class">
        <div className="query-builder__setup__config-group__content">
          <div className="query-builder__setup__config-group__item ">
            <div
              className="btn--sm query-builder__setup__config-group__item__label"
              title="class"
            >
              <PURE_ClassIcon />
            </div>
            <CustomSelectorInput
              className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector query-builder__setup__config-group__item__selector__milestoned"
              placeholder={
                classOptions.length
                  ? 'Choose a class...'
                  : noMatchMessage ?? 'No class found'
              }
              disabled={classOptions.length <= 1}
              noMatchMessage={noMatchMessage}
              options={classOptions}
              onChange={changeClass}
              value={selectedClassOption}
              darkMode={!applicationStore.TEMPORARY__isLightThemeEnabled}
              filterOption={elementFilterOption}
              formatOptionLabel={getPackageableElementOptionFormatter({
                darkMode: !applicationStore.TEMPORARY__isLightThemeEnabled,
              })}
            />
            {queryBuilderState.isQuerySupported && (
              <button
                className="btn--dark btn__icon--dark query-builder__setup__milestoning"
                tabIndex={-1}
                onClick={showMilestoningEditor}
                disabled={!milestoningState.isMilestonedQuery}
                title="Edit Milestoning Parameters"
              >
                <ClockIcon />
              </button>
            )}
            {milestoningState.isMilestonedQuery && (
              <MilestoningParametersEditor
                queryBuilderState={queryBuilderState}
              />
            )}
          </div>
        </div>
      </div>
    );
  },
);

export const buildRuntimeValueOption = (
  runtimeValue: Runtime,
): { label: string; value: Runtime } => ({
  value: runtimeValue,
  label:
    runtimeValue instanceof RuntimePointer
      ? runtimeValue.packageableRuntime.value.name
      : 'custom',
});

export const getRuntimeOptionFormatter = (props: {
  darkMode?: boolean;
}): ((option: { value: Runtime }) => React.ReactNode) =>
  function RuntimeOptionLabel(option: { value: Runtime }): React.ReactNode {
    if (option.value instanceof RuntimePointer) {
      const runtimePointer = option.value;
      return getPackageableElementOptionFormatter(props)(
        buildElementOption(runtimePointer.packageableRuntime.value),
      );
    }
    return option.value instanceof RuntimePointer ? (
      option.value.packageableRuntime.value.name
    ) : (
      <div className="query-builder__setup__runtime-option--custom">
        <CogIcon />
        <div className="query-builder__setup__runtime-option--custom__label">
          custom
        </div>
      </div>
    );
  };

const BasicQueryBuilderSetup = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();

    // classes
    const classes = queryBuilderState.graphManagerState.usableClasses;

    // mapping
    const mappingOptions =
      queryBuilderState.graphManagerState.usableMappings.map(
        buildElementOption,
      );
    const selectedMappingOption = queryBuilderState.mapping
      ? buildElementOption(queryBuilderState.mapping)
      : null;
    const changeMapping = (val: PackageableElementOption<Mapping>): void => {
      if (
        !queryBuilderState.class ||
        val.value === queryBuilderState.mapping ||
        queryBuilderState.isMappingReadOnly
      ) {
        return;
      }
      queryBuilderState.changeMapping(val.value);
    };
    const mappingFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementOption<Mapping>): string =>
        option.value.path,
    });

    // runtime
    const runtimeOptions = queryBuilderState.graphManagerState.usableRuntimes
      .map(
        (rt) =>
          new RuntimePointer(PackageableElementExplicitReference.create(rt)),
      )
      .map(buildRuntimeValueOption);
    const selectedRuntimeOption = queryBuilderState.runtimeValue
      ? buildRuntimeValueOption(queryBuilderState.runtimeValue)
      : null;
    const changeRuntime = (val: { value: Runtime }): void => {
      if (
        val.value === queryBuilderState.runtimeValue ||
        queryBuilderState.isRuntimeReadOnly
      ) {
        return;
      }
      queryBuilderState.changeRuntime(val.value);
    };
    const runtimeFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: { value: Runtime }): string =>
        option.value instanceof RuntimePointer
          ? option.value.packageableRuntime.value.path
          : 'custom',
    });

    return (
      <>
        <QueryBuilderClassSelector
          queryBuilderState={queryBuilderState}
          classes={classes}
        />
        <div className="query-builder__setup__config-group">
          <div className="query-builder__setup__config-group__header">
            <div className="query-builder__setup__config-group__header__title">
              execution context
            </div>
          </div>
          <div className="query-builder__setup__config-group__content">
            <div className="query-builder__setup__config-group__item">
              <div
                className="btn--sm query-builder__setup__config-group__item__label"
                title="mapping"
              >
                <PURE_MappingIcon />
              </div>
              <CustomSelectorInput
                className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
                placeholder={
                  mappingOptions.length
                    ? 'Choose a mapping...'
                    : 'No mapping found'
                }
                disabled={
                  queryBuilderState.isMappingReadOnly ||
                  !queryBuilderState.class
                }
                options={mappingOptions}
                onChange={changeMapping}
                value={selectedMappingOption}
                darkMode={!applicationStore.TEMPORARY__isLightThemeEnabled}
                filterOption={mappingFilterOption}
                formatOptionLabel={getPackageableElementOptionFormatter({
                  darkMode: !applicationStore.TEMPORARY__isLightThemeEnabled,
                })}
              />
            </div>
            <div className="query-builder__setup__config-group__item">
              <div
                className="btn--sm query-builder__setup__config-group__item__label"
                title="runtime"
              >
                <PURE_RuntimeIcon />
              </div>
              <CustomSelectorInput
                className="panel__content__form__section__dropdown query-builder__setup__config-group__item__selector"
                placeholder={
                  runtimeOptions.length
                    ? 'Choose a runtime...'
                    : 'No runtime found'
                }
                disabled={
                  queryBuilderState.isRuntimeReadOnly ||
                  !queryBuilderState.class ||
                  !queryBuilderState.mapping
                }
                options={runtimeOptions}
                onChange={changeRuntime}
                value={selectedRuntimeOption}
                darkMode={!applicationStore.TEMPORARY__isLightThemeEnabled}
                filterOption={runtimeFilterOption}
                formatOptionLabel={getRuntimeOptionFormatter({
                  darkMode: !applicationStore.TEMPORARY__isLightThemeEnabled,
                })}
              />
            </div>
          </div>
        </div>
      </>
    );
  },
);

export const QueryBuilderSidebar = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    children: React.ReactNode;
  }) => {
    const { queryBuilderState, children } = props;

    return (
      <div
        className={clsx(
          'query-builder__side-bar',
          queryBuilderState.sideBarClassName,
        )}
      >
        <div
          data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP}
          className="panel query-builder__setup"
        >
          <div className="panel__content query-builder__setup__content">
            {queryBuilderState.TEMPORARY__setupPanelContentRenderer?.() ?? (
              <BasicQueryBuilderSetup queryBuilderState={queryBuilderState} />
            )}
          </div>
        </div>
        <div className="query-builder__side-bar__content">{children}</div>
      </div>
    );
  },
);
