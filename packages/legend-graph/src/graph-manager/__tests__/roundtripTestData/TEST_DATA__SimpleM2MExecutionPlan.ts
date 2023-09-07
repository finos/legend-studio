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

export const TEST_DATA__simpleM2MExecutionPlan = {
  plan: {
    _type: 'simple',
    authDependent: false,
    globalImplementationSupport: {
      _type: 'java',
      classes: [
        {
          name: 'JsonDataRecord',
          package: '_pure.app.meta.pure.mapping.modelToModel',
          source:
            'package _pure.app.meta.pure.mapping.modelToModel;\n\nimport java.math.*;\nimport java.util.*;\nimport org.finos.legend.engine.plan.dependencies.domain.date.PureDate;\n\npublic interface JsonDataRecord\n{\n    default String typeName$()\n    {\n        return "JsonDataRecord";\n    }\n\n    default String typePath$()\n    {\n        return "meta::pure::mapping::modelToModel::JsonDataRecord";\n    }\n\n    long getNumber();\n    String getRecord();\n}',
        },
        {
          name: 'Person',
          package: '_pure.app.model',
          source:
            'package _pure.app.model;\n\nimport java.math.*;\nimport java.util.*;\nimport org.finos.legend.engine.plan.dependencies.domain.date.PureDate;\n\npublic interface Person extends org.finos.legend.engine.plan.dependencies.store.shared.IReferencedObject\n{\n    default String typeName$()\n    {\n        return "Person";\n    }\n\n    default String typePath$()\n    {\n        return "model::Person";\n    }\n\n    String getName();\n    String getAlloyStoreObjectReference$();\n}',
        },
        {
          name: 'Serialize',
          package: '_pure.plan.root',
          source:
            'package _pure.plan.root;\n\nimport org.finos.legend.engine.plan.dependencies.store.platform.IGraphSerializer;\nimport org.finos.legend.engine.plan.dependencies.store.platform.IPlatformPureExpressionExecutionNodeSerializeSpecifics;\nimport org.finos.legend.engine.plan.dependencies.store.platform.ISerializationWriter;\nimport org.finos.legend.engine.plan.dependencies.store.shared.IExecutionNodeContext;\n\npublic class Serialize implements IPlatformPureExpressionExecutionNodeSerializeSpecifics\n{\n    public IGraphSerializer<?> serializer(ISerializationWriter writer,\n                                          IExecutionNodeContext context)\n    {\n        return new Serializer(writer, context);\n    }\n}',
        },
        {
          name: 'Serializer',
          package: '_pure.plan.root',
          source:
            'package _pure.plan.root;\n\nimport _pure.app.meta.pure.mapping.modelToModel.JsonDataRecord;\nimport _pure.app.model.Person;\nimport java.util.List;\nimport org.finos.legend.engine.plan.dependencies.domain.dataQuality.EnforcementLevel;\nimport org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked;\nimport org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect;\nimport org.finos.legend.engine.plan.dependencies.domain.dataQuality.RelativePathNode;\nimport org.finos.legend.engine.plan.dependencies.domain.dataQuality.RuleType;\nimport org.finos.legend.engine.plan.dependencies.store.platform.IGraphSerializer;\nimport org.finos.legend.engine.plan.dependencies.store.platform.ISerializationWriter;\nimport org.finos.legend.engine.plan.dependencies.store.shared.IExecutionNodeContext;\nimport org.finos.legend.engine.plan.dependencies.store.shared.IReferencedObject;\n\npublic class Serializer implements IGraphSerializer<IChecked>\n{\n    private ISerializationWriter writer;\n    private IExecutionNodeContext context;\n\n    Serializer(ISerializationWriter writer, IExecutionNodeContext context)\n    {\n        this.writer = writer;\n        this.context = context;\n    }\n\n    public void serialize(IChecked value)\n    {\n        this.writer.startObject("meta::pure::dataQuality::Checked");\n        this.writer\n            .writeComplexProperty("defects",\n                                  value.getDefects(),\n                                  this::writeIDefect_defects);\n        this.writer\n            .writeComplexProperty("source",\n                                  (IChecked) value.getSource(),\n                                  this::writeIChecked_source);\n        this.writer\n            .writeComplexProperty("value",\n                                  (Person) value.getValue(),\n                                  this::writePerson_value);\n        this.writer.endObject();\n    }\n\n    public void writeIDefect_defects(IDefect value)\n    {\n        this.writer.startObject("meta::pure::dataQuality::Defect");\n        this.writer.writeStringProperty("id", value.getId());\n        this.writer.writeStringProperty("externalId", value.getExternalId());\n        this.writer.writeStringProperty("message", value.getMessage());\n        this.writer\n            .writeEnumProperty("enforcementLevel",\n                               "meta::pure::dataQuality::EnforcementLevel",\n                               value.getEnforcementLevel() == null\n                                    ? null\n                                    : value.getEnforcementLevel().getName());\n        this.writer\n            .writeEnumProperty("ruleType",\n                               "meta::pure::dataQuality::RuleType",\n                               value.getRuleType() == null\n                                    ? null\n                                    : value.getRuleType().getName());\n        this.writer\n            .writeStringProperty("ruleDefinerPath",\n                                 value.getRuleDefinerPath());\n        this.writer\n            .writeComplexProperty("path",\n                                  value.getPath(),\n                                  this::writeRelativePathNode_defects_path);\n        this.writer.endObject();\n    }\n\n    public void writeRelativePathNode_defects_path(RelativePathNode value)\n    {\n        this.writer.startObject("meta::pure::dataQuality::RelativePathNode");\n        this.writer\n            .writeStringProperty("propertyName",\n                                 value.getPropertyName());\n        this.writer.writeIntegerProperty("index", value.getIndex());\n        this.writer.endObject();\n    }\n\n    public void writeIChecked_source(IChecked value)\n    {\n        this.writer.startObject("meta::pure::dataQuality::Checked");\n        this.writer\n            .writeComplexProperty("defects",\n                                  value.getDefects(),\n                                  this::writeIDefect_source_defects);\n        this.writer\n            .writeComplexProperty("source",\n                                  (JsonDataRecord) value.getSource(),\n                                  this::writeJsonDataRecord_source_source);\n        this.writer\n            .writeComplexProperty("value",\n                                  (Person) value.getValue(),\n                                  this::writePerson_source_value);\n        this.writer.endObject();\n    }\n\n    public void writeIDefect_source_defects(IDefect value)\n    {\n        this.writer.startObject("meta::pure::dataQuality::Defect");\n        this.writer.writeStringProperty("id", value.getId());\n        this.writer.writeStringProperty("externalId", value.getExternalId());\n        this.writer.writeStringProperty("message", value.getMessage());\n        this.writer\n            .writeEnumProperty("enforcementLevel",\n                               "meta::pure::dataQuality::EnforcementLevel",\n                               value.getEnforcementLevel() == null\n                                    ? null\n                                    : value.getEnforcementLevel().getName());\n        this.writer\n            .writeEnumProperty("ruleType",\n                               "meta::pure::dataQuality::RuleType",\n                               value.getRuleType() == null\n                                    ? null\n                                    : value.getRuleType().getName());\n        this.writer\n            .writeStringProperty("ruleDefinerPath",\n                                 value.getRuleDefinerPath());\n        this.writer\n            .writeComplexProperty("path",\n                                  value.getPath(),\n                                  this::writeRelativePathNode_source_defects_path);\n        this.writer.endObject();\n    }\n\n    public void writeRelativePathNode_source_defects_path(RelativePathNode value)\n    {\n        this.writer.startObject("meta::pure::dataQuality::RelativePathNode");\n        this.writer\n            .writeStringProperty("propertyName",\n                                 value.getPropertyName());\n        this.writer.writeIntegerProperty("index", value.getIndex());\n        this.writer.endObject();\n    }\n\n    public void writeJsonDataRecord_source_source(JsonDataRecord value)\n    {\n        if (value instanceof IReferencedObject)\n        {\n            this.writer\n                .startObject(value.typePath$(),\n                             ((IReferencedObject) value).getAlloyStoreObjectReference$());\n        }\n        else\n        {\n            this.writer.startObject(value.typePath$());\n        }\n        this.writer.writeIntegerProperty("number", value.getNumber());\n        this.writer.writeStringProperty("record", value.getRecord());\n        this.writer.endObject();\n    }\n\n    public void writePerson_source_value(Person value)\n    {\n        if (value instanceof IReferencedObject)\n        {\n            this.writer\n                .startObject(value.typePath$(),\n                             ((IReferencedObject) value).getAlloyStoreObjectReference$());\n        }\n        else\n        {\n            this.writer.startObject(value.typePath$());\n        }\n        this.writer.writeStringProperty("name", value.getName());\n        this.writer.endObject();\n    }\n\n    public void writePerson_value(Person value)\n    {\n        if (value instanceof IReferencedObject)\n        {\n            this.writer\n                .startObject(value.typePath$(),\n                             ((IReferencedObject) value).getAlloyStoreObjectReference$());\n        }\n        else\n        {\n            this.writer.startObject(value.typePath$());\n        }\n        this.writer.writeStringProperty("name", value.getName());\n        this.writer.endObject();\n    }\n}',
        },
        {
          name: 'Execute',
          package: '_pure.plan.root.n1.localGraph',
          source:
            "package _pure.plan.root.n1.localGraph;\n\nimport _pure.app.model.Person;\nimport java.util.HashMap;\nimport org.finos.legend.engine.plan.dependencies.domain.graphFetch.IGraphInstance;\nimport org.finos.legend.engine.plan.dependencies.store.inMemory.graphFetch.IInMemoryRootGraphFetchExecutionNodeSpecifics;\nimport org.finos.legend.engine.plan.dependencies.store.shared.IExecutionNodeContext;\n\npublic class Execute implements IInMemoryRootGraphFetchExecutionNodeSpecifics\n{\n    public HashMap<Object, Object> sharedObject = new HashMap();\n\n    public Object transform(Object input)\n    {\n        Person src = (Person) input;\n        GraphFetch_Node0_Person_Impl result = new GraphFetch_Node0_Person_Impl();\n        result.setSrc$(src);\n        result.setSetId$(\"model_Person\");\n        try\n        {\n            result.setName(src.getName());\n        }\n        catch (RuntimeException e)\n        {\n            throw new RuntimeException(\"Error instantiating property 'name' on Target class 'model::Person [model_Person]' on Mapping 'model::MyMapping'.\\n\" + e.getMessage());\n        }\n        return new IGraphInstance<GraphFetch_Node0_Person_Impl>()\n        {\n            public GraphFetch_Node0_Person_Impl getValue()\n            {\n                return result;\n            }\n            public long instanceSize()\n            {\n                return result.getInstanceSize$();\n            }\n        };\n    }\n\n    public boolean filter(Object input, IExecutionNodeContext executionNodeContext)\n    {\n        return true;\n    }\n}",
        },
        {
          name: 'GraphFetch_Node0_Person_Impl',
          package: '_pure.plan.root.n1.localGraph',
          source:
            'package _pure.plan.root.n1.localGraph;\n\nimport java.math.*;\nimport java.util.*;\nimport java.util.function.*;\nimport java.util.stream.*;\nimport org.finos.legend.engine.plan.dependencies.domain.date.DayOfWeek;\nimport org.finos.legend.engine.plan.dependencies.domain.date.DurationUnit;\nimport org.finos.legend.engine.plan.dependencies.domain.date.PureDate;\nimport org.finos.legend.engine.plan.dependencies.util.Library;\n\npublic class GraphFetch_Node0_Person_Impl implements _pure.app.model.Person, org.finos.legend.engine.plan.dependencies.domain.dataQuality.Constrained<_pure.app.model.Person>, java.io.Serializable\n{\n    private String name;\n    private String setId$;\n    private Object src$;\n    private String alloyStoreObjectReference$;\n    private static final long serialVersionUID = 1697616840L;\n\n    public String getName()\n    {\n        return this.name;\n    }\n\n    public void setName(String name)\n    {\n        this.name = name;\n    }\n\n    public void addName(String object)\n    {\n        if ((Object) this.name != null)\n        {\n            throw new IllegalStateException("Found multiple objects for property \'name\' of multiplicity with bound 1");\n        }\n        this.name = object;\n    }\n\n    public List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> allConstraints()\n    {\n        return this.allConstraints(new org.finos.legend.engine.plan.dependencies.domain.dataQuality.GraphContext());\n    }\n\n    public _pure.app.model.Person withConstraintsApplied()\n    {\n        java.util.List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> defects = allConstraints();\n        if (!defects.isEmpty())\n        {\n            throw new IllegalStateException(defects.stream().map(org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect::getMessage).collect(java.util.stream.Collectors.joining("\\n")));\n        }\n        return this;\n    }\n\n    public org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked<_pure.app.model.Person> toChecked()\n    {\n        return this.toChecked(null, true);\n    }\n\n    public org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked<_pure.app.model.Person> toChecked(boolean applyConstraints)\n    {\n        return this.toChecked(null, applyConstraints);\n    }\n\n    public org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked<_pure.app.model.Person> toChecked(Object source)\n    {\n        return this.toChecked(source, true);\n    }\n\n    public org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked<_pure.app.model.Person> toChecked(Object source,\n                                                                                                                   boolean applyConstraints)\n    {\n        java.util.List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> defects = applyConstraints ? allConstraints() : java.util.Collections.emptyList();\n        return new org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked<_pure.app.model.Person>() {\n            public java.util.List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> getDefects() { return defects; }\n            public Object getSource() { return source; }\n            public _pure.app.model.Person getValue() { return GraphFetch_Node0_Person_Impl.this; }\n        };\n    }\n\n    public List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> allConstraints(org.finos.legend.engine.plan.dependencies.domain.dataQuality.GraphContext context)\n    {\n        List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> result = new ArrayList<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect>();\n        if (!context.visited.contains(this))\n        {\n            context.visited.add(this);\n        }\n        return result;\n    }\n\n    public String getSetId$()\n    {\n        return this.setId$;\n    }\n\n    public void setSetId$(String setId$)\n    {\n        this.setId$ = setId$;\n    }\n\n    public Object getSrc$()\n    {\n        return this.src$;\n    }\n\n    public void setSrc$(Object src$)\n    {\n        this.src$ = src$;\n    }\n\n    public String getAlloyStoreObjectReference$()\n    {\n        return this.alloyStoreObjectReference$;\n    }\n\n    public void setAlloyStoreObjectReference$(String alloyStoreObjectReference$)\n    {\n        this.alloyStoreObjectReference$ = alloyStoreObjectReference$;\n    }\n\n    private static long getClassSize$()\n    {\n        return 108L;\n    }\n\n    public long getInstanceSize$()\n    {\n        long size = GraphFetch_Node0_Person_Impl.getClassSize$();\n        if (this.name != null)\n        {\n            size = size + this.name.length();\n        }\n        if (this.setId$ != null)\n        {\n            size = size + this.setId$.length();\n        }\n        if (this.alloyStoreObjectReference$ != null)\n        {\n            size = size + this.alloyStoreObjectReference$.length();\n        }\n        return size;\n    }\n}',
        },
        {
          name: 'Execute',
          package: '_pure.plan.root.n1.localGraph.n1',
          source:
            'package _pure.plan.root.n1.localGraph.n1;\n\nimport java.math.*;\nimport java.util.*;\nimport java.util.function.*;\nimport java.util.stream.*;\nimport org.finos.legend.engine.plan.dependencies.domain.date.DayOfWeek;\nimport org.finos.legend.engine.plan.dependencies.domain.date.DurationUnit;\nimport org.finos.legend.engine.plan.dependencies.domain.date.PureDate;\nimport org.finos.legend.engine.plan.dependencies.store.inMemory.IStoreStreamReader;\nimport org.finos.legend.engine.plan.dependencies.store.inMemory.IStoreStreamReadingExecutionNodeContext;\nimport org.finos.legend.engine.plan.dependencies.store.inMemory.graphFetch.IStoreStreamReadingExecutionNodeSpecifics;\nimport org.finos.legend.engine.plan.dependencies.util.Library;\n\npublic class Execute implements IStoreStreamReadingExecutionNodeSpecifics\n{\n    public IStoreStreamReader streamReader(IStoreStreamReadingExecutionNodeContext context)\n    {\n        try\n        {\n            return new _pure.plan.root.n1.localGraph.n1.JsonDataReader_model_Person(context.createUrl("data:application/json,%7B%22name%22%3A%22name%2068%22%7D")\n                                                                                           .openStream());\n        }\n        catch (java.io.IOException e)\n        {\n            throw new RuntimeException(e);\n        }\n    }\n}',
        },
        {
          name: 'JsonDataReader_model_Person',
          package: '_pure.plan.root.n1.localGraph.n1',
          source:
            'package _pure.plan.root.n1.localGraph.n1;\n\nimport _pure.app.model.Person;\nimport com.fasterxml.jackson.core.JsonFactory;\nimport com.fasterxml.jackson.core.JsonParser;\nimport com.fasterxml.jackson.core.JsonToken;\nimport com.fasterxml.jackson.core.filter.FilteringParserDelegate;\nimport com.fasterxml.jackson.core.filter.JsonPointerBasedFilter;\nimport com.fasterxml.jackson.databind.JsonNode;\nimport com.fasterxml.jackson.databind.ObjectMapper;\nimport com.fasterxml.jackson.databind.node.JsonNodeType;\nimport java.io.*;\nimport java.lang.reflect.InvocationTargetException;\nimport java.lang.reflect.Method;\nimport java.math.*;\nimport java.net.*;\nimport java.util.*;\nimport java.util.function.*;\nimport java.util.stream.*;\nimport org.finos.legend.engine.plan.dependencies.domain.dataQuality.Constrained;\nimport org.finos.legend.engine.plan.dependencies.domain.dataQuality.EnforcementLevel;\nimport org.finos.legend.engine.plan.dependencies.domain.dataQuality.GraphContext;\nimport org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked;\nimport org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect;\nimport org.finos.legend.engine.plan.dependencies.domain.dataQuality.RelativePathNode;\nimport org.finos.legend.engine.plan.dependencies.domain.dataQuality.RuleType;\nimport org.finos.legend.engine.plan.dependencies.domain.date.DayOfWeek;\nimport org.finos.legend.engine.plan.dependencies.domain.date.DurationUnit;\nimport org.finos.legend.engine.plan.dependencies.domain.date.PureDate;\nimport org.finos.legend.engine.plan.dependencies.util.Library;\n\npublic class JsonDataReader_model_Person implements org.finos.legend.engine.plan.dependencies.store.inMemory.IStoreStreamReader\n{\n    private boolean finishedReading = false;\n    private Stack<Object> stack = new Stack<Object>();\n    private JsonParser parser;\n    private ObjectMapper objectMapper;\n    private boolean inArray = false;\n    private long recordCount = 0;\n    private InputStream in;\n\n    JsonDataReader_model_Person(InputStream in)\n    {\n        this.in = in;\n    }\n\n    public void initReading()\n    {\n        try\n        {\n            this.parser = new JsonFactory().createParser(this.in);\n            this.objectMapper = new ObjectMapper();\n        }\n        catch (IOException e)\n        {\n            throw new RuntimeException(e);\n        }\n    }\n\n    private boolean readMethodExists(String name)\n    {\n        Method[] methods = this.getClass().getDeclaredMethods();\n        for (int i = 0; i < methods.length; i++) {\n           if (methods[i].getName().equals(name)) return true;\n        };\n        return false;\n    }\n\n    private Object readMethodInvoke(String name, JsonNode node)\n    {\n        Method m = null;\n        try{\n           m = this.getClass().getMethod(name, JsonNode.class);\n        }\n        catch (NoSuchMethodException e){throw new RuntimeException(e.getMessage());}\n        try{\n           return m.invoke(this, node);\n        }\n        catch (IllegalAccessException e){throw new RuntimeException(e.getMessage());}catch (InvocationTargetException e){throw new RuntimeException(e.getMessage());}\n    }\n\n    public void destroyReading()\n    {\n        if (this.parser.isClosed())\n        {\n           return;\n        }\n        try\n        {\n            this.parser.close();\n        }\n        catch (IOException e)\n        {\n            throw new RuntimeException(e);\n        }\n    }\n\n    public boolean isFinished()\n    {\n        nextToken();\n        if (!this.finishedReading && getCurrentToken() == JsonToken.START_ARRAY && !inArray)\n        {\n            nextToken();\n            inArray = true;\n        }\n        if (!this.finishedReading && getCurrentToken() == JsonToken.END_ARRAY && inArray)\n        {\n            nextToken();\n            inArray = false;\n            this.finishedReading = true;\n        }\n        this.finishedReading |= getCurrentToken() == null;\n        return this.finishedReading ;\n    }\n\n    public void nextToken()\n    {\n            try\n            {\n                this.parser.nextToken();\n            }\n            catch (IOException e)\n            {\n                throw new RuntimeException(e);\n            }\n    }\n\n    public IChecked<Person> read_model_Person(JsonNode node)\n    {\n        java.util.List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> defects = new java.util.ArrayList<>();\n\n        if (!node.path("@type").getNodeType().equals(JsonNodeType.MISSING)){\n         String nodeValue = node.path("@type").textValue();\n\n         if (!nodeValue.equals("model::Person")) {\n           String methodName = "read_" + nodeValue.replace("::", "_");\n           if (readMethodExists(methodName)){\n              return (IChecked) readMethodInvoke(methodName, node);\n           }\n        }}\n        java.util.List<String> _name = new java.util.ArrayList<>();\n\n        this.stack.push(new _pure.plan.root.n1.localGraph.n1.model_Person_Impl());\n\n        if (node.path("name").getNodeType() != JsonNodeType.MISSING){\n        _name = acceptMany(node.path("name"), this::acceptString,m -> defects.add(org.finos.legend.engine.plan.dependencies.domain.dataQuality.BasicDefect.newInvalidInputErrorDefect("name"+": "+m,"model::Person")));\n        }\n        if (_name.size() != 1)\n        {\n          defects.add(org.finos.legend.engine.plan.dependencies.domain.dataQuality.BasicDefect.newClassStructureDefect("Invalid multiplicity for name: expected [1] found [" + _name.size() + "]", "model::Person"));\n        }\n\n        if (defects.stream().anyMatch(d -> d.getEnforcementLevel() == EnforcementLevel.Critical))\n        {\n            return new org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked<_pure.app.model.Person>() {\n            public java.util.List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> getDefects() { return defects; }\n            public Object getSource() { return null; }\n            public _pure.app.model.Person getValue() { return null; }\n        };\n        }\n        else\n        {\n        ((_pure.plan.root.n1.localGraph.n1.model_Person_Impl) this.stack.peek()).name = _name.get(0);\n            _pure.app.model.Person value = (_pure.app.model.Person) this.stack.pop();\n            return new org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked<_pure.app.model.Person>() {\n            public java.util.List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> getDefects() { return defects; }\n            public Object getSource() { return null; }\n            public _pure.app.model.Person getValue() { return value; }\n        };\n        }\n    }\n\n    private String acceptString(JsonNode node)\n    {\n        try\n        {\n            String errorMessage = "Unexpected node type:" + node.getNodeType() + " for PURE String";\n            this.check(Arrays.asList(JsonNodeType.valueOf("STRING")),\n                       node.getNodeType(),\n                       errorMessage);\n            return node.textValue();\n        }\n        catch (IllegalArgumentException ex)\n        {\n            throw new org.finos.legend.engine.plan.dependencies.store.inMemory.DataParsingException(ex.getMessage());\n        }\n    }\n\n    private boolean acceptBoolean(JsonNode node)\n    {\n        try\n        {\n            String errorMessage = "Unexpected node type:" + node.getNodeType() + " for PURE Boolean";\n            this.check(Arrays.asList(JsonNodeType.valueOf("BOOLEAN")),\n                       node.getNodeType(),\n                       errorMessage);\n            return node.booleanValue();\n        }\n        catch (IllegalArgumentException ex)\n        {\n            throw new org.finos.legend.engine.plan.dependencies.store.inMemory.DataParsingException(ex.getMessage());\n        }\n    }\n\n    private long acceptInteger(JsonNode node)\n    {\n        try\n        {\n            String errorMessage = "Unexpected node type:" + node.getNodeType() + " for PURE Integer";\n            this.check(Arrays.asList(JsonNodeType.valueOf("NUMBER")),\n                       node.getNodeType(),\n                       errorMessage);\n            return node.longValue();\n        }\n        catch (IllegalArgumentException ex)\n        {\n            throw new org.finos.legend.engine.plan.dependencies.store.inMemory.DataParsingException(ex.getMessage());\n        }\n    }\n\n    private double acceptFloat(JsonNode node)\n    {\n        try\n        {\n            String errorMessage = "Unexpected node type:" + node.getNodeType() + " for PURE Float";\n            this.check(Arrays.asList(JsonNodeType.valueOf("NUMBER")),\n                       node.getNodeType(),\n                       errorMessage);\n            return node.doubleValue();\n        }\n        catch (IllegalArgumentException ex)\n        {\n            throw new org.finos.legend.engine.plan.dependencies.store.inMemory.DataParsingException(ex.getMessage());\n        }\n    }\n\n    private BigDecimal acceptDecimal(JsonNode node)\n    {\n        try\n        {\n            String errorMessage = "Unexpected node type:" + node.getNodeType() + " for PURE Decimal";\n            this.check(Arrays.asList(JsonNodeType.valueOf("STRING"),\n                                     JsonNodeType.valueOf("NUMBER")),\n                       node.getNodeType(),\n                       errorMessage);\n            return node.getNodeType()\n                       .equals(JsonNodeType.STRING)\n                       ? new BigDecimal(node.textValue())\n                       : node.decimalValue();\n        }\n        catch (IllegalArgumentException ex)\n        {\n            throw new org.finos.legend.engine.plan.dependencies.store.inMemory.DataParsingException(ex.getMessage());\n        }\n    }\n\n    private Number acceptNumber(JsonNode node)\n    {\n        try\n        {\n            String errorMessage = "Unexpected node type:" + node.getNodeType() + " for PURE Number";\n            this.check(Arrays.asList(JsonNodeType.valueOf("STRING"),\n                                     JsonNodeType.valueOf("NUMBER")),\n                       node.getNodeType(),\n                       errorMessage);\n            return node.getNodeType()\n                       .equals(JsonNodeType.STRING)\n                       ? (Number) new BigDecimal(node.textValue())\n                       : node.isDouble() == true\n                             ? node.doubleValue()\n                             : node.longValue();\n        }\n        catch (IllegalArgumentException ex)\n        {\n            throw new org.finos.legend.engine.plan.dependencies.store.inMemory.DataParsingException(ex.getMessage());\n        }\n    }\n\n    private PureDate acceptStrictDate(JsonNode node)\n    {\n        try\n        {\n            String errorMessage = "Unexpected node type:" + node.getNodeType() + " for PURE StrictDate";\n            this.check(Arrays.asList(JsonNodeType.valueOf("STRING")),\n                       node.getNodeType(),\n                       errorMessage);\n            return org.finos.legend.engine.plan.dependencies.domain.date.PureDate\n            .parsePureDate(node.textValue());\n        }\n        catch (IllegalArgumentException ex)\n        {\n            throw new org.finos.legend.engine.plan.dependencies.store.inMemory.DataParsingException(ex.getMessage());\n        }\n    }\n\n    private PureDate acceptDateTime(JsonNode node)\n    {\n        try\n        {\n            String errorMessage = "Unexpected node type:" + node.getNodeType() + " for PURE DateTime";\n            this.check(Arrays.asList(JsonNodeType.valueOf("STRING")),\n                       node.getNodeType(),\n                       errorMessage);\n            return org.finos.legend.engine.plan.dependencies.domain.date.PureDate\n            .parsePureDate(node.textValue());\n        }\n        catch (IllegalArgumentException ex)\n        {\n            throw new org.finos.legend.engine.plan.dependencies.store.inMemory.DataParsingException(ex.getMessage());\n        }\n    }\n\n    private PureDate acceptDate(JsonNode node)\n    {\n        try\n        {\n            String errorMessage = "Unexpected node type:" + node.getNodeType() + " for PURE Date";\n            this.check(Arrays.asList(JsonNodeType.valueOf("STRING")),\n                       node.getNodeType(),\n                       errorMessage);\n            return org.finos.legend.engine.plan.dependencies.domain.date.PureDate\n            .parsePureDate(node.textValue());\n        }\n        catch (IllegalArgumentException ex)\n        {\n            throw new org.finos.legend.engine.plan.dependencies.store.inMemory.DataParsingException(ex.getMessage());\n        }\n    }\n\n    private <T> List<T> acceptMany(JsonNode node,\n                                   Function<JsonNode, T> acceptor,\n                                   Consumer<String> defectRecorder)\n    {\n        List<T> result = new ArrayList<T>();\n        if (node.isNull())\n        {\n            return result;\n        }\n        if (node.isArray())\n        {\n            for (JsonNode n: node)\n            {\n                try\n                {\n                    result.add(acceptor.apply(n));\n                }\n                catch (org.finos.legend.engine.plan.dependencies.store.inMemory.DataParsingException ex)\n                {\n                    defectRecorder.accept(ex.getMessage());\n                }\n            }\n        }\n        else\n        {\n            try\n            {\n                result.add(acceptor.apply(node));\n            }\n            catch (org.finos.legend.engine.plan.dependencies.store.inMemory.DataParsingException ex)\n            {\n                defectRecorder.accept(ex.getMessage());\n            }\n        }\n        return result;\n    }\n\n    private JsonToken getCurrentToken()\n    {\n        return parser.getCurrentToken();\n    }\n\n    private void check(JsonNodeType expectedNode, JsonNodeType currentNode)\n    {\n        check(expectedNode, currentNode, "Failed to parse JSON, expected \'" + expectedNode + "\', Found " + currentNode);\n    }\n\n    private void check(JsonNodeType expectedNode, JsonNodeType currentNode, String errorMessage)\n    {\n        check(Collections.singletonList(expectedNode), currentNode, errorMessage);\n    }\n\n    private void check(List<JsonNodeType> expectedNodes,\n                       JsonNodeType currentNode,\n                       String errorMessage)\n    {\n        if (!expectedNodes.contains(currentNode))\n        {\n            throw new org.finos.legend.engine.plan.dependencies.store.inMemory.DataParsingException(errorMessage);\n        }\n    }\n\n    public Collection<IChecked<Person>> readCheckedObjects()\n    {\n        try\n        {\n            this.recordCount++;\n            JsonNode node = this.objectMapper.readValue(this.parser, JsonNode.class);\n            IChecked<Person> object = this.read_model_Person(node);\n            long recordNumber = this.recordCount;\n            String json = node.toString();\n            _pure.app.meta.pure.mapping.modelToModel.JsonDataRecord source = new _pure.app.meta.pure.mapping.modelToModel.JsonDataRecord()\n            {\n                public long getNumber()\n                {\n                    return recordNumber;\n                }\n                public String getRecord()\n                {\n                    return json;\n                }\n            };\n            return Collections.singleton(new IChecked<Person>()\n            {\n                public List<IDefect> getDefects()\n                {\n                    return object.getDefects();\n                }\n                public Object getSource()\n                {\n                    return source;\n                }\n                public Person getValue()\n                {\n                    return object.getValue();\n                }\n            });\n        }\n        catch (IOException e)\n        {\n            throw new RuntimeException(e);\n        }\n    }\n}',
        },
        {
          name: 'model_Person_Impl',
          package: '_pure.plan.root.n1.localGraph.n1',
          source:
            'package _pure.plan.root.n1.localGraph.n1;\n\nimport java.math.*;\nimport java.util.*;\nimport java.util.function.*;\nimport java.util.stream.*;\nimport org.finos.legend.engine.plan.dependencies.domain.dataQuality.Constrained;\nimport org.finos.legend.engine.plan.dependencies.domain.dataQuality.EnforcementLevel;\nimport org.finos.legend.engine.plan.dependencies.domain.dataQuality.GraphContext;\nimport org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect;\nimport org.finos.legend.engine.plan.dependencies.domain.dataQuality.RelativePathNode;\nimport org.finos.legend.engine.plan.dependencies.domain.dataQuality.RuleType;\nimport org.finos.legend.engine.plan.dependencies.domain.date.DayOfWeek;\nimport org.finos.legend.engine.plan.dependencies.domain.date.DurationUnit;\nimport org.finos.legend.engine.plan.dependencies.domain.date.PureDate;\nimport org.finos.legend.engine.plan.dependencies.util.Library;\nimport org.finos.legend.engine.plan.dependencies.store.shared.IReferencedObject;\nimport org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked;\n\nclass model_Person_Impl implements _pure.app.model.Person, IReferencedObject, Constrained<_pure.app.model.Person>\n{\n    String name;\n\n    model_Person_Impl()\n    {\n    }\n\n    public String getName()\n    {\n        return this.name;\n    }\n\n    public String getAlloyStoreObjectReference$()\n    {\n        return null;\n    }\n\n    public List<IDefect> allConstraints()\n    {\n        return this.allConstraints(new GraphContext());\n    }\n\n    public _pure.app.model.Person withConstraintsApplied()\n    {\n        java.util.List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> defects = allConstraints();\n        if (!defects.isEmpty())\n        {\n            throw new IllegalStateException(defects.stream().map(org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect::getMessage).collect(java.util.stream.Collectors.joining("\\n")));\n        }\n        return this;\n    }\n\n    public IChecked<_pure.app.model.Person> toChecked()\n    {\n        return this.toChecked(null, true);\n    }\n\n    public IChecked<_pure.app.model.Person> toChecked(boolean applyConstraints)\n    {\n        return this.toChecked(null, applyConstraints);\n    }\n\n    public IChecked<_pure.app.model.Person> toChecked(Object source)\n    {\n        return this.toChecked(source, true);\n    }\n\n    public IChecked<_pure.app.model.Person> toChecked(Object source, boolean applyConstraints)\n    {\n        java.util.List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> defects = applyConstraints ? allConstraints() : java.util.Collections.emptyList();\n        return new org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked<_pure.app.model.Person>() {\n            public java.util.List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> getDefects() { return defects; }\n            public Object getSource() { return source; }\n            public _pure.app.model.Person getValue() { return model_Person_Impl.this; }\n        };\n    }\n\n    public List<IDefect> allConstraints(GraphContext context)\n    {\n        List<IDefect> result = new ArrayList<IDefect>();\n        if (!context.visited.contains(this))\n        {\n            context.visited.add(this);\n        }\n        return result;\n    }\n}',
        },
      ],
    },
    rootExecutionNode: {
      _type: 'platform',
      authDependent: false,
      executionNodes: [
        {
          _type: 'storeMappingGlobalGraphFetchExecutionNode',
          authDependent: false,
          checked: true,
          dependencyIndices: [],
          enableConstraints: true,
          graphFetchTree: {
            _type: 'rootGraphFetchTree',
            class: 'model::Person',
            subTrees: [
              {
                _type: 'propertyGraphFetchTree',
                parameters: [],
                property: 'name',
                subTrees: [],
                subTypeTrees: [],
              },
            ],
            subTypeTrees: [],
          },
          localGraphFetchExecutionNode: {
            _type: 'inMemoryRootGraphFetch',
            authDependent: false,
            batchSize: 1,
            checked: true,
            executionNodes: [
              {
                _type: 'storeStreamReading',
                authDependent: false,
                checked: true,
                connection: {
                  _type: 'JsonModelConnection',
                  class: 'model::Person',
                  element: 'ModelStore',
                  url: 'data:application/json,%7B%22name%22%3A%22name%2068%22%7D',
                },
                enableConstraints: true,
                executionNodes: [],
                graphFetchTree: {
                  _type: 'rootGraphFetchTree',
                  class: 'model::Person',
                  subTrees: [
                    {
                      _type: 'propertyGraphFetchTree',
                      parameters: [],
                      property: 'name',
                      subTrees: [],
                      subTypeTrees: [],
                    },
                  ],
                  subTypeTrees: [],
                },
                implementation: {
                  _type: 'java',
                  executionClassFullName:
                    '_pure.plan.root.n1.localGraph.n1.Execute',
                },
                resultType: {
                  _type: 'partialClass',
                  class: 'model::Person',
                  propertiesWithParameters: [{ property: 'name' }],
                },
              },
            ],
            filter: false,
            graphFetchTree: {
              _type: 'rootGraphFetchTree',
              class: 'model::Person',
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'name',
                  subTrees: [],
                  subTypeTrees: [],
                },
              ],
              subTypeTrees: [],
            },
            implementation: {
              _type: 'java',
              executionClassFullName: '_pure.plan.root.n1.localGraph.Execute',
            },
            nodeIndex: 0,
            resultType: {
              _type: 'partialClass',
              class: 'model::Person',
              propertiesWithParameters: [{ property: 'name' }],
              setImplementations: [
                {
                  class: 'model::Person',
                  id: 'model_Person',
                  mapping: 'model::MyMapping',
                  propertyMappings: [
                    { enumMapping: {}, property: 'name', type: 'String' },
                  ],
                },
              ],
            },
          },
          localTreeIndices: [0, 1],
          resultSizeRange: { lowerBound: 0 },
          resultType: {
            _type: 'partialClass',
            class: 'model::Person',
            propertiesWithParameters: [{ property: 'name' }],
            setImplementations: [
              {
                class: 'model::Person',
                id: 'model_Person',
                mapping: 'model::MyMapping',
                propertyMappings: [
                  { enumMapping: {}, property: 'name', type: 'String' },
                ],
              },
            ],
          },
          store: 'MODEL',
        },
      ],
      implementation: {
        _type: 'java',
        executionClassFullName: '_pure.plan.root.Serialize',
      },
      pure: {
        _type: 'func',
        fControl: 'serialize_Checked_MANY__RootGraphFetchTree_1__String_1_',
        function: 'serialize',
        parameters: [
          { _type: 'collection', multiplicity: { lowerBound: 0 }, values: [] },
          {
            _type: 'classInstance',
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            type: 'rootGraphFetchTree',
            value: {
              _type: 'rootGraphFetchTree',
              class: 'model::Person',
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'name',
                  subTrees: [],
                  subTypeTrees: [],
                },
              ],
              subTypeTrees: [],
            },
          },
        ],
      },
      resultType: { _type: 'dataType', dataType: 'String' },
    },
    serializer: { name: 'pure', version: 'vX_X_X' },
    templateFunctions: [],
  },
  entities: [
    {
      path: 'model::Person',
      content: {
        _type: 'class',
        name: 'Person',
        package: 'model',
        properties: [
          {
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            name: 'name',
            type: 'String',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::type::Class',
    },
    {
      path: 'model::MyMapping',
      content: {
        _type: 'mapping',
        classMappings: [
          {
            _type: 'pureInstance',
            class: 'model::Person',
            propertyMappings: [
              {
                _type: 'purePropertyMapping',
                explodeProperty: false,
                property: {
                  class: 'model::Person',
                  property: 'name',
                },
                source: '',
                transform: {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'src',
                        },
                      ],
                      property: 'name',
                    },
                  ],
                  parameters: [],
                },
              },
            ],
            root: true,
            srcClass: 'model::Person',
          },
        ],
        enumerationMappings: [],
        includedMappings: [],
        name: 'MyMapping',
        package: 'model',
        tests: [
          {
            assert: {
              _type: 'expectedOutputMappingTestAssert',
              expectedOutput: '{}',
            },
            inputData: [
              {
                _type: 'object',
                data: '{"name":"name 68"}',
                inputType: 'JSON',
                sourceClass: 'model::Person',
              },
            ],
            name: 'test_1',
            query: {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'serialize',
                  parameters: [
                    {
                      _type: 'func',
                      function: 'graphFetchChecked',
                      parameters: [
                        {
                          _type: 'func',
                          function: 'getAll',
                          parameters: [
                            {
                              _type: 'packageableElementPtr',
                              fullPath: 'model::Person',
                            },
                          ],
                        },
                        {
                          _type: 'classInstance',
                          type: 'rootGraphFetchTree',
                          value: {
                            _type: 'rootGraphFetchTree',
                            class: 'model::Person',
                            subTrees: [
                              {
                                _type: 'propertyGraphFetchTree',
                                parameters: [],
                                property: 'name',
                                subTrees: [],
                                subTypeTrees: [],
                              },
                            ],
                            subTypeTrees: [],
                          },
                        },
                      ],
                    },
                    {
                      _type: 'classInstance',
                      type: 'rootGraphFetchTree',
                      value: {
                        _type: 'rootGraphFetchTree',
                        class: 'model::Person',
                        subTrees: [
                          {
                            _type: 'propertyGraphFetchTree',
                            parameters: [],
                            property: 'name',
                            subTrees: [],
                            subTypeTrees: [],
                          },
                        ],
                        subTypeTrees: [],
                      },
                    },
                  ],
                },
              ],
              parameters: [],
            },
          },
        ],
      },
      classifierPath: 'meta::pure::mapping::Mapping',
    },
  ],
};
