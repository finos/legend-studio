/**
 * Copyright 2020 Goldman Sachs
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
import { useEditorStore } from '../../../../stores/EditorStore';
import { FaTimes, FaArrowAltCircleRight } from 'react-icons/fa';
import {
  CustomSelectorInput,
  createFilter,
} from '@finos/legend-studio-components';
import type { PackageableElementSelectOption } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import type { Profile } from '../../../../models/metamodels/pure/model/packageableElements/domain/Profile';
import type { StereotypeSelectOption } from '../../../../models/metamodels/pure/model/packageableElements/domain/Stereotype';
import type { StereotypeReference } from '../../../../models/metamodels/pure/model/packageableElements/domain/StereotypeReference';

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
      stringify: (option: PackageableElementSelectOption<Profile>): string =>
        option.value.path,
    });
    const [selectedProfile, setSelectedProfile] = useState<
      PackageableElementSelectOption<Profile>
    >({ value: stereotype.value.owner, label: stereotype.value.owner.name });
    const changeProfile = (
      val: PackageableElementSelectOption<Profile>,
    ): void => {
      if (val.value.stereotypes.length) {
        setSelectedProfile(val);
        stereotype.setValue(val.value.stereotypes[0]);
      }
    };
    const visitProfile = (): void =>
      editorStore.openElement(selectedProfile.value);
    // Stereotype
    const stereotypeOptions = selectedProfile.value.stereotypeOptions;
    const stereotypeFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: StereotypeSelectOption): string => option.label,
    });
    const selectedStereotype = {
      value: stereotype.value,
      label: stereotype.value.value,
    };
    const updateStereotype = (val: StereotypeSelectOption): void =>
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
