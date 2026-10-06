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

import { test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import type { GeneratorFn } from '@finos/legend-shared';
import { BaseStepperState } from '../BaseStepperState.js';

class TestStepperState extends BaseStepperState {
  label = 'Test step';
  handled = false;

  *handleNext(): GeneratorFn<void> {
    this.handled = true;
  }
}

class CustomLabelStepperState extends TestStepperState {
  override get nextLabel(): string {
    return 'Continue';
  }
}

test(unitTest('Base stepper state default labels'), () => {
  const state = new TestStepperState();
  expect(state.label).toEqual('Test step');
  expect(state.nextLabel).toEqual('Next');
  expect(state.backLabel).toEqual('Back');
});

test(unitTest('Base stepper state labels can be overridden'), () => {
  const state = new CustomLabelStepperState();
  expect(state.nextLabel).toEqual('Continue');
  // the un-overridden label still comes from the base class
  expect(state.backLabel).toEqual('Back');
});

test(unitTest('Base stepper state runs its next handler'), () => {
  const state = new TestStepperState();
  expect(state.handled).toBe(false);
  // the generator yields nothing, so a single step runs it to completion
  state.handleNext().next();
  expect(state.handled).toBe(true);
});
