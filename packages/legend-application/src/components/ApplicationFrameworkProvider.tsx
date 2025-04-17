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
import { observer } from 'mobx-react-lite';
import {
  ApplicationComponentFrameworkProvider,
  SimpleApplicationComponentFrameworkProvider,
} from './ApplicationComponentFrameworkProvider.js';
import { useApplicationStore } from './ApplicationStoreProvider.js';
import { useApplicationPlatform } from './ApplicationPlatformProvider.js';

export const ApplicationFrameworkProvider = observer(
  (props: {
    children: React.ReactNode;
    simple?: boolean | undefined;
    enableTransitions?: boolean | undefined;
  }) => {
    const { children, simple, enableTransitions } = props;
    const platform = useApplicationPlatform();
    const applicationStore = useApplicationStore();

    useEffect(() => {
      applicationStore
        .initialize(platform)
        .catch(applicationStore.alertUnhandledError);
    }, [applicationStore, platform]);

    if (!applicationStore.initState.hasSucceeded) {
      return <></>;
    }
    // TODO: would be great if we can have <React.StrictMode> here but since Mobx React is not ready for
    // concurrency yet, we would have to wait
    // See https://github.com/mobxjs/mobx/issues/2526
    if (simple) {
      return (
        <SimpleApplicationComponentFrameworkProvider
          enableTransitions={enableTransitions}
        >
          {children}
        </SimpleApplicationComponentFrameworkProvider>
      );
    }
    return (
      <ApplicationComponentFrameworkProvider
        enableTransitions={enableTransitions}
      >
        {children}
      </ApplicationComponentFrameworkProvider>
    );
  },
);
