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

/**
 * We need to mock `react-reflex` components for test as it does DOM dimension
 * calculation which will be thrown off by `jsdom`
 * See https://github.com/leefsmp/Re-Flex/issues/27#issuecomment-718949629
 */
const MockedReactComponent: React.FC = (props) => {
  const { children } = props;
  return <div>{children}</div>;
};

export const ReflexContainer = MockedReactComponent;
export const ReflexElement = MockedReactComponent;
export const ReflexSplitter = MockedReactComponent;
