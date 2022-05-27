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

import { IllegalStateError } from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';

/**
 * Context data refers to the area of the application that the user is
 * currently navigating.
 *
 * NOTE: note that this is navigation-driven, do not associate places
 * which present in the app screen that is not a direct consequence
 * of user's navigation. e.g. the status bar is not a good area to
 * be considered a context, the editor screen is because it means
 * the user must have navigated to the editor screen from somewhere,
 * for instance, the setup page.
 */
export class ApplicationNavigationContextData {
  value: string;
  /**
   * There are 2 types of context data: `standard` and `transient`
   * 1. standard context data represents an application context layer that
   *    would be pushed to the stack and the context will be popped as we leave
   *    the application, in other words, the context will be properly cleaned up
   *    e.g. when we go in an editor, we will push context data to the stack and
   *    pop it when we leave that editor
   * 2. transient context does not guarantee to be cleaned up properly, this
   *    corresponds to application areas whose presense is transient and not stable:
   *    such as those triggered by on-flight events, whose exit-state is hard to capture
   *    e.g. user focuses on an input
   *
   * NOTE: transient context must not be mistakened as event, even in the example of
   * user focusing on an input, that's an area of the application that we might want
   * to get record of in terms of context. Events like a notification pop up, failure
   * of some long-running processes are not considered application contexts
   */
  isTransient = false;

  private constructor(value: string, isTransient: boolean) {
    this.value = value;
    this.isTransient = isTransient;
  }

  static create(value: string): ApplicationNavigationContextData {
    return new ApplicationNavigationContextData(value, false);
  }

  static createTransient(value: string): ApplicationNavigationContextData {
    return new ApplicationNavigationContextData(value, true);
  }
}

export class LegendApplicationNavigationContextService {
  contextStack: ApplicationNavigationContextData[] = [];

  constructor() {
    makeObservable(this, {
      contextStack: observable,
      currentContext: computed,
      push: action,
      pop: action,
    });
  }

  get currentContext(): ApplicationNavigationContextData | undefined {
    return this.contextStack.length
      ? this.contextStack[this.contextStack.length - 1]
      : undefined;
  }

  /**
   * Add the context to the stack.
   *
   * If the context is already if the context is already part of the stack
   * we will throw an error. This is to make sure we context is unique in the stack
   * and we do proper context stack cleanups on navigation.
   */
  push(context: ApplicationNavigationContextData): void {
    // first, filter out all transient contexts, so we can be sure that
    // all of the remaining contexts are standard and they should be cleaned up properly
    // this makes our duplication meaningful
    const newContextStack = this.contextStack.filter((ctx) => !ctx.isTransient);
    if (newContextStack.find((ctx) => ctx.value === context.value)) {
      throw new IllegalStateError(
        `Found multiple context '${context.value}' in application navigation context stack`,
      );
    }
    newContextStack.push(context);
    this.contextStack = newContextStack;
  }

  /**
   * Remove the context from the stack.
   *
   * NOTE: we will check from bottom of the stack up, for the specified context,
   * if it's found in the context stack, we will pop until the specified context.
   * This is to allow popping deeper context layers from very high up in the application
   * context stack, e.g. removing a context of an element editor when leaving the editor
   * to go to setup page.
   */
  pop(context: ApplicationNavigationContextData): void {
    const existingCtx = this.contextStack.find(
      (ctx) => ctx.value === context.value,
    );
    if (!existingCtx) {
      return;
    }
    // NOTE: since we should not have any duplicated contexts
    // it's safe to search from bottom to top of the stack
    const idx = this.contextStack.indexOf(existingCtx);
    if (idx !== -1) {
      this.contextStack = this.contextStack
        .slice(0, idx)
        // remove all transient contexts
        .filter((ctx) => !ctx.isTransient);
    }
  }
}
