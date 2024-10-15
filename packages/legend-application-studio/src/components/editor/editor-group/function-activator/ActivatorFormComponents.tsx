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

import { ExclamationCircleIcon } from '@finos/legend-art';
import {
  DeploymentOwner,
  UserList,
  type FunctionActivator,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import {
  activator_setDeploymentOwner,
  activator_setOwnership,
} from '../../../../stores/graph-modifier/DSL_FunctionActivator_GraphModifierHelper.js';
import { useState } from 'react';

export const ActivatorOwnershipForm = observer(
  (props: { activator: FunctionActivator; isReadOnly: boolean }) => {
    const { activator, isReadOnly } = props;
    const ownership = activator.ownership;

    const [ownerInputValue, setOwner] = useState<string>(
      ownership instanceof DeploymentOwner ? ownership.id : '',
    );
    const updateDeploymentIdentifier: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => {
      if (!isReadOnly && ownership instanceof DeploymentOwner) {
        setOwner(event.target.value);
        activator_setDeploymentOwner(ownership, event.target.value);
      }
    };

    return (
      <div>
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">
            Ownership
          </div>
        </div>
        {ownership instanceof DeploymentOwner && (
          <div className="panel__content__form__section">
            <div className="panel__content__form__section__header__prompt">
              Provide a deployment identifier that will own the Lambda.
            </div>
            <input
              className="panel__content__form__section__input"
              spellCheck={false}
              disabled={isReadOnly}
              value={ownerInputValue}
              onChange={updateDeploymentIdentifier}
            />
          </div>
        )}
        {ownership instanceof UserList && (
          <div className="project-configuration-editor__project__structure__version">
            <div className="project-configuration-editor__project__structure__version__label">
              <div className="project-configuration-editor__project__structure__version__label__status">
                <ExclamationCircleIcon className="project-configuration-editor__project__structure__version__label__status--outdated" />
              </div>
              <div className="project-configuration-editor__project__structure__version__label__text">
                {`User List Ownership has been deprecated`}
              </div>
            </div>
            <button
              className="project-configuration-editor__project__structure__version__update-btn"
              disabled={isReadOnly}
              onClick={() =>
                activator_setOwnership(
                  activator,
                  new DeploymentOwner('', activator),
                )
              }
              tabIndex={-1}
              title={`Click to Change to Deployment`}
            >
              Change to Deployment
            </button>
          </div>
        )}
      </div>
    );
  },
);
