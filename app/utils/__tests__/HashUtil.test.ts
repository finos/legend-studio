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

import { hashLambda } from 'Utilities/HashUtil';
import { unit } from 'Utilities/TestUtil';

const lambda1 = {
  parameters: [
    { a: 1 },
    { b: 2 },
  ],
  body: { a: 3 },
};

const lambda2 = {
  parameters: [
    { a: 1 },
    { b: 2, sourceInformation: {} },
  ],
  body: {
    a: 3,
    sourceInformation: {},
  },
};

const lambda3 = {
  parameters: [
    { b: 2 },
    { a: 1 },
  ],
  body: { a: 3 },
};

test(unit('Lambda hash should ignore sourceInformation and ignore object properties order'), () => {
  expect(hashLambda(lambda1.parameters, lambda1.body)).toEqual(hashLambda(lambda2.parameters, lambda2.body));
  expect(hashLambda(lambda1.parameters, lambda1.body)).not.toEqual(hashLambda(lambda3.parameters, lambda3.body));
});
