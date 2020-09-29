/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observable, computed, action } from 'mobx';
import { ACTION_STATE } from 'Const';

export class ActionState {
  @observable state = ACTION_STATE.INITIAL;

  @action withState(val: ACTION_STATE): ActionState { this.state = val; return this }
  @action initial(): ActionState { this.state = ACTION_STATE.INITIAL; return this }
  @action inProgress(): ActionState { this.state = ACTION_STATE.IN_PROGRESS; return this }
  @action fail(): ActionState { this.state = ACTION_STATE.FAILED; return this }
  @action pass(): ActionState { this.state = ACTION_STATE.SUCCEEDED; return this }
  @action conclude(hasSucceeded: boolean): ActionState { if (hasSucceeded) { this.pass() } else { this.fail() } return this }
  @action reset(): ActionState { return this.initial() }

  @computed get isInInitialState(): boolean { return this.state === ACTION_STATE.INITIAL }
  @computed get isInProgress(): boolean { return this.state === ACTION_STATE.IN_PROGRESS }
  @computed get hasFailed(): boolean { return this.state === ACTION_STATE.FAILED }
  @computed get hasSucceeded(): boolean { return this.state === ACTION_STATE.SUCCEEDED }
}
