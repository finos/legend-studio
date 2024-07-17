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

import { DataCubeIcon } from '@finos/legend-art';

export function REPLErrorAlert(props: {
  message: string;
  text?: string | undefined;
}) {
  const { message, text } = props;
  return (
    <div className="h-full w-full overflow-auto p-4">
      <div className="relative pl-2">
        <DataCubeIcon.Error className="absolute -top-[1px] left-0 flex-shrink-0 stroke-[0.5px] text-2xl text-red-500" />
        <div className="ml-4 whitespace-nowrap">{message}</div>
      </div>
      <pre className="mt-1.5 font-sans text-neutral-500">{text}</pre>
    </div>
  );
}
