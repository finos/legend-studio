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

/**
 * The renderer and the reconcile pass read the same `visible` predicates, so
 * what the user sees and what the model may hold cannot drift apart. The engine
 * rejects properties that are illegal for the selected warehouse type.
 *
 * Bound to `SnowflakeComputeSpecification` rather than generic over a vendor
 * spec: Snowflake is the only vendor whose form is conditional.
 *
 * Numeric limits are not modelled. The engine's are tunable server-side, so a
 * copy here would reject values the backend accepts.
 */

import type { SnowflakeComputeSpecification } from '@finos/legend-graph';

/** Every enum option is a string except `generation`, which is numeric. */
export type ComputeEnumOptionValue = string | number;

export interface ComputeEnumOption {
  label: string;
  value: ComputeEnumOptionValue;
}

interface ComputeFormFieldBase<TValue> {
  key: string;
  label: string;
  /** When false, the reconcile pass clears the field rather than hiding it. */
  visible: (spec: SnowflakeComputeSpecification) => boolean;
  /** Set on the fields that must always hold a value while visible. */
  defaultValue?: TValue | undefined;
  get: (spec: SnowflakeComputeSpecification) => TValue | undefined;
  set(spec: SnowflakeComputeSpecification, value: TValue | undefined): void;
}

export type ComputeFormField =
  | ({
      widget: 'text';
    } & ComputeFormFieldBase<string>)
  | ({ widget: 'number' } & ComputeFormFieldBase<number>)
  | ({ widget: 'boolean' } & ComputeFormFieldBase<boolean>)
  | ({
      widget: 'enum';
      options: ComputeEnumOption[];
    } & ComputeFormFieldBase<ComputeEnumOptionValue>);

type ComputeEnumFormField = Extract<ComputeFormField, { widget: 'enum' }>;

export interface ComputeFormSection {
  title: string;
  fields: ComputeFormField[];
}

export interface ComputeFormDescriptor {
  label: string;
  /** The field the others' `visible` predicates key off. */
  leadField: ComputeEnumFormField;
  sections: ComputeFormSection[];
}

export const getComputeFormFields = (
  descriptor: ComputeFormDescriptor,
): ComputeFormField[] => [
  descriptor.leadField,
  ...descriptor.sections.flatMap((section) => section.fields),
];

export const getVisibleComputeFormSections = (
  descriptor: ComputeFormDescriptor,
  spec: SnowflakeComputeSpecification,
): ComputeFormSection[] =>
  descriptor.sections
    .map((section) => ({
      title: section.title,
      fields: section.fields.filter((field) => field.visible(spec)),
    }))
    .filter((section) => section.fields.length > 0);

/**
 * Bring `spec` back in line with the descriptor after a mutation. Defaults
 * apply only while a field is visible, and cleared values are not restored.
 */
export const reconcileComputeSpec = (
  descriptor: ComputeFormDescriptor,
  spec: SnowflakeComputeSpecification,
): void => {
  const fields = getComputeFormFields(descriptor);
  // the bound is only to stop a descriptor whose predicates form a cycle
  const maxPasses = fields.length + 1;
  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;
    for (const field of fields) {
      const current = field.get(spec);
      if (!field.visible(spec)) {
        if (current !== undefined) {
          field.set(spec, undefined);
          changed = true;
        }
      } else if (current === undefined && field.defaultValue !== undefined) {
        field.set(spec, field.defaultValue as never);
        changed = true;
      }
    }
    if (!changed) {
      return;
    }
  }
};
