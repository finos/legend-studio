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

import React from 'react';
import { Root } from 'Components/Root';
import { config } from 'ApplicationConfig';
import { renderWithAppContext } from 'Components/__tests__/ComponentTestUtil';
import { integration } from 'Utilities/TestUtil';
import { waitFor } from '@testing-library/dom';
import { sdlcClient } from 'API/SdlcClient';
import { noop } from 'Utilities/GeneralUtil';

test(integration('App header is displayed properly'), async () => {
  jest.spyOn(sdlcClient, 'isAuthorized').mockResolvedValueOnce(true);
  jest.spyOn(sdlcClient, 'hasAcceptedTermsOfService').mockResolvedValueOnce([]);
  jest.spyOn(sdlcClient, 'getProjects').mockResolvedValue([]);

  const { queryByText } = renderWithAppContext(<Root />);
  await waitFor(noop());
  expect(queryByText(config.realm.toUpperCase())).not.toBeNull();
});

test(integration('Failed to authorize SDLC will redirect'), async () => {
  const stubURL = 'STUB_URL';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).window = Object.create(window) as Window;
  // `jsdom` does not support chaning window.location so we use the following workaround
  // See https://github.com/facebook/jest/issues/5124#issuecomment-415494099
  Object.defineProperty(window, 'location', { value: { href: stubURL } });
  jest.spyOn(sdlcClient, 'isAuthorized').mockResolvedValueOnce(false);

  const { queryByText } = renderWithAppContext(<Root />);
  await waitFor(noop(), { timeout: 5000 });
  expect(queryByText(config.realm.toUpperCase())).not.toBeNull();
  expect(window.location.href).toEqual(sdlcClient.authorizeCallbackUrl(stubURL));
});

test(integration('Failed to accept SDLC Terms of Service will show alert'), async () => {
  jest.spyOn(sdlcClient, 'isAuthorized').mockResolvedValueOnce(true);
  jest.spyOn(sdlcClient, 'hasAcceptedTermsOfService').mockResolvedValueOnce(['STUB_TOS_URL']);
  jest.spyOn(sdlcClient, 'getProjects').mockResolvedValue([]);

  const { queryByText } = renderWithAppContext(<Root />);
  await waitFor(noop());
  expect(queryByText('See terms of services')).not.toBeNull();
});
