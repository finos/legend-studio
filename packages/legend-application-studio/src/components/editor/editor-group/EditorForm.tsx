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

/**
 * A scrolling column of form sections, so no field is ever hidden behind a fixed-size pane.
 */
export const EditorForm = (props: {
  children: React.ReactNode;
}): React.ReactNode => <div className="editor-form">{props.children}</div>;

/**
 * One section of an editor form: a title, a sentence saying what the section is for,
 * and its fields.
 */
export const EditorFormSection = (props: {
  title: string;
  description?: string | undefined;
  children: React.ReactNode;
}): React.ReactNode => {
  const { title, description, children } = props;
  return (
    <section className="editor-form-section">
      <div className="editor-form-section__header">
        <h3 className="editor-form-section__title">{title}</h3>
        {description && (
          <p className="editor-form-section__description">{description}</p>
        )}
      </div>
      <div className="editor-form-section__body">{children}</div>
    </section>
  );
};
