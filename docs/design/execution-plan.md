# Execution Plan

With Legend, modelling is not too far from coding. In fact, we can easily draw parallels between these processes: creating the models is like writing the code, validating/compiling them is similar to building/compiling the code, and lastly, executing these models-as violent as it sounds :)-is similar to running the code.

> We find it helpful to think about these analogy in terms of errors one would get for each process. If you make mistake in your models, the engine will throw `compilation error`, where as if your models are valid but do not work, `execution error` (or `runtime error`) would be thrown instead.

Execution is a separate, but very important flow in Legend. Understandably, it is a rather complicated one to grasp, hence we dedicate this doc to talk about it as well as to explain how we build support for it in Studio, hoping that new developers might find this useful.

## How execution works

The basic flow for execution plan is as follows:

1. `studio` User build models and execute: execution call input often includes context, such as the model, the query, runtime, etc.
2. `engine` Engine takes the execution input, process these input (often time, this just includes building the graph from the model) and send this to Pure
3. `Pure` Pure generates the execution plan (this is a fairly complicated process, which is not covered in the scope of this doc), serialize and send it back to engine
4. `engine` Engine use the plan to execute and return execution result back to Studio

## How to support it in Studio

Since the execution plan is generated, there's really no need for us to support plan editing in Studio (yet). However, since we want to let people read the plan to make a capable debugging tool, we need to build the plan (i.e. converting it from `protocol` to `metamodel` form). As mentioned, since there's no need for editing plan, the transformation from `metamodel` to `protocol` is not needed, but for testing, we should make this happen anyway. However, the roundtrip for plan is slightly different from the [standard model roundtrip](./studio-roundtrips.md).

In the standard roundtrip, for transformation from `protocol` to `metamodel`, we can refer to the compiler code in engine; whereas for execution plan, this logic _does not really exist_ because the execution plan is generated in Pure. As such, `building` execution plan in Studio is slightly more difficult to implement, but doable for the most part, we just need to look at how Pure build the plan and work backwards.
