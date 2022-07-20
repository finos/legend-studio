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

import { useEffect } from 'react';
import { ApplicationNavigationContextData } from '../stores/ApplicationNavigationContextService.js';
import { useApplicationStore } from './ApplicationStoreProvider.js';

/**
 * Provides a convenient hook mechanism to handle application navigation
 * context of a component.
 *
 * This will push the context when the component is mounted
 * and will cleanup the context when the component is unmounted.
 *
 * NOTE: if we use this to automate context pushing and cleanup,
 * we must use this for component that is mounted due to user-event
 * navigation, e.g. clicking, focusing, etc. else if the component
 * is already pre-rendered and just temporarily hidden away (e.g. dialog)
 * it is not safe to call this as it might mess up the stack. For this,
 * use {@link useConditionedApplicationNavigationContext}
 */
export const useApplicationNavigationContext = (value: string): void => {
  const applicationStore = useApplicationStore();

  useEffect(() => {
    const context = ApplicationNavigationContextData.create(value);
    applicationStore.navigationContextService.push(context);
    return () => applicationStore.navigationContextService.pop(context);
  }, [applicationStore, value]);
};

/**
 * Provides a convenient hook mechanism to handle application navigation
 * context of a component.
 *
 * This will push the context when the condition is met
 * and will cleanup the context when the condition
 * is no longer met.
 *
 * Unlike {@link useApplicationNavigationContext}, this is useful for case
 * where the the context is attached to an element that is never remounted
 * just hidden/shown based on some condition
 */
export const useConditionedApplicationNavigationContext = (
  value: string,
  condition: boolean,
): void => {
  const applicationStore = useApplicationStore();

  useEffect(() => {
    const context = ApplicationNavigationContextData.create(value);
    if (condition) {
      applicationStore.navigationContextService.push(context);
    } else {
      applicationStore.navigationContextService.pop(context);
    }
    // NOTE: we are modifying a state in the clean up function, if we have
    // some components observing the context stack, we could end up with `React` warning
    // about bad state
    return () => applicationStore.navigationContextService.pop(context);
  }, [applicationStore, value, condition]);
};
