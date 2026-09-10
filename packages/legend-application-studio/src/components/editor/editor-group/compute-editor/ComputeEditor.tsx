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

import React from 'react';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type AppDirOwner,
  type SnowflakeComputeSpecification,
  AppDirLevel,
  AppDirNode,
  observe_AppDirNode,
} from '@finos/legend-graph';
import {
  clsx,
  CustomSelectorInput,
  PanelContent,
  PanelForm,
  PanelFormBooleanField,
  PanelFormSection,
  PanelFormTextField,
  PanelHeader,
} from '@finos/legend-art';
import { useApplicationStore } from '@finos/legend-application';
import {
  ComputeEditorState,
  applyOptionalInt,
} from '../../../../stores/editor/editor-state/element-editor-state/compute/ComputeEditorState.js';
import {
  type ComputeEnumOption,
  type ComputeFormDescriptor,
  type ComputeFormField,
  getVisibleComputeFormSections,
} from '../../../../stores/editor/editor-state/element-editor-state/compute/ComputeFormDescriptor.js';
import { SNOWFLAKE_COMPUTE_FORM_DESCRIPTOR } from '../../../../stores/editor/editor-state/element-editor-state/compute/SnowflakeComputeFormDescriptor.js';
import {
  appDirNode_setAppDirId,
  appDirOwner_setProdParallel,
  appDirOwner_setProduction,
} from '../../../../stores/graph-modifier/DSL_Compute_GraphModifierHelper.js';

const NumberField = (props: {
  name: string;
  value: number | undefined;
  errorMessage?: string | undefined;
  isReadOnly: boolean;
  onChange: (value: string) => void;
}): React.ReactElement => {
  const { name, value, errorMessage, isReadOnly, onChange } = props;
  return (
    <div className="input-group">
      <input
        className={clsx(
          'input input-group__input panel__content__form__section__input input--dark input--small',
          { 'input--caution': Boolean(errorMessage) },
        )}
        type="number"
        title={name}
        disabled={isReadOnly}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
      {errorMessage && (
        <div className="input-group__error-message input--small">
          {errorMessage}
        </div>
      )}
    </div>
  );
};

const OwnerSection = observer((props: { state: ComputeEditorState }) => {
  const { state } = props;
  const owner = state.compute.owner;
  const isReadOnly = state.isReadOnly;

  const buildDeploymentNode = (id: number): AppDirNode => {
    const node = observe_AppDirNode(new AppDirNode());
    node.appDirId = id;
    node.level = AppDirLevel.DEPLOYMENT;
    return node;
  };

  const updateNode =
    (
      current: AppDirNode | undefined,
      setNode: (owner: AppDirOwner, node: AppDirNode | undefined) => void,
    ) =>
    (raw: string): void => {
      applyOptionalInt(raw, (id) => {
        if (id === undefined) {
          setNode(owner, undefined);
        } else if (current) {
          appDirNode_setAppDirId(current, id);
        } else {
          setNode(owner, buildDeploymentNode(id));
        }
      });
    };

  return (
    <>
      <div className="compute-editor__section-header">
        <span>Owner</span>
      </div>
      <PanelForm>
        <div className="compute-editor__field-row">
          <PanelFormSection>
            <div className="panel__content__form__section__header__label">
              Production AppDir ID
            </div>
            <NumberField
              name="Production AppDir ID"
              value={owner.production?.appDirId}
              errorMessage={
                owner.production
                  ? undefined
                  : 'A production AppDir ID is required'
              }
              isReadOnly={isReadOnly}
              onChange={updateNode(owner.production, appDirOwner_setProduction)}
            />
          </PanelFormSection>
          <PanelFormSection>
            <div className="panel__content__form__section__header__label">
              Prod-parallel AppDir ID
            </div>
            <NumberField
              name="Prod-parallel AppDir ID"
              value={owner.prodParallel?.appDirId}
              isReadOnly={isReadOnly}
              onChange={updateNode(
                owner.prodParallel,
                appDirOwner_setProdParallel,
              )}
            />
          </PanelFormSection>
        </div>
      </PanelForm>
    </>
  );
});

interface ComputeFormFieldProps {
  field: ComputeFormField;
  spec: SnowflakeComputeSpecification;
  isReadOnly: boolean;
  applyEdit: (mutate: () => void) => void;
}

