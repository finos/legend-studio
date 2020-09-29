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

import React, { useEffect } from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { Setup } from './setup/Setup';
import { Editor } from './editor/Editor';
import { Review } from './review/Review';
import { Viewer } from './viewer/Viewer';
import { useApplicationStore } from 'Stores/ApplicationStore';
import { NotificationSnackbar } from 'Components/shared/NotificationSnackbar';
import { observer } from 'mobx-react-lite';
import { PanelLoadingIndicator } from 'Components/shared/PanelLoadingIndicator';
import { ProjectDashboard } from 'Components/projectDashboard/ProjectDashboard';
import { ROUTE_PATTERN } from 'Stores/RouterConfig';
import { ActionAlert } from 'Components/application/ActionAlert';
import { BlockingAlert } from 'Components/application/BlockingAlert';
import { AppHeader } from 'Components/shared/sharable/AppHeader';
import { AppHeaderMenu } from 'Components/editor/header/AppHeaderMenu';

export const Root = observer(() => {
  const applicationStore = useApplicationStore();

  useEffect(() => { applicationStore.checkSDLCAuthorization().catch(applicationStore.alertIllegalUnhandledError) }, [applicationStore]);

  return (
    <div className="app">
      <BlockingAlert />
      <ActionAlert />
      <NotificationSnackbar />
      {!applicationStore.isSDLCAuthorized &&
        <div className="app__page">
          <AppHeader><AppHeaderMenu /></AppHeader>
          <PanelLoadingIndicator isLoading={true} />
          <div className="app__content" />
        </div>
      }
      {applicationStore.isSDLCAuthorized &&
        <Switch>
          <Route exact={true} path={ROUTE_PATTERN.PROJECT_DASHBOARD} component={ProjectDashboard} />
          <Route exact={true} path={ROUTE_PATTERN.VIEWER} component={Viewer} />
          <Route exact={true} path={ROUTE_PATTERN.REVIEW} component={Review} />
          <Route exact={true} strict={true} path={ROUTE_PATTERN.EDITOR} component={Editor} />
          <Route exact={true} path={ROUTE_PATTERN.SETUP} component={Setup} />
          <Redirect to="/" />
        </Switch>
      }
    </div>
  );
});
