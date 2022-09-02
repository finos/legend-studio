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
  BlankPanelContent,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import type { QueryBuilderState } from '../../stores/query-builder/QueryBuilderState.js';
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
import { MilestoningParametersEditor } from './explorer/QueryBuilderMilestoneEditor.js';
import { useState } from 'react';
import type { BasicQueryBuilderSetupState } from '../../stores/query-builder/QueryBuilderSetupState.js';

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
): string | React.ReactNode => {
  const milestoneStereotype = getMilestoneTemporalStereotype(
    val,
    queryBuilderState.graphManagerState.graph,
  );

  const isDeprecatedClass = isElementDeprecated(
    val,
    queryBuilderState.graphManagerState.graph,
  );

  if (milestoneStereotype) {
    let milestoningParameterValues;
    switch (milestoneStereotype) {
      case MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL:
        milestoningParameterValues = `Business Date: ${getParameterValue(
          queryBuilderState.milestoningState.businessDate,
        )}`;
        break;
      case MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL:
        milestoningParameterValues = `Processing Date: ${getParameterValue(
          queryBuilderState.milestoningState.processingDate,
        )}`;
        break;
      case MILESTONING_STEREOTYPE.BITEMPORAL:
        milestoningParameterValues = `Processing Date: ${getParameterValue(
          queryBuilderState.milestoningState.processingDate,
        )}, Business Date: ${getParameterValue(
          queryBuilderState.milestoningState.businessDate,
        )}`;
        break;
      default:
        milestoningParameterValues = '';
    }

    return (
      <div className="query-builder__setup__config__item__class-label">
        <div
          className={clsx(
            'query-builder__setup__config__item__class-label__content',
            {
              ' query-builder__setup__config__item__class-label--deprecated':
                isDeprecatedClass,
            },
          )}
        >
          {val.name}
        </div>
        <ClockIcon
          className="query-builder__setup__config__item__class-label__milestoning"
          title={milestoningParameterValues}
        />
      </div>
    );
  }
  return (
    <div className="query-builder__setup__config__item__class-label">
      <div
        className={clsx(
          'query-builder__setup__config__item__class-label__content',
          {
            ' query-builder__setup__config__item__class-label--deprecated':
              isDeprecatedClass,
          },
        )}
      >
        {val.name}
      </div>
    </div>
  );
};

const BasicQueryBuilderSetupPanel = observer(
  (props: { setupState: BasicQueryBuilderSetupState }) => {
    const { setupState } = props;
    const queryBuilderState = setupState.queryBuilderState;
    const applicationStore = useApplicationStore();
    const [isMilestoneEditorOpened, setIsMilestoneEditorOpened] =
      useState<boolean>(false);
    const elementFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementOption<Class>): string =>
        option.value.path,
    });
    const isQuerySupported = queryBuilderState.isQuerySupported;
    // class
    const classOptions = setupState.classes.map((_class) => ({
      value: _class,
      label: generateClassLabel(_class, queryBuilderState),
    }));
    const selectedClassOption = setupState._class
      ? {
          value: setupState._class,
          label: generateClassLabel(setupState._class, queryBuilderState),
        }
      : null;
    const changeClass = (val: PackageableElementOption<Class>): void => {
      queryBuilderState.changeClass(val.value);
    };
    // mapping
    const mappingOptions = setupState.mappings.map(buildElementOption);
    const selectedMappingOption = setupState.mapping
      ? buildElementOption(setupState.mapping)
      : null;
    const changeMapping = (val: PackageableElementOption<Mapping>): void => {
      if (setupState._class && !queryBuilderState.isMappingReadOnly) {
        setupState.setMapping(val.value);
        queryBuilderState.resetQueryBuilder();
        queryBuilderState.resetQueryContent();
      }
    };
    // runtime
    const runtime = setupState.runtimeValue;
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
      setupState.compatibleRuntimes.map((rt) => ({
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
        setupState.setRuntimeValue(val.value);
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
      queryBuilderState.milestoningState.businessDate ??
        queryBuilderState.milestoningState.processingDate,
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
              darkMode={!applicationStore.TEMPORARY__isLightThemeEnabled}
              disabled={!isQuerySupported || queryBuilderState.isClassReadOnly}
              filterOption={elementFilterOption}
              formatOptionLabel={getPackageableElementOptionFormatter({
                darkMode: !applicationStore.TEMPORARY__isLightThemeEnabled,
              })}
            />
            <button
              className="btn--dark btn__icon--dark query-builder__setup__milestoning"
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
                queryBuilderState.isMappingReadOnly ||
                !setupState._class ||
                !mappingOptions.length
              }
              options={mappingOptions}
              onChange={changeMapping}
              value={selectedMappingOption}
              darkMode={!applicationStore.TEMPORARY__isLightThemeEnabled}
              filterOption={elementFilterOption}
              formatOptionLabel={getPackageableElementOptionFormatter({
                darkMode: !applicationStore.TEMPORARY__isLightThemeEnabled,
              })}
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
                queryBuilderState.isRuntimeReadOnly ||
                !setupState._class ||
                !setupState.mapping
              }
              options={runtimeOptions}
              onChange={changeRuntime}
              value={selectedRuntimeOption}
              darkMode={!applicationStore.TEMPORARY__isLightThemeEnabled}
              filterOption={runtimeFilterOption}
            />
          </div>
        </div>
      </div>
    );
  },
);

export const QueryBuilderSetupPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    // const setupState = queryBuilderState.setupState;

    // if (setupState instanceof BasicQueryBuilderSetupState) {
    //   return <BasicQueryBuilderSetupPanel setupState={setupState} />;
    // }
    return <BlankPanelContent>Unsupported query setup</BlankPanelContent>;
  },
);