const LabelledSection = (props: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement => (
  <PanelFormSection>
    <div className="panel__content__form__section__header__label">
      {props.label}
    </div>
    {props.children}
  </PanelFormSection>
);

const ComputeFormFieldEditor = observer((props: ComputeFormFieldProps) => {
  const { field, spec, isReadOnly, applyEdit } = props;
  const applicationStore = useApplicationStore();

  switch (field.widget) {
    case 'text': {
      return (
        <PanelFormTextField
          name={field.label}
          value={field.get(spec)}
          isReadOnly={isReadOnly}
          // an emptied field arrives as `undefined`, which is how it is unset
          update={(value): void => {
            applyEdit(() => field.set(spec, value));
          }}
        />
      );
    }
    case 'number': {
      return (
        <LabelledSection label={field.label}>
          <NumberField
            name={field.label}
            value={field.get(spec)}
            isReadOnly={isReadOnly}
            onChange={(raw): void => {
              applyOptionalInt(raw, (next) =>
                applyEdit(() => field.set(spec, next)),
              );
            }}
          />
        </LabelledSection>
      );
    }
    case 'boolean': {
      return (
        <PanelFormBooleanField
          prompt={field.label}
          value={field.get(spec) ?? false}
          isReadOnly={isReadOnly}
          update={(value: boolean | undefined): void => {
            applyEdit(() => field.set(spec, value ?? false));
          }}
        />
      );
    }
    case 'enum': {
      const current = field.get(spec);
      const selected: ComputeEnumOption | null =
        field.options.find((option) => option.value === current) ??
        (current === undefined
          ? null
          : { label: String(current), value: current });
      return (
        <LabelledSection label={field.label}>
          <CustomSelectorInput
            options={field.options}
            value={selected}
            onChange={(option: ComputeEnumOption | null): void => {
              // a field carrying a default must always hold a value
              if (!option && field.defaultValue !== undefined) {
                return;
              }
              applyEdit(() => field.set(spec, option?.value));
            }}
            isClearable={field.defaultValue === undefined}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            disabled={isReadOnly}
          />
        </LabelledSection>
      );
    }
    default:
      return null;
  }
});

const SnowflakeForm = observer(
  (props: {
    descriptor: ComputeFormDescriptor;
    spec: SnowflakeComputeSpecification;
    applyEdit: (mutate: () => void) => void;
    isReadOnly: boolean;
  }) => {
    const { descriptor, spec, applyEdit, isReadOnly } = props;

    return (
      <>
        <PanelForm>
          <div className="compute-editor__lead-field">
            <ComputeFormFieldEditor
              field={descriptor.leadField}
              spec={spec}
              isReadOnly={isReadOnly}
              applyEdit={applyEdit}
            />
          </div>
        </PanelForm>

        {getVisibleComputeFormSections(descriptor, spec).map((section) => (
          <React.Fragment key={section.title}>
            <div className="compute-editor__section-header">
              <span>{section.title}</span>
            </div>
            <PanelForm>
              {section.fields.map((field) => (
                <ComputeFormFieldEditor
                  key={field.key}
                  field={field}
                  spec={spec}
                  isReadOnly={isReadOnly}
                  applyEdit={applyEdit}
                />
              ))}
            </PanelForm>
          </React.Fragment>
        ))}
      </>
    );
  },
);

export const ComputeEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const state =
    editorStore.tabManagerState.getCurrentEditorState(ComputeEditorState);
  const isReadOnly = state.isReadOnly;
  const spec = state.snowflakeSpecification;

  return (
    <div className="compute-editor">
      <PanelHeader
        title={spec ? SNOWFLAKE_COMPUTE_FORM_DESCRIPTOR.label : 'compute'}
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
        isReadOnly={isReadOnly}
      />
      <PanelContent className="compute-editor__content">
        <OwnerSection state={state} />
        {spec ? (
          <SnowflakeForm
            descriptor={SNOWFLAKE_COMPUTE_FORM_DESCRIPTOR}
            spec={spec}
            applyEdit={state.applyFieldEdit}
            isReadOnly={isReadOnly}
          />
        ) : (
          <div className="compute-editor__unknown-message">
            This Compute&apos;s specification type is not supported in form
            mode. Open it in text mode to edit while preserving the original
            content.
          </div>
        )}
      </PanelContent>
    </div>
  );
});
