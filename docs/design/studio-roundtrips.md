# Studio Roundtrips

When working with a [stack](./studio-in-Legend.md) like in Legend, we find it useful to always think of form of data being used within each system and between systems/layers. In particular, one should try to grasp how the data flows and gets transformed as it passes through each system.

In the scope of this doc, we will only mention the flow of data model from Studio to engine and Pure and back, as this is when some fairly complicated transformation happen. This is what we refer to as the Studio roundtrip.

## The data form

Data models take many forms when flowing through these system

- `Protocol`: this is the serializable representation of data models, used for sending data between system (in JSON format) and for storage. This does not contain object reference, but only pointers in string form. Since this is the representation used for storage and communication between system, they are versioned following `semver` (e.g. `v1_0_0`), the latest version is `vX_X_X` which is what Studio and engine use in their codebase.
- `Metamodel`: this is a non-serializable representation of data model. This contains object reference. Metamodels form a graph of data models, which is used in Pure and Studio as the state.
- `Pure grammar text (text)`: this is another serializable representation of data models, but in text. Unlike protocol, this is currently not versioned.
- `Entity`: this is an exclusive SDLC construct that wraps around the protocol representation to store data models and some metadata in version control system (VCS).

## The data flow(s)

We will attempt to cover some of the most prominent data flow within each system. These are not meant to be in-depth, nor exhaustive. But this might help new developers with how to navigate these systems' codebases.

- `Pure`: Pure is a very sophisticated system with many different data flows. Pure uses `text` for storage. One of its main flow is:
  - `Compilation - IDE`: `text` -- [parser + compiler] --> `metamodel`
- `Engine`: Engine does not have any storage, it just processes data models. Some of the main flows are:
  - `Compilation`: `protocol` -- [compiler] --> `metamodel`
  - `Parsing`: `text` -- [parser] --> `protocol`
  - `Composing`: `protocol` -- [composer] --> `text`
  - `Generation`: `protocol` -- [compiler] --> `metamodel` -- [generator (Pure)] --> other modeling protocol (e.g. `avro`, `json schema`, etc.)
- `Studio`:
  - `Graph building`: `entity` (SDLC) --> `protocol JSON` -- [deserializer] --> `protocol` -- [builder] --> `metamodel`
  - `Saving model`: `metamodel` -- [transformer] --> `protocol` -- [serializer] --> `protocol JSON` --> `entity` (SDLC)
  - `Compile`: `metamodel` -- [transformer] --> `protocol` -- [serializer] --> `protocol JSON` -- [compiler (engine)] --> compilation result
  - `Entering text mode`: `metamodel` -- [transformer] --> `protocol` -- [serializer] --> `protocol JSON` -- [composer (engine)] --> `text`

We hope this does not end up confusing you more. We try our best to label the processes in each system (e.g. `composer`, `parser`, `compiler`), but these can be changed overtime or called slightly differently across the codebase. But please spend some time navigating the code and you will quickly pick up these flows.

## Studio roundtrip(s)

Hopefully, by now you could see some potential roundtrip in Studio. These are good to think of conceptually and they are useful for testing. Basically, they are called `roundtrip` because we want to ensure if the user makes no change at all to the data models, they remain the same in the app (i.e. `in === out`).

- `Entity roundtrip`: (loading workspace from SDLC) `entity` --> `protocol JSON` -- [deserializer] --> `protocol` -- [builder] --> `metamodel` -- (saving workspace to SDLC) [transformer] --> `protocol` -- [serializer] --> `protocol JSON` --> `entity`
- `Grammar roundtrip` (switch in and out of text mode): (entering text mode) `metamodel` -- [transformer] --> `protocol` -- [serializer] --> `protocol JSON` -- [composer (engine)] --> `text` -- (exit text mode) [parser (engine)] --> `protocol JSON` -- [deserializer] --> `protocol` -- [builder] --> `metamodel`

> The grammar roundtrip flow is quite important. Studio supports edition in text mode and form mode; and the support for the former almost always come first. It takes time to stabilize form editor for new models and thus, the fallback edition mode is always text-editor.

## How is this relevant to my work?

When you work on adding support for new models in Studio, please check the following things:

- Make sure these models are supported in engine `parser`, `composer`, `compiler`. Engine should have some similar roundtrip tests for these new models.
- Make sure Studio processes like `(de)serializer`, `builder`, `composer` support these models. If you forget to add support for these models at any of the processes mentioned, we will throw proper error messages.
- Make sure to write entity roundtrip tests and grammar tests for the new models.

We hope you find these conceptual roundtrips help clarify the data flows and accelerate your exploration of the code!
