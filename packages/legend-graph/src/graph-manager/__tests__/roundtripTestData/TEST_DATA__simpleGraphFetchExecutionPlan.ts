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

export const TEST_DATA__simpleGraphFetchExecutionPlan = {
  plan: {
    _type: 'simple',
    authDependent: false,
    globalImplementationSupport: {
      _type: 'java',
      classes: [
        {
          package: '_pure.app.model',
          name: 'Firm',
          source:
            'package _pure.app.model;\n\nimport java.math.*;\nimport java.util.*;\nimport org.finos.legend.engine.plan.dependencies.domain.date.PureDate;\n\npublic interface Firm extends org.finos.legend.engine.plan.dependencies.store.shared.IReferencedObject\n{\n    default String typeName$()\n    {\n        return "Firm";\n    }\n\n    default String typePath$()\n    {\n        return "model::Firm";\n    }\n\n    String getLegalName();\n    List<Person> getEmployees();\n    String getAlloyStoreObjectReference$();\n}',
        },
        {
          package: '_pure.app.model',
          name: 'Person',
          source:
            'package _pure.app.model;\n\nimport java.math.*;\nimport java.util.*;\nimport org.finos.legend.engine.plan.dependencies.domain.date.PureDate;\n\npublic interface Person extends org.finos.legend.engine.plan.dependencies.store.shared.IReferencedObject\n{\n    default String typeName$()\n    {\n        return "Person";\n    }\n\n    default String typePath$()\n    {\n        return "model::Person";\n    }\n\n    String getFirstName();\n    String getAlloyStoreObjectReference$();\n}',
        },
        {
          package: '_pure.plan.root',
          name: 'Serialize',
          source:
            'package _pure.plan.root;\n\nimport org.finos.legend.engine.plan.dependencies.store.platform.IGraphSerializer;\nimport org.finos.legend.engine.plan.dependencies.store.platform.IPlatformPureExpressionExecutionNodeSerializeSpecifics;\nimport org.finos.legend.engine.plan.dependencies.store.platform.ISerializationWriter;\nimport org.finos.legend.engine.plan.dependencies.store.shared.IExecutionNodeContext;\n\npublic class Serialize implements IPlatformPureExpressionExecutionNodeSerializeSpecifics\n{\n    public IGraphSerializer<?> serializer(ISerializationWriter writer,\n                                          IExecutionNodeContext context)\n    {\n        return new Serializer(writer, context);\n    }\n}',
        },
        {
          package: '_pure.plan.root',
          name: 'Serializer',
          source:
            'package _pure.plan.root;\n\nimport _pure.app.model.Firm;\nimport _pure.app.model.Person;\nimport java.util.List;\nimport org.finos.legend.engine.plan.dependencies.store.platform.IGraphSerializer;\nimport org.finos.legend.engine.plan.dependencies.store.platform.ISerializationWriter;\nimport org.finos.legend.engine.plan.dependencies.store.shared.IExecutionNodeContext;\nimport org.finos.legend.engine.plan.dependencies.store.shared.IReferencedObject;\n\npublic class Serializer implements IGraphSerializer<Firm>\n{\n    private ISerializationWriter writer;\n    private IExecutionNodeContext context;\n\n    Serializer(ISerializationWriter writer, IExecutionNodeContext context)\n    {\n        this.writer = writer;\n        this.context = context;\n    }\n\n    public void serialize(Firm value)\n    {\n        if (value instanceof IReferencedObject)\n        {\n            this.writer\n                .startObject(value.typePath$(),\n                             ((IReferencedObject) value).getAlloyStoreObjectReference$());\n        }\n        else\n        {\n            this.writer.startObject(value.typePath$());\n        }\n        this.writer.writeStringProperty("legalName", value.getLegalName());\n        this.writer\n            .writeComplexProperty("employees",\n                                  value.getEmployees(),\n                                  this::writePerson_employees);\n        this.writer.endObject();\n    }\n\n    public void writePerson_employees(Person value)\n    {\n        this.writer.startObject("model::Person");\n        this.writer.writeStringProperty("firstName", value.getFirstName());\n        this.writer.endObject();\n    }\n}',
        },
        {
          package: '_pure.plan.root.n1.localGraph',
          name: 'Execute',
          source:
            'package _pure.plan.root.n1.localGraph;\n\nimport java.lang.reflect.Method;\nimport java.sql.ResultSet;\nimport java.util.*;\nimport java.util.function.*;\nimport java.util.stream.*;\nimport org.eclipse.collections.api.tuple.Pair;\nimport org.finos.legend.engine.plan.dependencies.domain.graphFetch.IGraphInstance;\nimport org.finos.legend.engine.plan.dependencies.store.relational.graphFetch.IRelationalRootQueryTempTableGraphFetchExecutionNodeSpecifics;\nimport org.finos.legend.engine.plan.dependencies.store.shared.IExecutionNodeContext;\nimport org.finos.legend.engine.plan.dependencies.store.shared.IReferencedObject;\n\npublic class Execute implements IRelationalRootQueryTempTableGraphFetchExecutionNodeSpecifics\n{\n    private Specifics specifics;\n\n    public Execute()\n    {\n        this.specifics = new Specifics();\n    }\n\n    public void prepare(ResultSet resultSet, String databaseTimeZone, String databaseConnection)\n    {\n        this.specifics.prepare(resultSet, databaseTimeZone, databaseConnection);\n    }\n\n    public IGraphInstance<? extends IReferencedObject> nextGraphInstance()\n    {\n        return this.specifics.nextGraphInstance();\n    }\n\n    public List<Method> primaryKeyGetters()\n    {\n        return this.specifics.primaryKeyGetters();\n    }\n\n    public List<Pair<String, String>> allInstanceSetImplementations()\n    {\n        return this.specifics.allInstanceSetImplementations();\n    }\n\n    public List<String> primaryKeyColumns(int setIndex)\n    {\n        return this.specifics.primaryKeyColumns(setIndex);\n    }\n\n    public boolean supportsCaching()\n    {\n        return true;\n    }\n}',
        },
        {
          package: '_pure.plan.root.n1.localGraph',
          name: 'GraphFetch_Node0_Firm_Impl',
          source:
            'package _pure.plan.root.n1.localGraph;\n\nimport java.math.*;\nimport java.util.*;\nimport java.util.function.*;\nimport java.util.stream.*;\nimport org.finos.legend.engine.plan.dependencies.domain.date.DayOfWeek;\nimport org.finos.legend.engine.plan.dependencies.domain.date.DurationUnit;\nimport org.finos.legend.engine.plan.dependencies.domain.date.PureDate;\nimport org.finos.legend.engine.plan.dependencies.util.Library;\nimport com.fasterxml.jackson.annotation.JsonInclude;\nimport com.fasterxml.jackson.core.JsonGenerator;\nimport com.fasterxml.jackson.databind.JsonSerializer;\nimport com.fasterxml.jackson.databind.ObjectMapper;\nimport com.fasterxml.jackson.databind.SerializerProvider;\nimport com.fasterxml.jackson.databind.module.SimpleModule;\nimport java.io.IOException;\n\npublic class GraphFetch_Node0_Firm_Impl implements _pure.app.model.Firm, org.finos.legend.engine.plan.dependencies.domain.dataQuality.Constrained<_pure.app.model.Firm>, java.io.Serializable\n{\n    private String legalName;\n    private List<_pure.app.model.Person> employees;\n    private Object pk$_0;\n    private static final ObjectMapper objectMapper$ = new ObjectMapper().setSerializationInclusion(JsonInclude.Include.NON_NULL).registerModule(new SimpleModule().addSerializer(PureDate.class, new JsonSerializer<PureDate>() { @Override public void serialize(PureDate value, JsonGenerator gen, SerializerProvider serializers) throws IOException { gen.writeRawValue("\\"" + value.toString() + "\\""); } }));\n    private String setId$;\n    public static String databaseConnection$;\n    private String alloyStoreObjectReference$;\n    private static final long serialVersionUID = 1242444108L;\n\n    public String getLegalName()\n    {\n        return this.legalName;\n    }\n\n    public void setLegalName(String legalName)\n    {\n        this.legalName = legalName;\n    }\n\n    public void addLegalName(String object)\n    {\n        if ((Object) this.legalName != null)\n        {\n            throw new IllegalStateException("Found multiple objects for property \'legalName\' of multiplicity with bound 1");\n        }\n        this.legalName = object;\n    }\n\n    public List<_pure.app.model.Person> getEmployees()\n    {\n        return this.employees == null\n                   ? Collections.<_pure.app.model.Person>emptyList()\n                   : this.employees;\n    }\n\n    public void setEmployees(List<_pure.app.model.Person> employees)\n    {\n        this.employees = employees;\n    }\n\n    public void addEmployees(_pure.app.model.Person object)\n    {\n        if (this.employees == null)\n        {\n            this.employees = new ArrayList<_pure.app.model.Person>();\n        }\n        this.employees.add(object);\n    }\n\n    public List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> allConstraints()\n    {\n        return this.allConstraints(new org.finos.legend.engine.plan.dependencies.domain.dataQuality.GraphContext());\n    }\n\n    public _pure.app.model.Firm withConstraintsApplied()\n    {\n        java.util.List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> defects = allConstraints();\n        if (!defects.isEmpty())\n        {\n            throw new IllegalStateException(defects.stream().map(org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect::getMessage).collect(java.util.stream.Collectors.joining("\\n")));\n        }\n        return this;\n    }\n\n    public org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked<_pure.app.model.Firm> toChecked()\n    {\n        return this.toChecked(null, true);\n    }\n\n    public org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked<_pure.app.model.Firm> toChecked(boolean applyConstraints)\n    {\n        return this.toChecked(null, applyConstraints);\n    }\n\n    public org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked<_pure.app.model.Firm> toChecked(Object source)\n    {\n        return this.toChecked(source, true);\n    }\n\n    public org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked<_pure.app.model.Firm> toChecked(Object source,\n                                                                                                                 boolean applyConstraints)\n    {\n        java.util.List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> defects = applyConstraints ? allConstraints() : java.util.Collections.emptyList();\n        return new org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked<_pure.app.model.Firm>() {\n            public java.util.List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> getDefects() { return defects; }\n            public Object getSource() { return source; }\n            public _pure.app.model.Firm getValue() { return GraphFetch_Node0_Firm_Impl.this; }\n        };\n    }\n\n    public List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> allConstraints(org.finos.legend.engine.plan.dependencies.domain.dataQuality.GraphContext context)\n    {\n        List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> result = new ArrayList<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect>();\n        if (!context.visited.contains(this))\n        {\n            context.visited.add(this);\n            if (this.getEmployees() != null)\n            {\n                for (int i = 0; i < this.getEmployees().size(); i++)\n                {\n                    final int index = i;\n                    result.addAll(((org.finos.legend.engine.plan.dependencies.domain.dataQuality.Constrained<_pure.app.model.Person>) this.getEmployees()\n                                                                                                                                          .get(i))\n                                                                                                                                          .allConstraints(context)\n                                                                                                                                          .stream()\n                                                                                                                                          .map((org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect d) -> org.finos.legend.engine.plan.dependencies.domain.dataQuality.BasicDefect.prefixPath(d,\n                                                                                                                                                                                                                                                                                                               org.finos.legend.engine.plan.dependencies.domain.dataQuality.BasicRelativePathNode.newRelativePathNode("employees", index)))\n                                                                                                                                          .filter((org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect $x) -> $x != null)\n                                                                                                                                          .collect(Collectors.toList()));\n                }\n            }\n        }\n        return result;\n    }\n\n    public Object getPk$_0()\n    {\n        return this.pk$_0;\n    }\n\n    public void setPk$_0(Object pk$_0)\n    {\n        this.pk$_0 = pk$_0;\n    }\n\n    public String getSetId$()\n    {\n        return this.setId$;\n    }\n\n    public void setSetId$(String setId)\n    {\n        this.setId$ = setId;\n    }\n\n    public String getAlloyStoreObjectReference$()\n    {\n        if (this.alloyStoreObjectReference$ == null)\n        {\n            try\n            {\n                StringBuilder referenceBuilder = new StringBuilder();\n                referenceBuilder.append("001:");\n                referenceBuilder.append("010:");\n\n                referenceBuilder.append("0000000010:");\n                referenceBuilder.append("Relational:");\n\n                referenceBuilder.append("0000000028:");\n                referenceBuilder.append("execution::RelationalMapping:");\n\n                referenceBuilder.append("0000000010:");\n                referenceBuilder.append("model_Firm:");\n\n                String setId = this.getSetId$();\n                referenceBuilder.append(String.format("%010d", setId.length()));\n                referenceBuilder.append(":");\n                referenceBuilder.append(setId);\n                referenceBuilder.append(":");\n\n                String databaseConnectionString = _pure.plan.root.n1.localGraph.GraphFetch_Node0_Firm_Impl.databaseConnection$;\n                referenceBuilder.append(String.format("%010d", databaseConnectionString.length()));\n                referenceBuilder.append(":");\n                referenceBuilder.append(databaseConnectionString);\n                referenceBuilder.append(":");\n\n                Map<String, Object> pkMap = new HashMap<>();\n\n                pkMap.put("pk$_0", this.getPk$_0());\n                String pkMapString = objectMapper$.writeValueAsString(pkMap);\n                referenceBuilder.append(String.format("%010d", pkMapString.length()));\n                referenceBuilder.append(":");\n                referenceBuilder.append(pkMapString);\n\n                this.alloyStoreObjectReference$ = "ASOR:" + org.apache.commons.codec.binary.Base64.encodeBase64URLSafeString(referenceBuilder.toString().getBytes());\n            }\n            catch (Exception e)\n            {\n               throw new RuntimeException(e);\n            }\n        }\n\n        return this.alloyStoreObjectReference$;\n    }\n\n    public void setAlloyStoreObjectReference$(String reference)\n    {\n        this.alloyStoreObjectReference$ = reference;\n    }\n\n    private static long getClassSize$()\n    {\n        return 132L;\n    }\n\n    public long getInstanceSize$()\n    {\n        long size = GraphFetch_Node0_Firm_Impl.getClassSize$();\n        if (this.legalName != null)\n        {\n            size = size + this.legalName.length();\n        }\n        if (this.setId$ != null)\n        {\n            size = size + this.setId$.length();\n        }\n        if (this.alloyStoreObjectReference$ != null)\n        {\n            size = size + this.alloyStoreObjectReference$.length();\n        }\n        if (this.employees != null)\n        {\n            for (_pure.app.model.Person i: this.employees)\n            {\n                if (i != null)\n                {\n                    size = size + 20L;\n                }\n            }\n        }\n        return size;\n    }\n}',
        },
        {
          package: '_pure.plan.root.n1.localGraph',
          name: 'Specifics',
          source:
            'package _pure.plan.root.n1.localGraph;\n\nimport java.lang.reflect.Method;\nimport java.sql.ResultSet;\nimport java.sql.ResultSetMetaData;\nimport java.sql.Types;\nimport java.util.*;\nimport java.util.function.*;\nimport java.util.stream.*;\nimport org.eclipse.collections.api.tuple.Pair;\nimport org.eclipse.collections.impl.tuple.Tuples;\nimport org.finos.legend.engine.plan.dependencies.domain.date.PureDate;\nimport org.finos.legend.engine.plan.dependencies.domain.graphFetch.IGraphInstance;\nimport org.finos.legend.engine.plan.dependencies.store.shared.IConstantResult;\nimport org.finos.legend.engine.plan.dependencies.store.shared.IExecutionNodeContext;\n\nclass Specifics\n{\n    private static final List<Integer> STRING_TYPES = Arrays.asList(Types.CHAR, Types.VARCHAR, Types.LONGVARCHAR, Types.NCHAR, Types.NVARCHAR, Types.LONGNVARCHAR, Types.OTHER, Types.NULL);\n    private static final List<Integer> INT_TYPES = Arrays.asList(Types.TINYINT, Types.SMALLINT, Types.INTEGER, Types.BIGINT, Types.NULL);\n    private static final List<Integer> FLOAT_TYPES = Arrays.asList(Types.REAL, Types.FLOAT, Types.DOUBLE, Types.DECIMAL, Types.NUMERIC, Types.NULL);\n    private static final List<Integer> DECIMAL_TYPES = Arrays.asList(Types.DECIMAL, Types.NUMERIC, Types.NULL);\n    private static final List<Integer> BOOL_TYPES = Arrays.asList(Types.BIT, Types.BOOLEAN, Types.NULL);\n    private static final List<Integer> STRICT_DATE_TYPES = Arrays.asList(Types.DATE, Types.NULL);\n    private static final List<Integer> DATE_TIME_TYPES = Arrays.asList(Types.TIMESTAMP, Types.NULL);\n    private ResultSet resultSet;\n    private String databaseTimeZone;\n    private String databaseConnection;\n    private List<Integer> columnTypes;\n    private List<List<Integer>> propertyIndices;\n    private List<List<Supplier<Object>>> propertyGetters;\n    private Calendar calendar;\n    private Method parentPropertyAdder;\n    private Method parentEdgePointPropertyAdder;\n\n    private Object getAlloyNativeValueFromResultSet(ResultSet resultSet,\n                                                    int columnIndex,\n                                                    int columnType)\n    {\n        try\n        {\n            Object result = null;\n            switch (columnType)\n            {\n                case Types.DATE:\n                {\n                    java.sql.Date date = resultSet.getDate(columnIndex);\n                    if (date != null)\n                    {\n                        result = PureDate.fromSQLDate(date);\n                    }\n                    break;\n                }\n                case Types.TIMESTAMP:\n                {\n                    java.sql.Timestamp timestamp = resultSet.getTimestamp(columnIndex, this.calendar);\n                    if (timestamp != null)\n                    {\n                        result = PureDate.fromSQLTimestamp(timestamp);\n                    }\n                    break;\n                }\n                case Types.TINYINT:\n                case Types.SMALLINT:\n                case Types.INTEGER:\n                case Types.BIGINT:\n                {\n                    long num = resultSet.getLong(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        result = Long.valueOf(num);\n                    }\n                    break;\n                }\n                case Types.REAL:\n                case Types.FLOAT:\n                case Types.DOUBLE:\n                {\n                    double num = resultSet.getDouble(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        result = Double.valueOf(num);\n                    }\n                    break;\n                }\n                case Types.DECIMAL:\n                case Types.NUMERIC:\n                {\n                    result = resultSet.getBigDecimal(columnIndex);\n                    break;\n                }\n                case Types.CHAR:\n                case Types.VARCHAR:\n                case Types.LONGVARCHAR:\n                case Types.NCHAR:\n                case Types.NVARCHAR:\n                case Types.LONGNVARCHAR:\n                case Types.OTHER:\n                {\n                    result = resultSet.getString(columnIndex);\n                    break;\n                }\n                case Types.BIT:\n                case Types.BOOLEAN:\n                {\n                    boolean bool = resultSet.getBoolean(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        result = Boolean.valueOf(bool);\n                    }\n                    break;\n                }\n                case Types.BINARY:\n                case Types.VARBINARY:\n                case Types.LONGVARBINARY:\n                {\n                    byte[] bytes = resultSet.getBytes(columnIndex);\n                    if (bytes != null)\n                    {\n                        result = this.encodeHex(bytes);\n                    }\n                    break;\n                }\n                case Types.NULL:\n                {\n                    // do nothing: value is already assigned to null\n                    break;\n                }\n                default:\n                {\n                    result = resultSet.getObject(columnIndex);\n                }\n            }\n            return result;}\n        catch (Exception e)\n        {\n            throw new RuntimeException(e);\n        }\n    }\n\n    private String encodeHex(byte[] data)\n    {\n        final char[] DIGITS_LOWER = {\'0\', \'1\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'a\', \'b\', \'c\', \'d\', \'e\', \'f\'};\n        final int l = data.length;\n        final char[] out = new char[l << 1];\n        for (int i = 0, j = 0; i < l; i++)\n        {\n            out[j++] = DIGITS_LOWER[(0xF0 & data[i]) >>> 4];\n            out[j++] = DIGITS_LOWER[0x0F & data[i]];\n        }\n        return new String(out);\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForStringProperty(ResultSet resultSet,\n                                                                         int columnIndex,\n                                                                         int columnType,\n                                                                         String propertyName)\n    {\n        if (STRING_TYPES.contains(columnType))\n        {\n           return () -> {\n                try\n                {\n                    return resultSet.getString(columnIndex);\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        else\n        {\n            throw new RuntimeException("Error reading in property \'" + propertyName + "\' of type String from SQL column of type \'" + columnType + "\'.");\n        }\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForIntegerProperty(ResultSet resultSet,\n                                                                          int columnIndex,\n                                                                          int columnType,\n                                                                          String propertyName)\n    {\n        if (INT_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    Long res = null;\n                    long r = resultSet.getLong(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = Long.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException("Error reading in property \'" + propertyName + "\' of type Integer from SQL column of type \'" + columnType + "\'.");\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForFloatProperty(ResultSet resultSet,\n                                                                        int columnIndex,\n                                                                        int columnType,\n                                                                        String propertyName)\n    {\n        if (FLOAT_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    Double res = null;\n                    double r = resultSet.getDouble(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = Double.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (INT_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    Double res = null;\n                    long r = resultSet.getLong(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = Double.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException("Error reading in property \'" + propertyName + "\' of type Float from SQL column of type \'" + columnType + "\'.");\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForDecimalProperty(ResultSet resultSet,\n                                                                          int columnIndex,\n                                                                          int columnType,\n                                                                          String propertyName)\n    {\n        if (DECIMAL_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    return resultSet.getBigDecimal(columnIndex);\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (FLOAT_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    java.math.BigDecimal res = null;\n                    double r = resultSet.getDouble(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = java.math.BigDecimal.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (INT_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    java.math.BigDecimal res = null;\n                    long r = resultSet.getLong(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = java.math.BigDecimal.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException("Error reading in property \'" + propertyName + "\' of type Decimal from SQL column of type \'" + columnType + "\'.");\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForBooleanProperty(ResultSet resultSet,\n                                                                          int columnIndex,\n                                                                          int columnType,\n                                                                          String propertyName)\n    {\n        if (BOOL_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    Boolean res = null;\n                    boolean r = resultSet.getBoolean(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = Boolean.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (STRING_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    Boolean res = null;\n                    String r = resultSet.getString(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = Boolean.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (INT_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    Boolean res = null;\n                    long r = resultSet.getLong(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = Boolean.valueOf(r == 1);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException("Error reading in property \'" + propertyName + "\' of type Boolean from SQL column of type \'" + columnType + "\'.");\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForStrictDateProperty(ResultSet resultSet,\n                                                                             int columnIndex,\n                                                                             int columnType,\n                                                                             String propertyName)\n    {\n        if (STRICT_DATE_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    java.sql.Date r = resultSet.getDate(columnIndex);\n                    if (r != null)\n                    {\n                        res = PureDate.fromSQLDate(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (STRING_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    String r = resultSet.getString(columnIndex);\n                    if (r != null)\n                    {\n                        try\n                        {\n                            res = PureDate.parsePureDate(r);\n                        }\n                        catch (java.lang.IllegalArgumentException dateTimeParseException)\n                        {\n                            res = PureDate.fromSQLDate(java.sql.Date.valueOf(r));\n                        }\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException("Error reading in property \'" + propertyName + "\' of type StrictDate from SQL column of type \'" + columnType + "\'.");\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForDateTimeProperty(ResultSet resultSet,\n                                                                           int columnIndex,\n                                                                           int columnType,\n                                                                           String propertyName)\n    {\n        if (DATE_TIME_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    java.sql.Timestamp r = resultSet.getTimestamp(columnIndex, this.calendar);\n                    if (r != null)\n                    {\n                        res = PureDate.fromSQLTimestamp(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (STRING_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    String r = resultSet.getString(columnIndex);\n                    if (r != null)\n                    {\n                        try\n                        {\n                            res = PureDate.parsePureDate(r);\n                        }\n                        catch (java.lang.IllegalArgumentException dateTimeParseException)\n                        {\n                            res = PureDate.fromSQLTimestamp(java.sql.Timestamp.valueOf(r));\n                        }\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException("Error reading in property \'" + propertyName + "\' of type DateTime from SQL column of type \'" + columnType + "\'.");\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForDateProperty(ResultSet resultSet,\n                                                                       int columnIndex,\n                                                                       int columnType,\n                                                                       String propertyName)\n    {\n        if (STRICT_DATE_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    java.sql.Date r = resultSet.getDate(columnIndex);\n                    if (r != null)\n                    {\n                        res = PureDate.fromSQLDate(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (DATE_TIME_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    java.sql.Timestamp r = resultSet.getTimestamp(columnIndex, this.calendar);\n                    if (r != null)\n                    {\n                        res = PureDate.fromSQLTimestamp(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (STRING_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    String r = resultSet.getString(columnIndex);\n                    if (r != null)\n                    {\n                        try\n                        {\n                            res = PureDate.parsePureDate(r);\n                        }\n                        catch (java.lang.IllegalArgumentException dateTimeParseException1)\n                        {\n                            try\n                            {\n                                res = PureDate.fromSQLTimestamp(java.sql.Timestamp.valueOf(r));\n                            }\n                            catch (java.time.format.DateTimeParseException dateTimeParseException2)\n                            {\n                                res = PureDate.fromSQLDate(java.sql.Date.valueOf(r));\n                            }\n                        }\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException("Error reading in property \'" + propertyName + "\' of type Date from SQL column of type \'" + columnType + "\'.");\n    }\n\n    void prepare(ResultSet resultSet, String databaseTimeZone, String databaseConnection)\n    {\n        try\n        {\n            this.resultSet = resultSet;\n            this.databaseTimeZone = databaseTimeZone;\n            this.databaseConnection = databaseConnection;\n            this.calendar = new GregorianCalendar(TimeZone.getTimeZone(this.databaseTimeZone));\n            ResultSetMetaData resultSetMetaData = this.resultSet.getMetaData();\n            int columnCount = resultSetMetaData.getColumnCount();\n            this.columnTypes = new ArrayList<Integer>();\n            List<String> columnNames = new ArrayList<String>();\n            for (int i = 1; i <= columnCount; i++)\n            {\n                String columnLabel = resultSetMetaData.getColumnLabel(i);\n                columnNames.add(columnLabel.startsWith("\\"") && columnLabel\n                                           .endsWith("\\"")\n                                           ? columnLabel.substring(1, columnLabel.length() - 1)\n                                                        .toUpperCase()\n                                           : columnLabel.toUpperCase());\n                this.columnTypes.add(resultSetMetaData.getColumnType(i));\n            }\n            this.propertyIndices = new ArrayList<List<Integer>>();\n            List<Integer> index_0 = new ArrayList<Integer>();\n            index_0.add(columnNames.indexOf("LEGALNAME") + 1);\n            index_0.add(columnNames.indexOf("PK_0") + 1);\n            this.propertyIndices.add(index_0);\n            GraphFetch_Node0_Firm_Impl.databaseConnection$ = databaseConnection;\n            this.propertyGetters = new ArrayList<List<Supplier<Object>>>();\n            int propertyIndex;\n            Supplier<Object> propertyGetter = null;\n            List<Supplier<Object>> propertyGetter_0 = new ArrayList<Supplier<Object>>();\n            propertyIndex = this.propertyIndices.get(0).get(0);\n            propertyGetter = this.getResultSetPropertyGetterForStringProperty(this.resultSet,\n                                                                              propertyIndex,\n                                                                              resultSetMetaData.getColumnType(propertyIndex),\n                                                                              "legalName");\n            propertyGetter_0.add(propertyGetter);\n            this.propertyGetters.add(propertyGetter_0);\n        }\n        catch (RuntimeException e)\n        {\n            throw e;\n        }\n        catch (Exception e)\n        {\n            throw new RuntimeException(e);\n        }\n    }\n\n    IGraphInstance<? extends org.finos.legend.engine.plan.dependencies.store.shared.IReferencedObject> nextGraphInstance()\n    {\n        try\n        {\n            final GraphFetch_Node0_Firm_Impl object = new GraphFetch_Node0_Firm_Impl();\n            object.setSetId$("model_Firm");\n            int pkColIndex;\n            int propertyIndex;\n            pkColIndex = this.propertyIndices.get(0).get(1);\n            Object pk$_0 = this.getAlloyNativeValueFromResultSet(resultSet,\n                                                                 pkColIndex,\n                                                                 this.columnTypes.get(pkColIndex - 1));\n            object.setPk$_0(pk$_0);\n            propertyIndex = this.propertyIndices.get(0).get(0);\n            {\n                String res = (String) this.propertyGetters.get(0).get(0).get();\n                if (res == null)\n                {\n                    throw new RuntimeException("Error reading in property \'legalName\'. Property of multiplicity [1] can not be null");\n                }\n                object.setLegalName(res);\n            }\n            return new IGraphInstance<GraphFetch_Node0_Firm_Impl>()\n            {\n                public GraphFetch_Node0_Firm_Impl getValue()\n                {\n                    return object;\n                }\n                public long instanceSize()\n                {\n                    return object.getInstanceSize$();\n                }\n            };\n        }\n        catch (RuntimeException e)\n        {\n            throw e;\n        }\n        catch (Exception e)\n        {\n            throw new RuntimeException(e);\n        }\n    }\n\n    List<Method> primaryKeyGetters()\n    {\n        try\n        {\n            return Arrays.asList(GraphFetch_Node0_Firm_Impl.class.getMethod("getPk$_0"));\n        }\n        catch (Exception e)\n        {\n            throw new RuntimeException(e);\n        }\n    }\n\n    List<Pair<String, String>> allInstanceSetImplementations()\n    {\n        return Arrays.asList(Tuples.pair("execution::RelationalMapping", "model_Firm"));\n    }\n\n    List<String> primaryKeyColumns(int setIndex)\n    {\n        if (setIndex == 0)\n        {\n            return Arrays.asList("pk_0");\n        }\n        return null;\n    }\n}',
        },
        {
          package: '_pure.plan.root.n1.localGraph.localChild0',
          name: 'Execute',
          source:
            'package _pure.plan.root.n1.localGraph.localChild0;\n\nimport java.lang.reflect.Method;\nimport java.sql.ResultSet;\nimport java.util.*;\nimport java.util.function.*;\nimport java.util.stream.*;\nimport org.eclipse.collections.api.tuple.Pair;\nimport org.finos.legend.engine.plan.dependencies.domain.graphFetch.IGraphInstance;\nimport org.finos.legend.engine.plan.dependencies.store.relational.graphFetch.IRelationalClassQueryTempTableGraphFetchExecutionNodeSpecifics;\nimport org.finos.legend.engine.plan.dependencies.store.shared.IExecutionNodeContext;\nimport org.finos.legend.engine.plan.dependencies.store.shared.IReferencedObject;\n\npublic class Execute implements IRelationalClassQueryTempTableGraphFetchExecutionNodeSpecifics\n{\n    private Specifics specifics;\n\n    public Execute()\n    {\n        this.specifics = new Specifics();\n    }\n\n    public void prepare(ResultSet resultSet, String databaseTimeZone, String databaseConnection)\n    {\n        this.specifics.prepare(resultSet, databaseTimeZone, databaseConnection);\n    }\n\n    public IGraphInstance<? extends IReferencedObject> nextGraphInstance()\n    {\n        return this.specifics.nextGraphInstance();\n    }\n\n    public List<Method> primaryKeyGetters()\n    {\n        return this.specifics.primaryKeyGetters();\n    }\n\n    public List<Pair<String, String>> allInstanceSetImplementations()\n    {\n        return this.specifics.allInstanceSetImplementations();\n    }\n\n    public List<String> primaryKeyColumns(int setIndex)\n    {\n        return this.specifics.primaryKeyColumns(setIndex);\n    }\n\n    public void addChildToParent(Object parent,\n                                 Object child,\n                                 IExecutionNodeContext executionNodeContext)\n    {\n        this.specifics.addChildToParent(parent, child, executionNodeContext);\n    }\n\n    public List<String> parentPrimaryKeyColumns(List<String> queryResultColumns)\n    {\n        return this.specifics.parentPrimaryKeyColumns(queryResultColumns);\n    }\n}',
        },
        {
          package: '_pure.plan.root.n1.localGraph.localChild0',
          name: 'GraphFetch_Node2_Person_Impl',
          source:
            'package _pure.plan.root.n1.localGraph.localChild0;\n\nimport java.math.*;\nimport java.util.*;\nimport java.util.function.*;\nimport java.util.stream.*;\nimport org.finos.legend.engine.plan.dependencies.domain.date.DayOfWeek;\nimport org.finos.legend.engine.plan.dependencies.domain.date.DurationUnit;\nimport org.finos.legend.engine.plan.dependencies.domain.date.PureDate;\nimport org.finos.legend.engine.plan.dependencies.util.Library;\nimport com.fasterxml.jackson.annotation.JsonInclude;\nimport com.fasterxml.jackson.core.JsonGenerator;\nimport com.fasterxml.jackson.databind.JsonSerializer;\nimport com.fasterxml.jackson.databind.ObjectMapper;\nimport com.fasterxml.jackson.databind.SerializerProvider;\nimport com.fasterxml.jackson.databind.module.SimpleModule;\nimport java.io.IOException;\n\npublic class GraphFetch_Node2_Person_Impl implements _pure.app.model.Person, org.finos.legend.engine.plan.dependencies.domain.dataQuality.Constrained<_pure.app.model.Person>, java.io.Serializable\n{\n    private String firstName;\n    private Object pk$_0;\n    private static final ObjectMapper objectMapper$ = new ObjectMapper().setSerializationInclusion(JsonInclude.Include.NON_NULL).registerModule(new SimpleModule().addSerializer(PureDate.class, new JsonSerializer<PureDate>() { @Override public void serialize(PureDate value, JsonGenerator gen, SerializerProvider serializers) throws IOException { gen.writeRawValue("\\"" + value.toString() + "\\""); } }));\n    private String setId$;\n    public static String databaseConnection$;\n    private String alloyStoreObjectReference$;\n    private static final long serialVersionUID = 759745238L;\n\n    public String getFirstName()\n    {\n        return this.firstName;\n    }\n\n    public void setFirstName(String firstName)\n    {\n        this.firstName = firstName;\n    }\n\n    public void addFirstName(String object)\n    {\n        if ((Object) this.firstName != null)\n        {\n            throw new IllegalStateException("Found multiple objects for property \'firstName\' of multiplicity with bound 1");\n        }\n        this.firstName = object;\n    }\n\n    public List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> allConstraints()\n    {\n        return this.allConstraints(new org.finos.legend.engine.plan.dependencies.domain.dataQuality.GraphContext());\n    }\n\n    public _pure.app.model.Person withConstraintsApplied()\n    {\n        java.util.List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> defects = allConstraints();\n        if (!defects.isEmpty())\n        {\n            throw new IllegalStateException(defects.stream().map(org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect::getMessage).collect(java.util.stream.Collectors.joining("\\n")));\n        }\n        return this;\n    }\n\n    public org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked<_pure.app.model.Person> toChecked()\n    {\n        return this.toChecked(null, true);\n    }\n\n    public org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked<_pure.app.model.Person> toChecked(boolean applyConstraints)\n    {\n        return this.toChecked(null, applyConstraints);\n    }\n\n    public org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked<_pure.app.model.Person> toChecked(Object source)\n    {\n        return this.toChecked(source, true);\n    }\n\n    public org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked<_pure.app.model.Person> toChecked(Object source,\n                                                                                                                   boolean applyConstraints)\n    {\n        java.util.List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> defects = applyConstraints ? allConstraints() : java.util.Collections.emptyList();\n        return new org.finos.legend.engine.plan.dependencies.domain.dataQuality.IChecked<_pure.app.model.Person>() {\n            public java.util.List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> getDefects() { return defects; }\n            public Object getSource() { return source; }\n            public _pure.app.model.Person getValue() { return GraphFetch_Node2_Person_Impl.this; }\n        };\n    }\n\n    public List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> allConstraints(org.finos.legend.engine.plan.dependencies.domain.dataQuality.GraphContext context)\n    {\n        List<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect> result = new ArrayList<org.finos.legend.engine.plan.dependencies.domain.dataQuality.IDefect>();\n        if (!context.visited.contains(this))\n        {\n            context.visited.add(this);\n        }\n        return result;\n    }\n\n    public Object getPk$_0()\n    {\n        return this.pk$_0;\n    }\n\n    public void setPk$_0(Object pk$_0)\n    {\n        this.pk$_0 = pk$_0;\n    }\n\n    public String getSetId$()\n    {\n        return this.setId$;\n    }\n\n    public void setSetId$(String setId)\n    {\n        this.setId$ = setId;\n    }\n\n    public String getAlloyStoreObjectReference$()\n    {\n        if (this.alloyStoreObjectReference$ == null)\n        {\n            try\n            {\n                StringBuilder referenceBuilder = new StringBuilder();\n                referenceBuilder.append("001:");\n                referenceBuilder.append("010:");\n\n                referenceBuilder.append("0000000010:");\n                referenceBuilder.append("Relational:");\n\n                referenceBuilder.append("0000000028:");\n                referenceBuilder.append("execution::RelationalMapping:");\n\n                referenceBuilder.append("0000000012:");\n                referenceBuilder.append("model_Person:");\n\n                String setId = this.getSetId$();\n                referenceBuilder.append(String.format("%010d", setId.length()));\n                referenceBuilder.append(":");\n                referenceBuilder.append(setId);\n                referenceBuilder.append(":");\n\n                String databaseConnectionString = _pure.plan.root.n1.localGraph.localChild0.GraphFetch_Node2_Person_Impl.databaseConnection$;\n                referenceBuilder.append(String.format("%010d", databaseConnectionString.length()));\n                referenceBuilder.append(":");\n                referenceBuilder.append(databaseConnectionString);\n                referenceBuilder.append(":");\n\n                Map<String, Object> pkMap = new HashMap<>();\n\n                pkMap.put("pk$_0", this.getPk$_0());\n                String pkMapString = objectMapper$.writeValueAsString(pkMap);\n                referenceBuilder.append(String.format("%010d", pkMapString.length()));\n                referenceBuilder.append(":");\n                referenceBuilder.append(pkMapString);\n\n                this.alloyStoreObjectReference$ = "ASOR:" + org.apache.commons.codec.binary.Base64.encodeBase64URLSafeString(referenceBuilder.toString().getBytes());\n            }\n            catch (Exception e)\n            {\n               throw new RuntimeException(e);\n            }\n        }\n\n        return this.alloyStoreObjectReference$;\n    }\n\n    public void setAlloyStoreObjectReference$(String reference)\n    {\n        this.alloyStoreObjectReference$ = reference;\n    }\n\n    private static long getClassSize$()\n    {\n        return 108L;\n    }\n\n    public long getInstanceSize$()\n    {\n        long size = GraphFetch_Node2_Person_Impl.getClassSize$();\n        if (this.firstName != null)\n        {\n            size = size + this.firstName.length();\n        }\n        if (this.setId$ != null)\n        {\n            size = size + this.setId$.length();\n        }\n        if (this.alloyStoreObjectReference$ != null)\n        {\n            size = size + this.alloyStoreObjectReference$.length();\n        }\n        return size;\n    }\n}',
        },
        {
          package: '_pure.plan.root.n1.localGraph.localChild0',
          name: 'Specifics',
          source:
            'package _pure.plan.root.n1.localGraph.localChild0;\n\nimport java.lang.reflect.Method;\nimport java.sql.ResultSet;\nimport java.sql.ResultSetMetaData;\nimport java.sql.Types;\nimport java.util.*;\nimport java.util.function.*;\nimport java.util.stream.*;\nimport org.eclipse.collections.api.tuple.Pair;\nimport org.eclipse.collections.impl.tuple.Tuples;\nimport org.finos.legend.engine.plan.dependencies.domain.date.PureDate;\nimport org.finos.legend.engine.plan.dependencies.domain.graphFetch.IGraphInstance;\nimport org.finos.legend.engine.plan.dependencies.store.shared.IConstantResult;\nimport org.finos.legend.engine.plan.dependencies.store.shared.IExecutionNodeContext;\n\nclass Specifics\n{\n    private static final List<Integer> STRING_TYPES = Arrays.asList(Types.CHAR, Types.VARCHAR, Types.LONGVARCHAR, Types.NCHAR, Types.NVARCHAR, Types.LONGNVARCHAR, Types.OTHER, Types.NULL);\n    private static final List<Integer> INT_TYPES = Arrays.asList(Types.TINYINT, Types.SMALLINT, Types.INTEGER, Types.BIGINT, Types.NULL);\n    private static final List<Integer> FLOAT_TYPES = Arrays.asList(Types.REAL, Types.FLOAT, Types.DOUBLE, Types.DECIMAL, Types.NUMERIC, Types.NULL);\n    private static final List<Integer> DECIMAL_TYPES = Arrays.asList(Types.DECIMAL, Types.NUMERIC, Types.NULL);\n    private static final List<Integer> BOOL_TYPES = Arrays.asList(Types.BIT, Types.BOOLEAN, Types.NULL);\n    private static final List<Integer> STRICT_DATE_TYPES = Arrays.asList(Types.DATE, Types.NULL);\n    private static final List<Integer> DATE_TIME_TYPES = Arrays.asList(Types.TIMESTAMP, Types.NULL);\n    private ResultSet resultSet;\n    private String databaseTimeZone;\n    private String databaseConnection;\n    private List<Integer> columnTypes;\n    private List<List<Integer>> propertyIndices;\n    private List<List<Supplier<Object>>> propertyGetters;\n    private Calendar calendar;\n    private Method parentPropertyAdder;\n    private Method parentEdgePointPropertyAdder;\n\n    private Object getAlloyNativeValueFromResultSet(ResultSet resultSet,\n                                                    int columnIndex,\n                                                    int columnType)\n    {\n        try\n        {\n            Object result = null;\n            switch (columnType)\n            {\n                case Types.DATE:\n                {\n                    java.sql.Date date = resultSet.getDate(columnIndex);\n                    if (date != null)\n                    {\n                        result = PureDate.fromSQLDate(date);\n                    }\n                    break;\n                }\n                case Types.TIMESTAMP:\n                {\n                    java.sql.Timestamp timestamp = resultSet.getTimestamp(columnIndex, this.calendar);\n                    if (timestamp != null)\n                    {\n                        result = PureDate.fromSQLTimestamp(timestamp);\n                    }\n                    break;\n                }\n                case Types.TINYINT:\n                case Types.SMALLINT:\n                case Types.INTEGER:\n                case Types.BIGINT:\n                {\n                    long num = resultSet.getLong(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        result = Long.valueOf(num);\n                    }\n                    break;\n                }\n                case Types.REAL:\n                case Types.FLOAT:\n                case Types.DOUBLE:\n                {\n                    double num = resultSet.getDouble(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        result = Double.valueOf(num);\n                    }\n                    break;\n                }\n                case Types.DECIMAL:\n                case Types.NUMERIC:\n                {\n                    result = resultSet.getBigDecimal(columnIndex);\n                    break;\n                }\n                case Types.CHAR:\n                case Types.VARCHAR:\n                case Types.LONGVARCHAR:\n                case Types.NCHAR:\n                case Types.NVARCHAR:\n                case Types.LONGNVARCHAR:\n                case Types.OTHER:\n                {\n                    result = resultSet.getString(columnIndex);\n                    break;\n                }\n                case Types.BIT:\n                case Types.BOOLEAN:\n                {\n                    boolean bool = resultSet.getBoolean(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        result = Boolean.valueOf(bool);\n                    }\n                    break;\n                }\n                case Types.BINARY:\n                case Types.VARBINARY:\n                case Types.LONGVARBINARY:\n                {\n                    byte[] bytes = resultSet.getBytes(columnIndex);\n                    if (bytes != null)\n                    {\n                        result = this.encodeHex(bytes);\n                    }\n                    break;\n                }\n                case Types.NULL:\n                {\n                    // do nothing: value is already assigned to null\n                    break;\n                }\n                default:\n                {\n                    result = resultSet.getObject(columnIndex);\n                }\n            }\n            return result;}\n        catch (Exception e)\n        {\n            throw new RuntimeException(e);\n        }\n    }\n\n    private String encodeHex(byte[] data)\n    {\n        final char[] DIGITS_LOWER = {\'0\', \'1\', \'2\', \'3\', \'4\', \'5\', \'6\', \'7\', \'8\', \'9\', \'a\', \'b\', \'c\', \'d\', \'e\', \'f\'};\n        final int l = data.length;\n        final char[] out = new char[l << 1];\n        for (int i = 0, j = 0; i < l; i++)\n        {\n            out[j++] = DIGITS_LOWER[(0xF0 & data[i]) >>> 4];\n            out[j++] = DIGITS_LOWER[0x0F & data[i]];\n        }\n        return new String(out);\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForStringProperty(ResultSet resultSet,\n                                                                         int columnIndex,\n                                                                         int columnType,\n                                                                         String propertyName)\n    {\n        if (STRING_TYPES.contains(columnType))\n        {\n           return () -> {\n                try\n                {\n                    return resultSet.getString(columnIndex);\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        else\n        {\n            throw new RuntimeException("Error reading in property \'" + propertyName + "\' of type String from SQL column of type \'" + columnType + "\'.");\n        }\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForIntegerProperty(ResultSet resultSet,\n                                                                          int columnIndex,\n                                                                          int columnType,\n                                                                          String propertyName)\n    {\n        if (INT_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    Long res = null;\n                    long r = resultSet.getLong(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = Long.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException("Error reading in property \'" + propertyName + "\' of type Integer from SQL column of type \'" + columnType + "\'.");\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForFloatProperty(ResultSet resultSet,\n                                                                        int columnIndex,\n                                                                        int columnType,\n                                                                        String propertyName)\n    {\n        if (FLOAT_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    Double res = null;\n                    double r = resultSet.getDouble(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = Double.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (INT_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    Double res = null;\n                    long r = resultSet.getLong(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = Double.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException("Error reading in property \'" + propertyName + "\' of type Float from SQL column of type \'" + columnType + "\'.");\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForDecimalProperty(ResultSet resultSet,\n                                                                          int columnIndex,\n                                                                          int columnType,\n                                                                          String propertyName)\n    {\n        if (DECIMAL_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    return resultSet.getBigDecimal(columnIndex);\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (FLOAT_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    java.math.BigDecimal res = null;\n                    double r = resultSet.getDouble(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = java.math.BigDecimal.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (INT_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    java.math.BigDecimal res = null;\n                    long r = resultSet.getLong(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = java.math.BigDecimal.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException("Error reading in property \'" + propertyName + "\' of type Decimal from SQL column of type \'" + columnType + "\'.");\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForBooleanProperty(ResultSet resultSet,\n                                                                          int columnIndex,\n                                                                          int columnType,\n                                                                          String propertyName)\n    {\n        if (BOOL_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    Boolean res = null;\n                    boolean r = resultSet.getBoolean(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = Boolean.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (STRING_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    Boolean res = null;\n                    String r = resultSet.getString(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = Boolean.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (INT_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    Boolean res = null;\n                    long r = resultSet.getLong(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = Boolean.valueOf(r == 1);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException("Error reading in property \'" + propertyName + "\' of type Boolean from SQL column of type \'" + columnType + "\'.");\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForStrictDateProperty(ResultSet resultSet,\n                                                                             int columnIndex,\n                                                                             int columnType,\n                                                                             String propertyName)\n    {\n        if (STRICT_DATE_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    java.sql.Date r = resultSet.getDate(columnIndex);\n                    if (r != null)\n                    {\n                        res = PureDate.fromSQLDate(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (STRING_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    String r = resultSet.getString(columnIndex);\n                    if (r != null)\n                    {\n                        try\n                        {\n                            res = PureDate.parsePureDate(r);\n                        }\n                        catch (java.lang.IllegalArgumentException dateTimeParseException)\n                        {\n                            res = PureDate.fromSQLDate(java.sql.Date.valueOf(r));\n                        }\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException("Error reading in property \'" + propertyName + "\' of type StrictDate from SQL column of type \'" + columnType + "\'.");\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForDateTimeProperty(ResultSet resultSet,\n                                                                           int columnIndex,\n                                                                           int columnType,\n                                                                           String propertyName)\n    {\n        if (DATE_TIME_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    java.sql.Timestamp r = resultSet.getTimestamp(columnIndex, this.calendar);\n                    if (r != null)\n                    {\n                        res = PureDate.fromSQLTimestamp(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (STRING_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    String r = resultSet.getString(columnIndex);\n                    if (r != null)\n                    {\n                        try\n                        {\n                            res = PureDate.parsePureDate(r);\n                        }\n                        catch (java.lang.IllegalArgumentException dateTimeParseException)\n                        {\n                            res = PureDate.fromSQLTimestamp(java.sql.Timestamp.valueOf(r));\n                        }\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException("Error reading in property \'" + propertyName + "\' of type DateTime from SQL column of type \'" + columnType + "\'.");\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForDateProperty(ResultSet resultSet,\n                                                                       int columnIndex,\n                                                                       int columnType,\n                                                                       String propertyName)\n    {\n        if (STRICT_DATE_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    java.sql.Date r = resultSet.getDate(columnIndex);\n                    if (r != null)\n                    {\n                        res = PureDate.fromSQLDate(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (DATE_TIME_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    java.sql.Timestamp r = resultSet.getTimestamp(columnIndex, this.calendar);\n                    if (r != null)\n                    {\n                        res = PureDate.fromSQLTimestamp(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (STRING_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    String r = resultSet.getString(columnIndex);\n                    if (r != null)\n                    {\n                        try\n                        {\n                            res = PureDate.parsePureDate(r);\n                        }\n                        catch (java.lang.IllegalArgumentException dateTimeParseException1)\n                        {\n                            try\n                            {\n                                res = PureDate.fromSQLTimestamp(java.sql.Timestamp.valueOf(r));\n                            }\n                            catch (java.time.format.DateTimeParseException dateTimeParseException2)\n                            {\n                                res = PureDate.fromSQLDate(java.sql.Date.valueOf(r));\n                            }\n                        }\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException("Error reading in property \'" + propertyName + "\' of type Date from SQL column of type \'" + columnType + "\'.");\n    }\n\n    void prepare(ResultSet resultSet, String databaseTimeZone, String databaseConnection)\n    {\n        try\n        {\n            this.resultSet = resultSet;\n            this.databaseTimeZone = databaseTimeZone;\n            this.databaseConnection = databaseConnection;\n            this.calendar = new GregorianCalendar(TimeZone.getTimeZone(this.databaseTimeZone));\n            ResultSetMetaData resultSetMetaData = this.resultSet.getMetaData();\n            int columnCount = resultSetMetaData.getColumnCount();\n            this.columnTypes = new ArrayList<Integer>();\n            List<String> columnNames = new ArrayList<String>();\n            for (int i = 1; i <= columnCount; i++)\n            {\n                String columnLabel = resultSetMetaData.getColumnLabel(i);\n                columnNames.add(columnLabel.startsWith("\\"") && columnLabel\n                                           .endsWith("\\"")\n                                           ? columnLabel.substring(1, columnLabel.length() - 1)\n                                                        .toUpperCase()\n                                           : columnLabel.toUpperCase());\n                this.columnTypes.add(resultSetMetaData.getColumnType(i));\n            }\n            this.propertyIndices = new ArrayList<List<Integer>>();\n            List<Integer> index_0 = new ArrayList<Integer>();\n            index_0.add(columnNames.indexOf("FIRSTNAME") + 1);\n            index_0.add(columnNames.indexOf("PK_0") + 1);\n            this.propertyIndices.add(index_0);\n            GraphFetch_Node2_Person_Impl.databaseConnection$ = databaseConnection;\n            this.propertyGetters = new ArrayList<List<Supplier<Object>>>();\n            int propertyIndex;\n            Supplier<Object> propertyGetter = null;\n            List<Supplier<Object>> propertyGetter_0 = new ArrayList<Supplier<Object>>();\n            propertyIndex = this.propertyIndices.get(0).get(0);\n            propertyGetter = this.getResultSetPropertyGetterForStringProperty(this.resultSet,\n                                                                              propertyIndex,\n                                                                              resultSetMetaData.getColumnType(propertyIndex),\n                                                                              "firstName");\n            propertyGetter_0.add(propertyGetter);\n            this.propertyGetters.add(propertyGetter_0);\n        }\n        catch (RuntimeException e)\n        {\n            throw e;\n        }\n        catch (Exception e)\n        {\n            throw new RuntimeException(e);\n        }\n    }\n\n    IGraphInstance<? extends org.finos.legend.engine.plan.dependencies.store.shared.IReferencedObject> nextGraphInstance()\n    {\n        try\n        {\n            final GraphFetch_Node2_Person_Impl object = new GraphFetch_Node2_Person_Impl();\n            object.setSetId$("model_Person");\n            int pkColIndex;\n            int propertyIndex;\n            pkColIndex = this.propertyIndices.get(0).get(1);\n            Object pk$_0 = this.getAlloyNativeValueFromResultSet(resultSet,\n                                                                 pkColIndex,\n                                                                 this.columnTypes.get(pkColIndex - 1));\n            object.setPk$_0(pk$_0);\n            propertyIndex = this.propertyIndices.get(0).get(0);\n            {\n                String res = (String) this.propertyGetters.get(0).get(0).get();\n                if (res == null)\n                {\n                    throw new RuntimeException("Error reading in property \'firstName\'. Property of multiplicity [1] can not be null");\n                }\n                object.setFirstName(res);\n            }\n            return new IGraphInstance<GraphFetch_Node2_Person_Impl>()\n            {\n                public GraphFetch_Node2_Person_Impl getValue()\n                {\n                    return object;\n                }\n                public long instanceSize()\n                {\n                    return object.getInstanceSize$();\n                }\n            };\n        }\n        catch (RuntimeException e)\n        {\n            throw e;\n        }\n        catch (Exception e)\n        {\n            throw new RuntimeException(e);\n        }\n    }\n\n    List<Method> primaryKeyGetters()\n    {\n        try\n        {\n            return Arrays.asList(GraphFetch_Node2_Person_Impl.class.getMethod("getPk$_0"));\n        }\n        catch (Exception e)\n        {\n            throw new RuntimeException(e);\n        }\n    }\n\n    List<Pair<String, String>> allInstanceSetImplementations()\n    {\n        return Arrays.asList(Tuples.pair("execution::RelationalMapping", "model_Person"));\n    }\n\n    List<String> primaryKeyColumns(int setIndex)\n    {\n        if (setIndex == 0)\n        {\n            return Arrays.asList("pk_0");\n        }\n        return null;\n    }\n\n    void addChildToParent(Object parent, Object child, IExecutionNodeContext executionNodeContext)\n    {\n        try\n        {\n            if (this.parentPropertyAdder == null)\n            {\n                this.parentPropertyAdder = parent\n                    .getClass()\n                    .getMethod("addEmployees", _pure.app.model.Person.class);\n            }\n            this.parentPropertyAdder.invoke(parent, child);\n        }\n        catch (Exception e)\n        {\n            throw new RuntimeException(e);\n        }\n    }\n\n    List<String> parentPrimaryKeyColumns(List<String> queryResultColumns)\n    {\n        return queryResultColumns.stream()\n                                 .filter((String x) -> x.toUpperCase().startsWith("PARENT_KEY_GEN_"))\n                                 .collect(Collectors.toList());\n    }\n}',
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
          checked: false,
          dependencyIndices: [],
          enableConstraints: true,
          graphFetchTree: {
            _type: 'rootGraphFetchTree',
            class: 'model::Firm',
            subTrees: [
              {
                _type: 'propertyGraphFetchTree',
                parameters: [],
                property: 'legalName',
                subTrees: [],
                subTypeTrees: [],
              },
              {
                _type: 'propertyGraphFetchTree',
                parameters: [],
                property: 'employees',
                subTrees: [
                  {
                    _type: 'propertyGraphFetchTree',
                    parameters: [],
                    property: 'firstName',
                    subTrees: [],
                    subTypeTrees: [],
                  },
                ],
                subTypeTrees: [],
              },
            ],
            subTypeTrees: [],
          },
          localGraphFetchExecutionNode: {
            _type: 'relationalRootQueryTempTableGraphFetch',
            authDependent: false,
            batchSize: 1000,
            checked: false,
            children: [
              {
                _type: 'relationalClassQueryTempTableGraphFetch',
                authDependent: false,
                columns: [
                  {
                    dataType: 'INTEGER',
                    label: 'pk_0',
                  },
                ],
                executionNodes: [
                  {
                    _type: 'sql',
                    authDependent: false,
                    connection: {
                      _type: 'RelationalDatabaseConnection',
                      authenticationStrategy: {
                        _type: 'h2Default',
                      },
                      databaseType: 'H2',
                      datasourceSpecification: {
                        _type: 'h2Local',
                        testDataSetupSqls: [
                          "Drop table if exists FirmTable;\nDrop table if exists PersonTable;\nCreate Table FirmTable(id INT, Legal_Name VARCHAR(200));\nCreate Table PersonTable(id INT, firm_id INT, lastName VARCHAR(200), firstName VARCHAR(200));\nInsert into FirmTable (id, Legal_Name) values (1, 'FirmA');\nInsert into FirmTable (id, Legal_Name) values (2, 'Apple');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (1, 1, 'John', 'Doe');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (2, 2, 'Tim', 'Smith');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (3, 3, 'Nicole', 'Doe');\n\n",
                        ],
                      },
                      element: 'store::TestDB',
                      type: 'H2',
                    },
                    resultColumns: [
                      {
                        dataType: 'INTEGER',
                        label: '"parent_key_gen_0"',
                      },
                      {
                        dataType: 'INTEGER',
                        label: '"pk_0"',
                      },
                      {
                        dataType: 'VARCHAR(200)',
                        label: '"firstName"',
                      },
                    ],
                    resultType: {
                      _type: 'dataType',
                      dataType: 'meta::pure::metamodel::type::Any',
                    },
                    sqlQuery:
                      'select distinct "temp_table_node_0_0".pk_0 as "parent_key_gen_0", "persontable_0".id as "pk_0", "persontable_0".firstName as "firstName" from (select * from (${temp_table_node_0}) as "root") as "temp_table_node_0_0" inner join FirmTable as "root" on ("temp_table_node_0_0".pk_0 = "root".id) left outer join PersonTable as "persontable_0" on ("persontable_0".firm_id = "root".id) where "persontable_0".id is not null',
                  },
                ],
                graphFetchTree: {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'employees',
                  subTrees: [
                    {
                      _type: 'propertyGraphFetchTree',
                      parameters: [],
                      property: 'firstName',
                      subTrees: [],
                      subTypeTrees: [],
                    },
                  ],
                  subTypeTrees: [],
                },
                implementation: {
                  _type: 'java',
                  executionClassFullName:
                    '_pure.plan.root.n1.localGraph.localChild0.Execute',
                },
                nodeIndex: 2,
                parentIndex: 0,
                processedTempTableName: 'temp_table_node_2',
                resultType: {
                  _type: 'partialClass',
                  class: 'model::Person',
                  propertiesWithParameters: [
                    {
                      property: 'firstName',
                    },
                  ],
                  setImplementations: [
                    {
                      class: 'model::Person',
                      id: 'model_Person',
                      mapping: 'execution::RelationalMapping',
                      propertyMappings: [
                        {
                          enumMapping: {},
                          property: 'firstName',
                          type: 'String',
                        },
                        {
                          enumMapping: {},
                          property: 'lastName',
                          type: 'String',
                        },
                      ],
                    },
                  ],
                },
                tempTableName: 'temp_table_node_2',
              },
            ],
            columns: [
              {
                dataType: 'INTEGER',
                label: 'pk_0',
              },
            ],
            executionNodes: [
              {
                _type: 'sql',
                authDependent: false,
                connection: {
                  _type: 'RelationalDatabaseConnection',
                  authenticationStrategy: {
                    _type: 'h2Default',
                  },
                  databaseType: 'H2',
                  datasourceSpecification: {
                    _type: 'h2Local',
                    testDataSetupSqls: [
                      "Drop table if exists FirmTable;\nDrop table if exists PersonTable;\nCreate Table FirmTable(id INT, Legal_Name VARCHAR(200));\nCreate Table PersonTable(id INT, firm_id INT, lastName VARCHAR(200), firstName VARCHAR(200));\nInsert into FirmTable (id, Legal_Name) values (1, 'FirmA');\nInsert into FirmTable (id, Legal_Name) values (2, 'Apple');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (1, 1, 'John', 'Doe');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (2, 2, 'Tim', 'Smith');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (3, 3, 'Nicole', 'Doe');\n\n",
                    ],
                  },
                  element: 'store::TestDB',
                  type: 'H2',
                },
                resultColumns: [
                  {
                    dataType: 'INTEGER',
                    label: '"pk_0"',
                  },
                  {
                    dataType: 'VARCHAR(200)',
                    label: '"legalName"',
                  },
                ],
                resultType: {
                  _type: 'dataType',
                  dataType: 'meta::pure::metamodel::type::Any',
                },
                sqlQuery:
                  'select "root".id as "pk_0", "root".legal_name as "legalName" from FirmTable as "root"',
              },
            ],
            graphFetchTree: {
              _type: 'rootGraphFetchTree',
              class: 'model::Firm',
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'legalName',
                  subTrees: [],
                  subTypeTrees: [],
                },
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'employees',
                  subTrees: [
                    {
                      _type: 'propertyGraphFetchTree',
                      parameters: [],
                      property: 'firstName',
                      subTrees: [],
                      subTypeTrees: [],
                    },
                  ],
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
            processedTempTableName: 'temp_table_node_0',
            resultType: {
              _type: 'partialClass',
              class: 'model::Firm',
              propertiesWithParameters: [
                {
                  property: 'legalName',
                },
                {
                  property: 'employees',
                },
              ],
              setImplementations: [
                {
                  class: 'model::Firm',
                  id: 'model_Firm',
                  mapping: 'execution::RelationalMapping',
                  propertyMappings: [
                    {
                      enumMapping: {},
                      property: 'legalName',
                      type: 'String',
                    },
                  ],
                },
              ],
            },
            tempTableName: 'temp_table_node_0',
            tempTableStrategy: {
              _type: 'tempFile',
              createTempTableNode: {
                _type: 'sequence',
                authDependent: false,
                executionNodes: [
                  {
                    _type: 'sql',
                    authDependent: false,
                    connection: {
                      _type: 'RelationalDatabaseConnection',
                      authenticationStrategy: {
                        _type: 'h2Default',
                      },
                      databaseType: 'H2',
                      datasourceSpecification: {
                        _type: 'h2Local',
                        testDataSetupSqls: [
                          "Drop table if exists FirmTable;\nDrop table if exists PersonTable;\nCreate Table FirmTable(id INT, Legal_Name VARCHAR(200));\nCreate Table PersonTable(id INT, firm_id INT, lastName VARCHAR(200), firstName VARCHAR(200));\nInsert into FirmTable (id, Legal_Name) values (1, 'FirmA');\nInsert into FirmTable (id, Legal_Name) values (2, 'Apple');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (1, 1, 'John', 'Doe');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (2, 2, 'Tim', 'Smith');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (3, 3, 'Nicole', 'Doe');\n\n",
                        ],
                      },
                      element: 'store::TestDB',
                      type: 'H2',
                    },
                    resultColumns: [],
                    resultType: {
                      _type: 'void',
                    },
                    sqlQuery:
                      'CREATE LOCAL TEMPORARY TABLE temp_table_node_0(pk_0 INT);',
                  },
                ],
                resultType: {
                  _type: 'void',
                },
              },
              dropTempTableNode: {
                _type: 'sequence',
                authDependent: false,
                executionNodes: [
                  {
                    _type: 'sql',
                    authDependent: false,
                    connection: {
                      _type: 'RelationalDatabaseConnection',
                      authenticationStrategy: {
                        _type: 'h2Default',
                      },
                      databaseType: 'H2',
                      datasourceSpecification: {
                        _type: 'h2Local',
                        testDataSetupSqls: [
                          "Drop table if exists FirmTable;\nDrop table if exists PersonTable;\nCreate Table FirmTable(id INT, Legal_Name VARCHAR(200));\nCreate Table PersonTable(id INT, firm_id INT, lastName VARCHAR(200), firstName VARCHAR(200));\nInsert into FirmTable (id, Legal_Name) values (1, 'FirmA');\nInsert into FirmTable (id, Legal_Name) values (2, 'Apple');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (1, 1, 'John', 'Doe');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (2, 2, 'Tim', 'Smith');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (3, 3, 'Nicole', 'Doe');\n\n",
                        ],
                      },
                      element: 'store::TestDB',
                      type: 'H2',
                    },
                    resultColumns: [],
                    resultType: {
                      _type: 'void',
                    },
                    sqlQuery: 'Drop table if exists temp_table_node_0;',
                  },
                ],
                resultType: {
                  _type: 'void',
                },
              },
              loadTempTableNode: {
                _type: 'sequence',
                authDependent: false,
                executionNodes: [
                  {
                    _type: 'sql',
                    authDependent: false,
                    connection: {
                      _type: 'RelationalDatabaseConnection',
                      authenticationStrategy: {
                        _type: 'h2Default',
                      },
                      databaseType: 'H2',
                      datasourceSpecification: {
                        _type: 'h2Local',
                        testDataSetupSqls: [
                          "Drop table if exists FirmTable;\nDrop table if exists PersonTable;\nCreate Table FirmTable(id INT, Legal_Name VARCHAR(200));\nCreate Table PersonTable(id INT, firm_id INT, lastName VARCHAR(200), firstName VARCHAR(200));\nInsert into FirmTable (id, Legal_Name) values (1, 'FirmA');\nInsert into FirmTable (id, Legal_Name) values (2, 'Apple');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (1, 1, 'John', 'Doe');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (2, 2, 'Tim', 'Smith');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (3, 3, 'Nicole', 'Doe');\n\n",
                        ],
                      },
                      element: 'store::TestDB',
                      type: 'H2',
                    },
                    resultColumns: [],
                    resultType: {
                      _type: 'void',
                    },
                    sqlQuery:
                      "INSERT INTO temp_table_node_0 SELECT * FROM CSVREAD('${csv_file_location}');",
                  },
                ],
                resultType: {
                  _type: 'void',
                },
              },
            },
          },
          localTreeIndices: [0, 1, 2, 3],
          resultSizeRange: {
            lowerBound: 0,
          },
          resultType: {
            _type: 'partialClass',
            class: 'model::Firm',
            propertiesWithParameters: [
              {
                property: 'legalName',
              },
              {
                property: 'employees',
              },
            ],
            setImplementations: [
              {
                class: 'model::Firm',
                id: 'model_Firm',
                mapping: 'execution::RelationalMapping',
                propertyMappings: [
                  {
                    enumMapping: {},
                    property: 'legalName',
                    type: 'String',
                  },
                ],
              },
            ],
          },
          store: 'store::TestDB',
        },
      ],
      implementation: {
        _type: 'java',
        executionClassFullName: '_pure.plan.root.Serialize',
      },
      pure: {
        _type: 'func',
        fControl: 'serialize_T_MANY__RootGraphFetchTree_1__String_1_',
        function: 'serialize',
        parameters: [
          {
            _type: 'collection',
            multiplicity: {
              lowerBound: 0,
            },
            values: [],
          },
          {
            _type: 'classInstance',
            type: 'rootGraphFetchTree',
            value: {
              _type: 'rootGraphFetchTree',
              class: 'model::Firm',
              subTrees: [
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'legalName',
                  subTrees: [],
                  subTypeTrees: [],
                },
                {
                  _type: 'propertyGraphFetchTree',
                  parameters: [],
                  property: 'employees',
                  subTrees: [
                    {
                      _type: 'propertyGraphFetchTree',
                      parameters: [],
                      property: 'firstName',
                      subTrees: [],
                      subTypeTrees: [],
                    },
                  ],
                  subTypeTrees: [],
                },
              ],
              subTypeTrees: [],
            },
          },
        ],
      },
      resultType: {
        _type: 'dataType',
        dataType: 'String',
      },
    },
    serializer: {
      name: 'pure',
      version: 'vX_X_X',
    },
    templateFunctions: [
      '<#function renderCollection collection separator prefix suffix replacementMap defaultValue><#if collection?size == 0><#return defaultValue></#if><#assign newCollection = collection><#list replacementMap as oldValue, newValue>   <#assign newCollection = collection?map(ele -> ele?replace(oldValue, newValue))></#list><#return prefix + newCollection?join(suffix + separator + prefix) + suffix></#function>',
      '<#function collectionSize collection> <#return collection?size?c> </#function>',
      '<#function optionalVarPlaceHolderOperationSelector optionalParameter trueClause falseClause><#if optionalParameter?has_content || optionalParameter?is_string><#return trueClause><#else><#return falseClause></#if></#function>',
      '<#function varPlaceHolderToString optionalParameter prefix suffix replacementMap defaultValue><#if optionalParameter?is_enumerable && !optionalParameter?has_content><#return defaultValue><#else><#assign newParam = optionalParameter><#list replacementMap as oldValue, newValue>   <#assign newParam = newParam?replace(oldValue, newValue)></#list><#return prefix + newParam + suffix></#if></#function>',
      '<#function equalEnumOperationSelector enumVal inDyna equalDyna><#assign enumList = enumVal?split(",")><#if enumList?size = 1><#return equalDyna><#else><#return inDyna></#if></#function>',
    ],
  },
  entities: [
    {
      path: 'model::Firm',
      content: {
        _type: 'class',
        name: 'Firm',
        package: 'model',
        properties: [
          {
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            name: 'legalName',
            type: 'String',
          },
          {
            multiplicity: {
              lowerBound: 0,
            },
            name: 'employees',
            genericType: {
              rawType: {
                _type: 'packageableType',
                fullPath: 'model::Person',
              },
              typeArguments: [],
              typeVariableValues: [],
            },
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::type::Class',
    },
    {
      path: 'entity::model::LegalEntity',
      content: {
        _type: 'class',
        name: 'LegalEntity',
        package: 'entity::model',
        properties: [
          {
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            name: 'identifier',
            type: 'String',
          },
          {
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            name: 'legalName',
            type: 'String',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::type::Class',
    },
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
            name: 'firstName',
            type: 'String',
          },
          {
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            name: 'lastName',
            type: 'String',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::type::Class',
    },
    {
      path: 'model::class',
      content: {
        _type: 'class',
        name: 'class',
        package: 'model',
      },
      classifierPath: 'meta::pure::metamodel::type::Class',
    },
    {
      path: 'trade::model::Trade',
      content: {
        _type: 'class',
        name: 'Trade',
        package: 'trade::model',
        properties: [
          {
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            name: 'ticker',
            type: 'String',
          },
          {
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            name: 'quantity',
            genericType: {
              rawType: {
                _type: 'packageableType',
                fullPath: 'Integer',
              },
              typeArguments: [],
              typeVariableValues: [],
            },
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::type::Class',
    },
    {
      path: 'trade::model::Trade_LegalEntity',
      content: {
        _type: 'association',
        name: 'Trade_LegalEntity',
        package: 'trade::model',
        properties: [
          {
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            name: 'client',
            type: 'entity::model::LegalEntity',
          },
          {
            multiplicity: {
              lowerBound: 0,
            },
            name: 'trades',
            type: 'trade::model::Trade',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::relationship::Association',
    },
    {
      path: 'trade::store::TradeDatabase',
      content: {
        _type: 'relational',
        filters: [],
        includedStores: [],
        joins: [],
        name: 'TradeDatabase',
        package: 'trade::store',
        schemas: [
          {
            name: 'TRADE_SCHEMA',
            tables: [
              {
                columns: [
                  {
                    name: 'TICKER',
                    nullable: false,
                    type: {
                      _type: 'Varchar',
                      size: 100,
                    },
                  },
                  {
                    name: 'QUANTITY',
                    nullable: true,
                    type: {
                      _type: 'Integer',
                    },
                  },
                  {
                    name: 'CLIENT_IDENTIFIER',
                    nullable: true,
                    type: {
                      _type: 'Varchar',
                      size: 100,
                    },
                  },
                ],
                name: 'TRADE_TABLE',
                primaryKey: ['TICKER'],
              },
            ],
            views: [],
          },
        ],
      },
      classifierPath: 'meta::relational::metamodel::Database',
    },
    {
      path: 'store::TestDB',
      content: {
        _type: 'relational',
        filters: [],
        includedStores: [],
        joins: [
          {
            name: 'FirmPerson',
            operation: {
              _type: 'dynaFunc',
              funcName: 'equal',
              parameters: [
                {
                  _type: 'column',
                  column: 'firm_id',
                  table: {
                    _type: 'Table',
                    database: 'store::TestDB',
                    mainTableDb: 'store::TestDB',
                    schema: 'default',
                    table: 'PersonTable',
                  },
                  tableAlias: 'PersonTable',
                },
                {
                  _type: 'column',
                  column: 'id',
                  table: {
                    _type: 'Table',
                    database: 'store::TestDB',
                    mainTableDb: 'store::TestDB',
                    schema: 'default',
                    table: 'FirmTable',
                  },
                  tableAlias: 'FirmTable',
                },
              ],
            },
          },
        ],
        name: 'TestDB',
        package: 'store',
        schemas: [
          {
            name: 'default',
            tables: [
              {
                columns: [
                  {
                    name: 'id',
                    nullable: false,
                    type: {
                      _type: 'Integer',
                    },
                  },
                  {
                    name: 'legal_name',
                    nullable: true,
                    type: {
                      _type: 'Varchar',
                      size: 200,
                    },
                  },
                ],
                name: 'FirmTable',
                primaryKey: ['id'],
              },
              {
                columns: [
                  {
                    name: 'id',
                    nullable: false,
                    type: {
                      _type: 'Integer',
                    },
                  },
                  {
                    name: 'firm_id',
                    nullable: true,
                    type: {
                      _type: 'Integer',
                    },
                  },
                  {
                    name: 'firstName',
                    nullable: true,
                    type: {
                      _type: 'Varchar',
                      size: 200,
                    },
                  },
                  {
                    name: 'lastName',
                    nullable: true,
                    type: {
                      _type: 'Varchar',
                      size: 200,
                    },
                  },
                ],
                name: 'PersonTable',
                primaryKey: ['id'],
              },
            ],
            views: [],
          },
        ],
      },
      classifierPath: 'meta::relational::metamodel::Database',
    },
    {
      path: 'entity::store::LegalEntityDatabase',
      content: {
        _type: 'relational',
        filters: [],
        includedStores: [],
        joins: [],
        name: 'LegalEntityDatabase',
        package: 'entity::store',
        schemas: [
          {
            name: 'LEGAL_ENTITY_SCHEMA',
            tables: [
              {
                columns: [
                  {
                    name: 'LEGAL_ENTITY_ID',
                    nullable: false,
                    type: {
                      _type: 'Varchar',
                      size: 100,
                    },
                  },
                  {
                    name: 'LEGAL_NAME',
                    nullable: true,
                    type: {
                      _type: 'Varchar',
                      size: 100,
                    },
                  },
                ],
                name: 'LEGAL_ENTITY_TABLE',
                primaryKey: ['LEGAL_ENTITY_ID'],
              },
            ],
            views: [],
          },
        ],
      },
      classifierPath: 'meta::relational::metamodel::Database',
    },
    {
      path: 'trade::mapping::TradeMapping',
      content: {
        _type: 'mapping',
        associationMappings: [
          {
            _type: 'xStore',
            association: 'trade::model::Trade_LegalEntity',
            propertyMappings: [
              {
                _type: 'xStorePropertyMapping',
                crossExpression: {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'equal',
                      parameters: [
                        {
                          _type: 'property',
                          property: 'clientIdentifier',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                            },
                          ],
                        },
                        {
                          _type: 'property',
                          property: 'identifier',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'that',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
                property: {
                  class: 'trade::model::Trade_LegalEntity',
                  property: 'client',
                },
                source: 'trade',
                target: 'legal_entity',
              },
              {
                _type: 'xStorePropertyMapping',
                crossExpression: {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'func',
                      function: 'equal',
                      parameters: [
                        {
                          _type: 'property',
                          property: 'identifier',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'this',
                            },
                          ],
                        },
                        {
                          _type: 'property',
                          property: 'clientIdentifier',
                          parameters: [
                            {
                              _type: 'var',
                              name: 'that',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                  parameters: [],
                },
                property: {
                  class: 'trade::model::Trade_LegalEntity',
                  property: 'trades',
                },
                source: 'legal_entity',
                target: 'trade',
              },
            ],
            stores: [],
          },
        ],
        classMappings: [
          {
            _type: 'relational',
            class: 'trade::model::Trade',
            distinct: false,
            id: 'trade',
            mainTable: {
              _type: 'Table',
              database: 'trade::store::TradeDatabase',
              mainTableDb: 'trade::store::TradeDatabase',
              schema: 'TRADE_SCHEMA',
              table: 'TRADE_TABLE',
            },
            primaryKey: [
              {
                _type: 'column',
                column: 'TICKER',
                table: {
                  _type: 'Table',
                  database: 'trade::store::TradeDatabase',
                  mainTableDb: 'trade::store::TradeDatabase',
                  schema: 'TRADE_SCHEMA',
                  table: 'TRADE_TABLE',
                },
                tableAlias: 'TRADE_TABLE',
              },
              {
                _type: 'column',
                column: 'QUANTITY',
                table: {
                  _type: 'Table',
                  database: 'trade::store::TradeDatabase',
                  mainTableDb: 'trade::store::TradeDatabase',
                  schema: 'TRADE_SCHEMA',
                  table: 'TRADE_TABLE',
                },
                tableAlias: 'TRADE_TABLE',
              },
              {
                _type: 'column',
                column: 'CLIENT_IDENTIFIER',
                table: {
                  _type: 'Table',
                  database: 'trade::store::TradeDatabase',
                  mainTableDb: 'trade::store::TradeDatabase',
                  schema: 'TRADE_SCHEMA',
                  table: 'TRADE_TABLE',
                },
                tableAlias: 'TRADE_TABLE',
              },
            ],
            propertyMappings: [
              {
                _type: 'relationalPropertyMapping',
                property: {
                  class: 'trade::model::Trade',
                  property: 'ticker',
                },
                relationalOperation: {
                  _type: 'column',
                  column: 'TICKER',
                  table: {
                    _type: 'Table',
                    database: 'trade::store::TradeDatabase',
                    mainTableDb: 'trade::store::TradeDatabase',
                    schema: 'TRADE_SCHEMA',
                    table: 'TRADE_TABLE',
                  },
                  tableAlias: 'TRADE_TABLE',
                },
                source: 'trade',
              },
              {
                _type: 'relationalPropertyMapping',
                property: {
                  class: 'trade::model::Trade',
                  property: 'quantity',
                },
                relationalOperation: {
                  _type: 'column',
                  column: 'QUANTITY',
                  table: {
                    _type: 'Table',
                    database: 'trade::store::TradeDatabase',
                    mainTableDb: 'trade::store::TradeDatabase',
                    schema: 'TRADE_SCHEMA',
                    table: 'TRADE_TABLE',
                  },
                  tableAlias: 'TRADE_TABLE',
                },
                source: 'trade',
              },
              {
                _type: 'relationalPropertyMapping',
                localMappingProperty: {
                  multiplicity: {
                    lowerBound: 1,
                    upperBound: 1,
                  },
                  type: 'String',
                },
                property: {
                  property: 'clientIdentifier',
                },
                relationalOperation: {
                  _type: 'column',
                  column: 'CLIENT_IDENTIFIER',
                  table: {
                    _type: 'Table',
                    database: 'trade::store::TradeDatabase',
                    mainTableDb: 'trade::store::TradeDatabase',
                    schema: 'TRADE_SCHEMA',
                    table: 'TRADE_TABLE',
                  },
                  tableAlias: 'TRADE_TABLE',
                },
                source: 'trade',
              },
            ],
            root: true,
          },
        ],
        enumerationMappings: [],
        includedMappings: [
          {
            _type: 'mappingIncludeDataSpace',
            includedDataSpace: 'entity::dataspace::LegalEntityDataSpace',
          },
        ],
        name: 'TradeMapping',
        package: 'trade::mapping',
        tests: [],
      },
      classifierPath: 'meta::pure::mapping::Mapping',
    },
    {
      path: 'execution::RelationalMapping',
      content: {
        _type: 'mapping',
        classMappings: [
          {
            _type: 'relational',
            class: 'model::Person',
            distinct: false,
            mainTable: {
              _type: 'Table',
              database: 'store::TestDB',
              mainTableDb: 'store::TestDB',
              schema: 'default',
              table: 'PersonTable',
            },
            primaryKey: [
              {
                _type: 'column',
                column: 'id',
                table: {
                  _type: 'Table',
                  database: 'store::TestDB',
                  mainTableDb: 'store::TestDB',
                  schema: 'default',
                  table: 'PersonTable',
                },
                tableAlias: 'PersonTable',
              },
            ],
            propertyMappings: [
              {
                _type: 'relationalPropertyMapping',
                property: {
                  class: 'model::Person',
                  property: 'firstName',
                },
                relationalOperation: {
                  _type: 'column',
                  column: 'firstName',
                  table: {
                    _type: 'Table',
                    database: 'store::TestDB',
                    mainTableDb: 'store::TestDB',
                    schema: 'default',
                    table: 'PersonTable',
                  },
                  tableAlias: 'PersonTable',
                },
              },
              {
                _type: 'relationalPropertyMapping',
                property: {
                  class: 'model::Person',
                  property: 'lastName',
                },
                relationalOperation: {
                  _type: 'column',
                  column: 'lastName',
                  table: {
                    _type: 'Table',
                    database: 'store::TestDB',
                    mainTableDb: 'store::TestDB',
                    schema: 'default',
                    table: 'PersonTable',
                  },
                  tableAlias: 'PersonTable',
                },
              },
            ],
            root: true,
          },
          {
            _type: 'relational',
            class: 'model::Firm',
            distinct: false,
            mainTable: {
              _type: 'Table',
              database: 'store::TestDB',
              mainTableDb: 'store::TestDB',
              schema: 'default',
              table: 'FirmTable',
            },
            primaryKey: [
              {
                _type: 'column',
                column: 'id',
                table: {
                  _type: 'Table',
                  database: 'store::TestDB',
                  mainTableDb: 'store::TestDB',
                  schema: 'default',
                  table: 'FirmTable',
                },
                tableAlias: 'FirmTable',
              },
            ],
            propertyMappings: [
              {
                _type: 'relationalPropertyMapping',
                property: {
                  class: 'model::Firm',
                  property: 'legalName',
                },
                relationalOperation: {
                  _type: 'column',
                  column: 'legal_name',
                  table: {
                    _type: 'Table',
                    database: 'store::TestDB',
                    mainTableDb: 'store::TestDB',
                    schema: 'default',
                    table: 'FirmTable',
                  },
                  tableAlias: 'FirmTable',
                },
              },
              {
                _type: 'relationalPropertyMapping',
                property: {
                  class: 'model::Firm',
                  property: 'employees',
                },
                relationalOperation: {
                  _type: 'elemtWithJoins',
                  joins: [
                    {
                      db: 'store::TestDB',
                      name: 'FirmPerson',
                    },
                  ],
                },
                target: 'model_Person',
              },
            ],
            root: true,
          },
        ],
        enumerationMappings: [],
        includedMappings: [],
        name: 'RelationalMapping',
        package: 'execution',
        tests: [],
      },
      classifierPath: 'meta::pure::mapping::Mapping',
    },
    {
      path: 'entity::mapping::LegalEntityMapping',
      content: {
        _type: 'mapping',
        classMappings: [
          {
            _type: 'relational',
            class: 'entity::model::LegalEntity',
            distinct: false,
            id: 'legal_entity',
            mainTable: {
              _type: 'Table',
              database: 'entity::store::LegalEntityDatabase',
              mainTableDb: 'entity::store::LegalEntityDatabase',
              schema: 'LEGAL_ENTITY_SCHEMA',
              table: 'LEGAL_ENTITY_TABLE',
            },
            primaryKey: [
              {
                _type: 'column',
                column: 'LEGAL_ENTITY_ID',
                table: {
                  _type: 'Table',
                  database: 'entity::store::LegalEntityDatabase',
                  mainTableDb: 'entity::store::LegalEntityDatabase',
                  schema: 'LEGAL_ENTITY_SCHEMA',
                  table: 'LEGAL_ENTITY_TABLE',
                },
                tableAlias: 'LEGAL_ENTITY_TABLE',
              },
            ],
            propertyMappings: [
              {
                _type: 'relationalPropertyMapping',
                property: {
                  class: 'entity::model::LegalEntity',
                  property: 'identifier',
                },
                relationalOperation: {
                  _type: 'column',
                  column: 'LEGAL_ENTITY_ID',
                  table: {
                    _type: 'Table',
                    database: 'entity::store::LegalEntityDatabase',
                    mainTableDb: 'entity::store::LegalEntityDatabase',
                    schema: 'LEGAL_ENTITY_SCHEMA',
                    table: 'LEGAL_ENTITY_TABLE',
                  },
                  tableAlias: 'LEGAL_ENTITY_TABLE',
                },
                source: 'legal_entity',
              },
              {
                _type: 'relationalPropertyMapping',
                property: {
                  class: 'entity::model::LegalEntity',
                  property: 'legalName',
                },
                relationalOperation: {
                  _type: 'column',
                  column: 'LEGAL_NAME',
                  table: {
                    _type: 'Table',
                    database: 'entity::store::LegalEntityDatabase',
                    mainTableDb: 'entity::store::LegalEntityDatabase',
                    schema: 'LEGAL_ENTITY_SCHEMA',
                    table: 'LEGAL_ENTITY_TABLE',
                  },
                  tableAlias: 'LEGAL_ENTITY_TABLE',
                },
                source: 'legal_entity',
              },
            ],
            root: true,
          },
        ],
        enumerationMappings: [],
        includedMappings: [],
        name: 'LegalEntityMapping',
        package: 'entity::mapping',
        tests: [],
      },
      classifierPath: 'meta::pure::mapping::Mapping',
    },
    {
      path: 'service::SimpleRelationalServiceWithFunctionParameterValidationExecutionNode',
      content: {
        _type: 'service',
        autoActivateUpdates: true,
        documentation: '',
        execution: {
          _type: 'pureSingleExecution',
          func: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'project',
                parameters: [
                  {
                    _type: 'func',
                    function: 'filter',
                    parameters: [
                      {
                        _type: 'func',
                        function: 'getAll',
                        parameters: [
                          {
                            _type: 'packageableElementPtr',
                            fullPath: 'model::Firm',
                          },
                        ],
                      },
                      {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'func',
                            function: 'exists',
                            parameters: [
                              {
                                _type: 'property',
                                property: 'employees',
                                parameters: [
                                  {
                                    _type: 'var',
                                    name: 'x',
                                  },
                                ],
                              },
                              {
                                _type: 'lambda',
                                body: [
                                  {
                                    _type: 'func',
                                    function: 'equal',
                                    parameters: [
                                      {
                                        _type: 'property',
                                        property: 'firstName',
                                        parameters: [
                                          {
                                            _type: 'var',
                                            name: 'x_1',
                                          },
                                        ],
                                      },
                                      {
                                        _type: 'var',
                                        name: 'employeeNames',
                                      },
                                    ],
                                  },
                                ],
                                parameters: [
                                  {
                                    _type: 'var',
                                    name: 'x_1',
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    _type: 'collection',
                    multiplicity: {
                      lowerBound: 3,
                      upperBound: 3,
                    },
                    values: [
                      {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'property',
                            property: 'firstName',
                            parameters: [
                              {
                                _type: 'property',
                                property: 'employees',
                                parameters: [
                                  {
                                    _type: 'var',
                                    name: 'x',
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                      },
                      {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'property',
                            property: 'lastName',
                            parameters: [
                              {
                                _type: 'property',
                                property: 'employees',
                                parameters: [
                                  {
                                    _type: 'var',
                                    name: 'x',
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                      },
                      {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'property',
                            property: 'legalName',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'x',
                              },
                            ],
                          },
                        ],
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    _type: 'collection',
                    multiplicity: {
                      lowerBound: 3,
                      upperBound: 3,
                    },
                    values: [
                      {
                        _type: 'string',
                        value: 'Employees/First Name',
                      },
                      {
                        _type: 'string',
                        value: 'Employees/Last Name',
                      },
                      {
                        _type: 'string',
                        value: 'Legal Name',
                      },
                    ],
                  },
                ],
              },
            ],
            parameters: [
              {
                _type: 'var',
                name: 'employeeNames',
                multiplicity: {
                  lowerBound: 1,
                  upperBound: 1,
                },
                class: 'String',
              },
            ],
          },
          mapping: 'execution::RelationalMapping',
          runtime: {
            _type: 'runtimePointer',
            runtime: 'execution::Runtime',
          },
        },
        name: 'SimpleRelationalServiceWithFunctionParameterValidationExecutionNode',
        owners: [],
        package: 'service',
        pattern: '/d2c48a9c-70fa-46e3-8173-c355e774004f',
      },
      classifierPath: 'meta::legend::service::metamodel::Service',
    },
    {
      path: 'trade::service::TradeService',
      content: {
        _type: 'service',
        autoActivateUpdates: true,
        documentation: '',
        execution: {
          _type: 'pureSingleExecution',
          func: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'serialize',
                parameters: [
                  {
                    _type: 'func',
                    function: 'graphFetch',
                    parameters: [
                      {
                        _type: 'func',
                        function: 'getAll',
                        parameters: [
                          {
                            _type: 'packageableElementPtr',
                            fullPath: 'trade::model::Trade',
                          },
                        ],
                      },
                      {
                        _type: 'classInstance',
                        type: 'rootGraphFetchTree',
                        value: {
                          subTrees: [
                            {
                              _type: 'propertyGraphFetchTree',
                              subTrees: [],
                              subTypeTrees: [],
                              property: 'quantity',
                              parameters: [],
                            },
                            {
                              _type: 'propertyGraphFetchTree',
                              subTrees: [],
                              subTypeTrees: [],
                              property: 'ticker',
                              parameters: [],
                            },
                            {
                              _type: 'propertyGraphFetchTree',
                              subTrees: [
                                {
                                  _type: 'propertyGraphFetchTree',
                                  subTrees: [],
                                  subTypeTrees: [],
                                  property: 'legalName',
                                  parameters: [],
                                },
                                {
                                  _type: 'propertyGraphFetchTree',
                                  subTrees: [],
                                  subTypeTrees: [],
                                  property: 'identifier',
                                  parameters: [],
                                },
                              ],
                              subTypeTrees: [],
                              property: 'client',
                              parameters: [],
                            },
                          ],
                          subTypeTrees: [],
                          _type: 'rootGraphFetchTree',
                          class: 'trade::model::Trade',
                        },
                      },
                    ],
                  },
                  {
                    _type: 'classInstance',
                    type: 'rootGraphFetchTree',
                    value: {
                      subTrees: [
                        {
                          _type: 'propertyGraphFetchTree',
                          subTrees: [],
                          subTypeTrees: [],
                          property: 'quantity',
                          parameters: [],
                        },
                        {
                          _type: 'propertyGraphFetchTree',
                          subTrees: [],
                          subTypeTrees: [],
                          property: 'ticker',
                          parameters: [],
                        },
                        {
                          _type: 'propertyGraphFetchTree',
                          subTrees: [
                            {
                              _type: 'propertyGraphFetchTree',
                              subTrees: [],
                              subTypeTrees: [],
                              property: 'legalName',
                              parameters: [],
                            },
                            {
                              _type: 'propertyGraphFetchTree',
                              subTrees: [],
                              subTypeTrees: [],
                              property: 'identifier',
                              parameters: [],
                            },
                          ],
                          subTypeTrees: [],
                          property: 'client',
                          parameters: [],
                        },
                      ],
                      subTypeTrees: [],
                      _type: 'rootGraphFetchTree',
                      class: 'trade::model::Trade',
                    },
                  },
                ],
              },
            ],
            parameters: [],
          },
          mapping: 'trade::mapping::TradeMapping',
          runtime: {
            _type: 'runtimePointer',
            runtime: 'trade::runtime::TradeRuntime',
          },
        },
        name: 'TradeService',
        owners: ['anonymous'],
        package: 'trade::service',
        pattern: '/aeadc3bd-27ac-46ae-8989-073ea134aceb',
        testSuites: [
          {
            _type: 'serviceTestSuite',
            id: 'testSuite_1',
            testData: {
              connectionsTestData: [
                {
                  data: {
                    _type: 'relationalCSVData',
                    tables: [
                      {
                        schema: 'LEGAL_ENTITY_SCHEMA',
                        table: 'LEGAL_ENTITY_TABLE',
                        values: 'LEGAL_ENTITY_ID,LEGAL_NAME\n1,Tesla\n',
                      },
                    ],
                  },
                  id: 'connection_2',
                },
                {
                  data: {
                    _type: 'relationalCSVData',
                    tables: [
                      {
                        schema: 'TRADE_SCHEMA',
                        table: 'TRADE_TABLE',
                        values:
                          'TICKER,QUANTITY,CLIENT_IDENTIFIER\nAPPL,10,1\n',
                      },
                    ],
                  },
                  id: 'connection_1',
                },
              ],
            },
            tests: [
              {
                _type: 'serviceTest',
                assertions: [
                  {
                    _type: 'equalToJson',
                    expected: {
                      _type: 'externalFormat',
                      contentType: 'application/json',
                      data: '{\n  "quantity": 10,\n  "ticker": "APPL",\n  "client": {\n    "legalName": "Tesla",\n    "identifier": "1"\n  }\n}',
                    },
                    id: 'assertion_1',
                  },
                ],
                id: 'test_1',
                keys: [],
                serializationFormat: 'PURE',
              },
            ],
          },
        ],
      },
      classifierPath: 'meta::legend::service::metamodel::Service',
    },
    {
      path: 'service::GRAPH',
      content: {
        _type: 'service',
        autoActivateUpdates: true,
        documentation: '',
        execution: {
          _type: 'pureSingleExecution',
          func: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'serialize',
                parameters: [
                  {
                    _type: 'func',
                    function: 'graphFetch',
                    parameters: [
                      {
                        _type: 'func',
                        function: 'getAll',
                        parameters: [
                          {
                            _type: 'packageableElementPtr',
                            fullPath: 'model::Firm',
                          },
                        ],
                      },
                      {
                        _type: 'classInstance',
                        type: 'rootGraphFetchTree',
                        value: {
                          subTrees: [
                            {
                              _type: 'propertyGraphFetchTree',
                              subTrees: [],
                              subTypeTrees: [],
                              property: 'legalName',
                              parameters: [],
                            },
                            {
                              _type: 'propertyGraphFetchTree',
                              subTrees: [
                                {
                                  _type: 'propertyGraphFetchTree',
                                  subTrees: [],
                                  subTypeTrees: [],
                                  property: 'firstName',
                                  parameters: [],
                                },
                              ],
                              subTypeTrees: [],
                              property: 'employees',
                              parameters: [],
                            },
                          ],
                          subTypeTrees: [],
                          _type: 'rootGraphFetchTree',
                          class: 'model::Firm',
                        },
                      },
                    ],
                  },
                  {
                    _type: 'classInstance',
                    type: 'rootGraphFetchTree',
                    value: {
                      subTrees: [
                        {
                          _type: 'propertyGraphFetchTree',
                          subTrees: [],
                          subTypeTrees: [],
                          property: 'legalName',
                          parameters: [],
                        },
                        {
                          _type: 'propertyGraphFetchTree',
                          subTrees: [
                            {
                              _type: 'propertyGraphFetchTree',
                              subTrees: [],
                              subTypeTrees: [],
                              property: 'firstName',
                              parameters: [],
                            },
                          ],
                          subTypeTrees: [],
                          property: 'employees',
                          parameters: [],
                        },
                      ],
                      subTypeTrees: [],
                      _type: 'rootGraphFetchTree',
                      class: 'model::Firm',
                    },
                  },
                ],
              },
            ],
            parameters: [],
          },
          mapping: 'execution::RelationalMapping',
          runtime: {
            _type: 'runtimePointer',
            runtime: 'execution::Runtime',
          },
        },
        name: 'GRAPH',
        owners: ['bhorep'],
        package: 'service',
        pattern: '/15833c56-537c-4985-9592-58caeaf576e0',
      },
      classifierPath: 'meta::legend::service::metamodel::Service',
    },
    {
      path: 'service::SimpleRelationalServiceWithAllocationAndSequenceNode',
      content: {
        _type: 'service',
        autoActivateUpdates: true,
        documentation: '',
        execution: {
          _type: 'pureSingleExecution',
          func: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'letFunction',
                parameters: [
                  {
                    _type: 'string',
                    value: 'legalName',
                  },
                  {
                    _type: 'string',
                    value: 'FirmA',
                  },
                ],
              },
              {
                _type: 'func',
                function: 'project',
                parameters: [
                  {
                    _type: 'func',
                    function: 'filter',
                    parameters: [
                      {
                        _type: 'func',
                        function: 'getAll',
                        parameters: [
                          {
                            _type: 'packageableElementPtr',
                            fullPath: 'model::Firm',
                          },
                        ],
                      },
                      {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'func',
                            function: 'equal',
                            parameters: [
                              {
                                _type: 'property',
                                property: 'legalName',
                                parameters: [
                                  {
                                    _type: 'var',
                                    name: 'x',
                                  },
                                ],
                              },
                              {
                                _type: 'var',
                                name: 'legalName',
                              },
                            ],
                          },
                        ],
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    _type: 'collection',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    values: [
                      {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'property',
                            property: 'legalName',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'x',
                              },
                            ],
                          },
                        ],
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    _type: 'collection',
                    multiplicity: {
                      lowerBound: 1,
                      upperBound: 1,
                    },
                    values: [
                      {
                        _type: 'string',
                        value: 'Legal Name',
                      },
                    ],
                  },
                ],
              },
            ],
            parameters: [],
          },
          mapping: 'execution::RelationalMapping',
          runtime: {
            _type: 'runtimePointer',
            runtime: 'execution::Runtime',
          },
        },
        name: 'SimpleRelationalServiceWithAllocationAndSequenceNode',
        owners: [],
        package: 'service',
        pattern: '/d2c48a9c-70fa-46e3-8173-c355e774004f',
        testSuites: [
          {
            _type: 'serviceTestSuite',
            id: 'testSuite1',
            testData: {
              connectionsTestData: [
                {
                  data: {
                    _type: 'relationalCSVData',
                    tables: [
                      {
                        schema: 'default',
                        table: 'PersonTable',
                        values:
                          'id,firm_id,firstName,lastName\n1,1,John,Doe\n2,1,Nicole,Smith\n3,2,Time,Smith\n',
                      },
                      {
                        schema: 'default',
                        table: 'FirmTable',
                        values: 'id,legal_name\n1,Finos\n2,Apple\n',
                      },
                    ],
                  },
                  id: 'connection_1',
                },
              ],
            },
            tests: [
              {
                _type: 'serviceTest',
                assertions: [
                  {
                    _type: 'equalToJson',
                    expected: {
                      _type: 'externalFormat',
                      contentType: 'application/json',
                      data: '[\n  {\n    "Employees/First Name": "John",\n    "Employees/Last Name": "Doe",\n    "Legal Name": "Finos"\n  },\n  {\n    "Employees/First Name": "Nicole",\n    "Employees/Last Name": "Smith",\n    "Legal Name": "Finos"\n  },\n  {\n    "Employees/First Name": "Time",\n    "Employees/Last Name": "Smith",\n    "Legal Name": "Apple"\n  }\n]',
                    },
                    id: 'shouldPass',
                  },
                ],
                id: 'test1',
                keys: [],
                parameters: [
                  {
                    name: 'var_1',
                    value: {
                      _type: 'strictDate',
                      sourceInformation: {
                        sourceId: '',
                        startLine: 55,
                        startColumn: 21,
                        endLine: 55,
                        endColumn: 31,
                      },
                      value: '2022-08-12',
                    },
                  },
                ],
                serializationFormat: 'PURE_TDSOBJECT',
              },
            ],
          },
        ],
      },
      classifierPath: 'meta::legend::service::metamodel::Service',
    },
    {
      path: 'service::SimpleRelationalServiceWithSQLExecutionNode',
      content: {
        _type: 'service',
        autoActivateUpdates: true,
        documentation: '',
        execution: {
          _type: 'pureSingleExecution',
          func: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'project',
                parameters: [
                  {
                    _type: 'func',
                    function: 'getAll',
                    parameters: [
                      {
                        _type: 'packageableElementPtr',
                        fullPath: 'model::Firm',
                      },
                    ],
                  },
                  {
                    _type: 'collection',
                    multiplicity: {
                      lowerBound: 3,
                      upperBound: 3,
                    },
                    values: [
                      {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'property',
                            property: 'firstName',
                            parameters: [
                              {
                                _type: 'property',
                                property: 'employees',
                                parameters: [
                                  {
                                    _type: 'var',
                                    name: 'x',
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                      },
                      {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'property',
                            property: 'lastName',
                            parameters: [
                              {
                                _type: 'property',
                                property: 'employees',
                                parameters: [
                                  {
                                    _type: 'var',
                                    name: 'x',
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                      },
                      {
                        _type: 'lambda',
                        body: [
                          {
                            _type: 'property',
                            property: 'legalName',
                            parameters: [
                              {
                                _type: 'var',
                                name: 'x',
                              },
                            ],
                          },
                        ],
                        parameters: [
                          {
                            _type: 'var',
                            name: 'x',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    _type: 'collection',
                    multiplicity: {
                      lowerBound: 3,
                      upperBound: 3,
                    },
                    values: [
                      {
                        _type: 'string',
                        value: 'Employees/First Name',
                      },
                      {
                        _type: 'string',
                        value: 'Employees/Last Name',
                      },
                      {
                        _type: 'string',
                        value: 'Legal Name',
                      },
                    ],
                  },
                ],
              },
            ],
            parameters: [],
          },
          mapping: 'execution::RelationalMapping',
          runtime: {
            _type: 'runtimePointer',
            runtime: 'execution::Runtime',
          },
        },
        name: 'SimpleRelationalServiceWithSQLExecutionNode',
        owners: [],
        package: 'service',
        pattern: '/d2c48a9c-70fa-46e3-8173-c355e774004f',
        testSuites: [
          {
            _type: 'serviceTestSuite',
            id: 'testSuite1',
            testData: {
              connectionsTestData: [
                {
                  data: {
                    _type: 'relationalCSVData',
                    tables: [
                      {
                        schema: 'default',
                        table: 'PersonTable',
                        values:
                          'id,firm_id,firstName,lastName\n1,1,John,Doe\n2,1,Nicole,Smith\n3,2,Time,Smith\n',
                      },
                      {
                        schema: 'default',
                        table: 'FirmTable',
                        values: 'id,legal_name\n1,Finos\n2,Apple\n',
                      },
                    ],
                  },
                  id: 'connection_1',
                },
              ],
            },
            tests: [
              {
                _type: 'serviceTest',
                assertions: [
                  {
                    _type: 'equalToJson',
                    expected: {
                      _type: 'externalFormat',
                      contentType: 'application/json',
                      data: '[\n  {\n    "Employees/First Name": "John",\n    "Employees/Last Name": "Doe",\n    "Legal Name": "Finos"\n  },\n  {\n    "Employees/First Name": "Nicole",\n    "Employees/Last Name": "Smith",\n    "Legal Name": "Finos"\n  },\n  {\n    "Employees/First Name": "Time",\n    "Employees/Last Name": "Smith",\n    "Legal Name": "Apple"\n  }\n]',
                    },
                    id: 'shouldPass',
                  },
                ],
                id: 'test1',
                keys: [],
                parameters: [
                  {
                    name: 'var_1',
                    value: {
                      _type: 'strictDate',
                      sourceInformation: {
                        sourceId: '',
                        startLine: 55,
                        startColumn: 21,
                        endLine: 55,
                        endColumn: 31,
                      },
                      value: '2022-08-12',
                    },
                  },
                ],
                serializationFormat: 'PURE_TDSOBJECT',
              },
            ],
          },
        ],
      },
      classifierPath: 'meta::legend::service::metamodel::Service',
    },
    {
      path: 'execution::Runtime',
      content: {
        _type: 'runtime',
        name: 'Runtime',
        package: 'execution',
        runtimeValue: {
          _type: 'engineRuntime',
          connections: [
            {
              store: {
                path: 'store::TestDB',
                type: 'STORE',
              },
              storeConnections: [
                {
                  connection: {
                    _type: 'connectionPointer',
                    connection: 'model::MyConnection',
                  },
                  id: 'connection_1',
                },
              ],
            },
          ],
          mappings: [
            {
              path: 'execution::RelationalMapping',
              type: 'MAPPING',
            },
          ],
        },
      },
      classifierPath: 'meta::pure::runtime::PackageableRuntime',
    },
    {
      path: 'trade::runtime::TradeRuntime',
      content: {
        _type: 'runtime',
        name: 'TradeRuntime',
        package: 'trade::runtime',
        runtimeValue: {
          _type: 'engineRuntime',
          connections: [
            {
              store: {
                path: 'trade::store::TradeDatabase',
                type: 'STORE',
              },
              storeConnections: [
                {
                  connection: {
                    _type: 'RelationalDatabaseConnection',
                    authenticationStrategy: {
                      _type: 'h2Default',
                    },
                    databaseType: 'H2',
                    datasourceSpecification: {
                      _type: 'h2Local',
                    },
                    element: 'trade::store::TradeDatabase',
                    type: 'H2',
                  },
                  id: 'connection_1',
                },
              ],
            },
            {
              store: {
                path: 'entity::store::LegalEntityDatabase',
                type: 'STORE',
              },
              storeConnections: [
                {
                  connection: {
                    _type: 'RelationalDatabaseConnection',
                    authenticationStrategy: {
                      _type: 'h2Default',
                    },
                    databaseType: 'H2',
                    datasourceSpecification: {
                      _type: 'h2Local',
                    },
                    element: 'entity::store::LegalEntityDatabase',
                    type: 'H2',
                  },
                  id: 'connection_2',
                },
              ],
            },
          ],
          mappings: [
            {
              path: 'trade::mapping::TradeMapping',
              type: 'MAPPING',
            },
          ],
        },
      },
      classifierPath: 'meta::pure::runtime::PackageableRuntime',
    },
    {
      path: 'entity::runtime::LegalEntityRuntime',
      content: {
        _type: 'runtime',
        name: 'LegalEntityRuntime',
        package: 'entity::runtime',
        runtimeValue: {
          _type: 'engineRuntime',
          connections: [
            {
              store: {
                path: 'entity::store::LegalEntityDatabase',
                type: 'STORE',
              },
              storeConnections: [
                {
                  connection: {
                    _type: 'RelationalDatabaseConnection',
                    authenticationStrategy: {
                      _type: 'h2Default',
                    },
                    databaseType: 'H2',
                    datasourceSpecification: {
                      _type: 'h2Local',
                    },
                    element: 'entity::store::LegalEntityDatabase',
                    type: 'H2',
                  },
                  id: 'connection_1',
                },
              ],
            },
          ],
          mappings: [
            {
              path: 'entity::mapping::LegalEntityMapping',
              type: 'MAPPING',
            },
          ],
        },
      },
      classifierPath: 'meta::pure::runtime::PackageableRuntime',
    },
    {
      path: 'model::MyConnection',
      content: {
        _type: 'connection',
        connectionValue: {
          _type: 'RelationalDatabaseConnection',
          authenticationStrategy: {
            _type: 'h2Default',
          },
          databaseType: 'H2',
          datasourceSpecification: {
            _type: 'h2Local',
            testDataSetupSqls: [
              "Drop table if exists FirmTable;\nDrop table if exists PersonTable;\nCreate Table FirmTable(id INT, Legal_Name VARCHAR(200));\nCreate Table PersonTable(id INT, firm_id INT, lastName VARCHAR(200), firstName VARCHAR(200));\nInsert into FirmTable (id, Legal_Name) values (1, 'FirmA');\nInsert into FirmTable (id, Legal_Name) values (2, 'Apple');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (1, 1, 'John', 'Doe');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (2, 2, 'Tim', 'Smith');\nInsert into PersonTable (id, firm_id, lastName, firstName) values (3, 3, 'Nicole', 'Doe');\n\n",
            ],
          },
          element: 'store::TestDB',
          type: 'H2',
        },
        name: 'MyConnection',
        package: 'model',
      },
      classifierPath: 'meta::pure::runtime::PackageableConnection',
    },
    {
      path: 'data::RelationalData',
      content: {
        _type: 'dataElement',
        data: {
          _type: 'relationalCSVData',
          tables: [
            {
              schema: 'default',
              table: 'PersonTable',
              values:
                'id,firm_id,firstName,lastName\n1,1,John,Doe\n2,1,Nicole,Smith\n3,2,Time,Smith\n',
            },
            {
              schema: 'default',
              table: 'FirmTable',
              values: 'id,legal_name\n1,Finos\n2,Apple\n',
            },
          ],
        },
        name: 'RelationalData',
        package: 'data',
      },
      classifierPath: 'meta::pure::data::DataElement',
    },
    {
      path: 'entity::dataspace::LegalEntityDataSpace',
      content: {
        _type: 'dataSpace',
        defaultExecutionContext: 'default',
        executionContexts: [
          {
            defaultRuntime: {
              path: 'entity::runtime::LegalEntityRuntime',
              type: 'RUNTIME',
            },
            mapping: {
              path: 'entity::mapping::LegalEntityMapping',
              type: 'MAPPING',
            },
            name: 'default',
          },
        ],
        name: 'LegalEntityDataSpace',
        package: 'entity::dataspace',
      },
      classifierPath: 'meta::pure::metamodel::dataSpace::DataSpace',
    },
  ],
};
