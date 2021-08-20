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

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { FaTimes, FaArrowAltCircleRight } from 'react-icons/fa';
import {
  CustomSelectorInput,
  createFilter,
} from '@finos/legend-application-components';
import type { PackageableElementOption } from '../../../../stores/shared/PackageableElementOptionUtil';
import { useEditorStore } from '../../EditorStoreProvider';
import type {
  Profile,
  StereotypeReference,
  Stereotype,
} from '@finos/legend-graph';

interface StereotypeOption {
  label: string;
  value: Stereotype;
}

export const StereotypeSelector = observer(
  (props: {
    stereotype: StereotypeReference;
    deleteStereotype: () => void;
    isReadOnly: boolean;
  }) => {
    const { stereotype, deleteStereotype, isReadOnly } = props;
    const editorStore = useEditorStore();
    // Profile
    const profileOptions = editorStore.profileOptions.filter(
      (p) => p.value.stereotypes.length,
    );
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementOption<Profile>): string =>
        option.value.path,
    });
    const [selectedProfile, setSelectedProfile] = useState<
      PackageableElementOption<Profile>
    >({ value: stereotype.value.owner, label: stereotype.value.owner.name });
    const changeProfile = (val: PackageableElementOption<Profile>): void => {
      if (val.value.stereotypes.length) {
        setSelectedProfile(val);
        stereotype.setValue(val.value.stereotypes[0]);
      }
    };
    const visitProfile = (): void =>
      editorStore.openElement(selectedProfile.value);
    // Stereotype
    const stereotypeOptions = selectedProfile.value.stereotypes.map(
      (stereotype) => ({
        label: stereotype.value,
        value: stereotype,
      }),
    );
    const stereotypeFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: StereotypeOption): string => option.label,
    });
    const selectedStereotype = {
      value: stereotype.value,
      label: stereotype.value.value,
    };
    const updateStereotype = (val: StereotypeOption): void =>
      stereotype.setValue(val.value);
    return (
      <div className="stereotype-selector">
        <div className="stereotype-selector__profile">
          <CustomSelectorInput
            className="stereotype-selector__profile__selector"
            disabled={isReadOnly}
            options={profileOptions}
            onChange={changeProfile}
            value={selectedProfile}
            placeholder={'Choose a profile'}
            filterOption={filterOption}
          />
          <button
            className="stereotype-selector__profile__visit-btn"
            disabled={stereotype.value.owner.isStub}
            onClick={visitProfile}
            tabIndex={-1}
            title={'Visit profile'}
          >
            <FaArrowAltCircleRight />
          </button>
        </div>
        <CustomSelectorInput
          className="stereotype-selector__stereotype"
          disabled={isReadOnly}
          options={stereotypeOptions}
          onChange={updateStereotype}
          value={selectedStereotype}
          placeholder={'Choose a stereotype'}
          filterOption={stereotypeFilterOption}
        />
        {!isReadOnly && (
          <button
            className="uml-element-editor__remove-btn"
            disabled={isReadOnly}
            onClick={deleteStereotype}
            tabIndex={-1}
            title={'Remove'}
          >
            <FaTimes />
          </button>
        )}
      </div>
    );
  },
);
