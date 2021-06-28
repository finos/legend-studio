# Legend Studio

## What is Legend?

For a more detailed answer, please refer to the [official documentation](https://legend.finos.org/), but for developers of Studio, all you need to know is that Legend can be seen a data modelling tool (some might argue it is a data tool, as its scope can go well beyond modelling). Legend is a stack, comprising many layers/systems: Pure (the heart and the soul), engine, SDLC, Studio, etc.

## What is Studio, and where is it in the Legend stack?

Studio is the _frontman_ of the Legend stack, it provides an user interface to work with data models. It is not independent, however: it depends on SDLC for storage and on engine for functionalities around edition, validation, and execution of the data models. When working with Studio, it is important to know these systems that Studio depends on, and separate concern when designing your code.

## Why do I want to work on Studio?

Being the interface of the whole stack carries many perks and responsibilities:

- With the way Studio is designed, we resembles Pure IDE in that the UI state of the app is Pure metamodels. This means that when user works on Studio, we build a full Pure graph in memory to ensure a better editing experience. To make this happen, developers of Studio need to understand the [flow of data and their transformation](./studio-roundtrips.md), which gives them the opportunity to understand and work on other systems as well.
- Since we must design forms for users edit models, we often drive the way the metamodels in Pure and the protocol models in engine shape. Sometimes, we found that in engine, models are made to work, but not friendly for editing, and thus, needs revision.
- Studio is also designed to be modular, working with Studio requires a decent amount of time in planning and designing (if you are a fan of design pattern, we have some of that too :tada:)
- But Studio also bear a lot of responsibilities, when bugs occur, we need to be able to debug and find out where in the stack the problem lies. To ensure stability of the system, we should also setup functional and end-to-end tests for all systems.
- Last but not least, Studio is a very fun and young project, which still has a lot of room for improvement, growth, and creativity.

Hopefully, this will inspire you to work on Studio and help expand the Legend horizon!
