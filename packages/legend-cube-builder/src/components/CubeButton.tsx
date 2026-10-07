/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { clsx } from '@finos/legend-art';

/** A small text button in the page's toolbars and lists, coloured by the theme's tokens */
export const CubeButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }
> = ({ className, primary, ...props }) => (
  <button
    {...props}
    // these buttons never submit a form
    type="button"
    className={clsx(
      'h-6 shrink-0 rounded-sm border px-2 text-base enabled:cursor-pointer disabled:cursor-not-allowed disabled:text-[var(--color-text-disabled)]',
      primary
        ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-text-on-accent)] enabled:hover:bg-[var(--color-accent-hover)] disabled:border-[var(--color-border-default)] disabled:bg-[var(--color-bg-panel-header)]'
        : 'border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] enabled:hover:bg-[var(--color-bg-hover)]',
      className,
    )}
  />
);
