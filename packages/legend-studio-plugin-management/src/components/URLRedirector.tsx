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

import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { PanelLoadingIndicator } from '@finos/legend-studio-components';
import { getQueryParams } from '@finos/legend-studio-shared';
import { useParams } from 'react-router-dom';
import {
  useApplicationStore,
  AppHeader,
  AppHeaderMenu,
} from '@finos/legend-studio';

const EVENT_MARKETING_LINK_ACCESS = 'Marketing link accessed';
export const PATH_PARAM_TOKEN_REDIRECT_URL = 'redirectUrl';

enum SPECIAL_REDIRECT_ALIAS {
  HOME = '@home',
}

interface RedirectRouteParams {
  [PATH_PARAM_TOKEN_REDIRECT_URL]: string;
}

/**
 * This is URL redirector service but it only works for URL within the app,
 * not any random URL for security purpose.
 *
 * On top of redirecting, we can interleave telemtetry actions such as reporting on
 * link from marketing campaigns being accessed, etc.
 */
export const URLRedirector = observer(() => {
  const applicationStore = useApplicationStore();
  const isApplicationLoadConcluded = applicationStore.initState.hasConcluded;
  const params = useParams<RedirectRouteParams>();

  useEffect(() => {
    if (isApplicationLoadConcluded) {
      if (applicationStore.initState.hasFailed) {
        applicationStore.setupTelemetryService();
      }
      const queryParams = getQueryParams(
        applicationStore.historyApiClient.location.search,
      );
      let redirectUrl = params[PATH_PARAM_TOKEN_REDIRECT_URL];
      switch (redirectUrl) {
        case SPECIAL_REDIRECT_ALIAS.HOME:
          redirectUrl = '';
          break;
        default:
          break;
      }
      // report if the link from a marketing campaign is accessed
      if (queryParams.marketingId) {
        applicationStore.telemetryService.logEvent(
          EVENT_MARKETING_LINK_ACCESS,
          {
            marketingId: queryParams.marketingId,
            redirectUrl: redirectUrl,
          },
        );
      }
      applicationStore.historyApiClient.push(`/${redirectUrl}`);
    }
  }, [applicationStore, params, isApplicationLoadConcluded]);

  return (
    <div className="app__page">
      <AppHeader>
        <AppHeaderMenu />
      </AppHeader>
      <div className="app__content">
        <PanelLoadingIndicator isLoading={true} />
      </div>
    </div>
  );
});
