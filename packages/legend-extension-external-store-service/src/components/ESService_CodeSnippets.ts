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

// TODO: we should add more example snippet
//
// ###ServiceStore
// ServiceStore meta::external::store::service::showcase::store::TradeProductServiceStore
// (
//    description : 'Showcase Service Store';
//    ServiceGroup TradeServices
//    (
//       path : '/trades';
//       Service TradeByTraderDetailsService
//       (
//          path : '/traderDetails';
//          method : GET;
//          parameters :
//          (
//             "trader.details" : String (location = query, allowReserved = true)
//          );
//          security : [];
//          response : [meta::external::store::service::showcase::domain::S_Trade <- meta::external::store::service::showcase::store::tradeServiceStoreSchemaBinding];
//       )
//       Service TradesByRegionService
//       (
//          path : '/allTradesByRegion';
//          method : GET;
//          parameters :
//          (
//             region : String (location = query),
//             requiredParam : String (location = query, required = true)
//          );
//          security : [];
//          response : [meta::external::store::service::showcase::domain::S_Trade <- meta::external::store::service::showcase::store::tradeServiceStoreSchemaBinding];
//       )
//    )
// )

export const BLANK_SERVICE_STORE_SNIPPET = `ServiceStore \${1:model::ServiceStore}
{
  \${2:// service store content}
}`;

export const SERVICE_STORE_WITH_SERVICE = `ServiceStore \${1:model::ServiceStore}
(
  Service \${2:someService}
  (
    path : \${3:'/someService';}
    method : \${4:GET;}
    //example parameters
    // parameters :
    // (
    //   serializationFormat : String ( location = query )
    // );
    response : \${5:[model::someClass <- model::someBinding];}
    security : [];
  )
)`;

export const SERVICE_STORE_WITH_SERVICE_GROUP = `ServiceStore \${1:model::ServiceStore}
(
  ServiceGroup \${2:TestServiceGroup}
  (
    path : \${3:'/testServices';}
    Service \${4:TestService}
    (
      path : \${5:'/testService';}
      method : \${GET;}
      response : \${model::someClass <- model::someBinding;}
      security : [];
    )
  )
)`;

export const SERVICE_STORE_WITH_DESCRIPTION = `ServiceStore \${1:model::ServiceStore}
(
  description: \${2:'some description';}
  Service \${3:someService}
  (
    path : \${4:'/someService';}
    method : \${5:GET;}
    //example parameters
    response : \${6:[model::someClass <- model::someBinding];}
    security : [];
  )
)`;

export const DATA_ELEMENT_WITH_SERVICE_STORE_DATA = `Data \${1:model::NewData}
{
  ServiceStore
  #{
    [
      {
        request:
        {
          method: \${2:GET;}
          url: \${3:'/employees';}
        };
        response:
        {
          body:
            ExternalFormat
            #{
              contentType: \${4:'application/json';}
              data: \${5:'data';}
            }#;
        };
      }
    ]
  }#
}`;

export const DATA_ELEMENT_WITH_SERVICE_STORE_DATA_WITH_BODY_PATTERNS = `Data \${1:model::NewData}
{
  ServiceStore
  #{
    [
      {
        request:
        {
          method: \${2:POST;}
          url: \${3:'/employees';}
          bodyPatterns:
          [
            EqualToJson
            #{
              // example expected data
              // expected: '{\\"name\\": \\"FirstName A\\"}';
              expected: \${4:'';}
            }#
          ];
        };
        response:
        {
          body:
            ExternalFormat
            #{
              contentType: \${5:'application/json';}
              data: \${6:'data';}
            }#;
        };
      }
    ]
  }#
}`;

export const DATA_ELEMENT_WITH_SERVICE_STORE_DATA_WITH_HEADER_PARAMS = `Data \${1:model::NewData}
{
  ServiceStore
  #{
    [
      {
        request:
        {
          method: \${2:GET;}
          url: \${3:'/employees';}
          headerParameters:
          {
            \${4:id:}
              EqualTo
              #{
                expected: \${5:'123';}
              }#,
            \${6:name:}
              EqualTo
              #{
                expected: \${6:'FirstName A';}
              }#
          };
        };
        response:
        {
          body:
            ExternalFormat
            #{
              contentType: \${7:'application/json';}
              data: \${8:'data';}
            }#;
        };
      }
    ]
  }#
}`;

export const DATA_ELEMENT_WITH_SERVICE_STORE_DATA_WITH_QUERY_PARAMS = `Data \${1:model::NewData}
{
  ServiceStore
  #{
    [
      {
        request:
        {
          method: \${2:GET;}
          urlPath: \${3:'/employees';}
          queryParameters:
          {
            \${4:id:}
              EqualTo
              #{
                expected: \${4:'123';}
              }#,
            name:
              EqualTo
              #{
                expected: \${5:'FirstName A';}
              }#
          };
        };
        response:
        {
          body:
            ExternalFormat
            #{
              contentType: \${6:'application/json';}
              data: \${7:'data';}
            }#;
        };
      }
    ]
  }#
}`;
