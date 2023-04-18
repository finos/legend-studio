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

export const BLANK_SERVICE_STORE_SNIPPET = `ServiceStore \${1:model::NewServiceStore}
{
  \${2:// service store content}
}`;

export const SERVICE_STORE_WITH_SERVICE = `ServiceStore \${1:model::NewServiceStore}
(
  Service \${2:someService}
  (
    path : '\${3:/someService}';
    method : \${4:GET};
    // example parameters
    // parameters :
    // (
    //   serializationFormat : String(location = query)
    // );
    response : [\${5:model::someClass <- model::someBinding}];
    security : [];
  )
)`;

export const SERVICE_STORE_WITH_SERVICE_GROUP = `ServiceStore \${1:model::NewServiceStore}
(
  ServiceGroup \${2:TestServiceGroup}
  (
    path : \${3:'/testServices';}
    Service \${4:SomeService}
    (
      path : '\${5:/someService}';
      method : \${GET;}
      response : \${model::someClass <- model::someBinding;}
      security : [];
    )
  )
)`;

export const SERVICE_STORE_WITH_DESCRIPTION = `ServiceStore \${1:model::NewServiceStore}
(
  description: '\${2:some description}';
  Service \${3:someService}
  (
    path : '\${4:/someService}';
    method : \${5:GET};
    // example parameters
    response : [\${6:model::someClass <- model::someBinding}];
    security : [];
  )
)`;

export const SERVICE_STORE_CONNECTION_SNIPPET = `ServiceStoreConnection \${1:model::NewServiceStoreConnection}
(
  store: \${2:model::SomeStore};
  baseUrl: \${3:'http://localhost:9090/somePath'};
)`;

export const SERVICE_STORE_EMBEDDED_DATA = `ServiceStore
#{
  [
    {
      request:
      {
        method: \${2|POST,GET|};
        url: '\${3:/someUrlPattern}';
        headerParameters:
        {
          id:
            EqualTo
            #{
              expected: 'someValue';
            }#
        };
        queryParameters:
        {
          id:
            EqualTo
            #{
              expected: 'someValue';
            }#
        };
        bodyPatterns:
        [
          EqualToJson
          #{
            expected: '{\\"id\\": \\"someValue\\"}';
          }#
        ];
      };
      response:
      {
        body:
          ExternalFormat
          #{
            contentType: '\${4:application/json}';
            data: '\${5:someData}';
          }#;
      };
    }
  ]
}#`;
