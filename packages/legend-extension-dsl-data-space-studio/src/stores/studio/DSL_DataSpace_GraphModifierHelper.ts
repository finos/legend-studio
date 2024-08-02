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

import { action } from 'mobx';
import {
  DataSpaceSupportEmail,
  type DataSpace,
  DataSpaceSupportCombinedInfo,
  type DataSpaceSupportInfo,
  DataSpaceExecutionContext,
  observe_DataSpaceSupportInfo,
  observe_DataSpace,
} from '@finos/legend-extension-dsl-data-space/graph';

export const set_title = action(
  (dataSpace: DataSpace, type: string | undefined): void => {
    dataSpace.title = type;
  },
);

export const set_description = action(
  (dataSpace: DataSpace, content: string | undefined): void => {
    dataSpace.description = content;
  },
);

export const set_email = action(
  (supportInfo: DataSpaceSupportEmail, email: string): void => {
    supportInfo.address = email;
  },
);

export const set_documentationUrl = action(
  (supportInfo: DataSpaceSupportInfo, url: string) => {
    supportInfo.documentationUrl = url;
  },
);

export const set_emails = action(
  (supportInfo: DataSpaceSupportCombinedInfo, emails: string[]) => {
    supportInfo.emails = emails.length ? emails : undefined;
  },
);

export const set_website = action(
  (supportInfo: DataSpaceSupportCombinedInfo, website: string) => {
    supportInfo.website = website;
  },
);

export const set_supportUrl = action(
  (supportInfo: DataSpaceSupportCombinedInfo, supportUrl: string) => {
    supportInfo.supportUrl = supportUrl;
  },
);

export const set_faqUrl = action(
  (supportInfo: DataSpaceSupportCombinedInfo, faqUrl: string) => {
    supportInfo.faqUrl = faqUrl;
  },
);

export const set_supportInfotype = action(
  (dataSpace: DataSpace, type: string) => {
    if (type === 'Email') {
      dataSpace.supportInfo = new DataSpaceSupportEmail();
      observe_DataSpaceSupportInfo(dataSpace.supportInfo);
    } else if (type === 'CombinedInfo') {
      dataSpace.supportInfo = new DataSpaceSupportCombinedInfo();
      observe_DataSpaceSupportInfo(dataSpace.supportInfo);
    }
  },
);

export const set_executionContexts = action(
  (dataSpace: DataSpace, contexts: DataSpaceExecutionContext[]): void => {
    dataSpace.executionContexts = contexts;
    console.log('executioncontext set');
  },
);

export const set_defaultExecutionContext = action(
  (dataSpace: DataSpace, context: DataSpaceExecutionContext): void => {
    dataSpace.defaultExecutionContext = context;
    console.log('default executioncontext set');
  },
);
