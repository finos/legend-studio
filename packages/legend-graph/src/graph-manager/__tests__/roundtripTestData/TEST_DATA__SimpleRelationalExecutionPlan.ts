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

export const TEST_DATA__simpleRelationalExecutionPlan = {
  plan: {
    _type: 'simple',
    authDependent: false,
    globalImplementationSupport: {
      _type: 'java',
      classes: [
        {
          name: 'Firm',
          package: '_pure.app.model',
          source:
            'package _pure.app.model;\n\nimport java.math.*;\nimport java.util.*;\nimport org.finos.legend.engine.plan.dependencies.domain.date.PureDate;\n\npublic interface Firm extends LegalEntity, org.finos.legend.engine.plan.dependencies.store.shared.IReferencedObject\n{\n    default String typeName$()\n    {\n        return "Firm";\n    }\n\n    default String typePath$()\n    {\n        return "model::Firm";\n    }\n\n    IncType getIncType();\n    String getAlloyStoreObjectReference$();\n}',
        },
        {
          name: 'IncType',
          package: '_pure.app.model',
          source:
            'package _pure.app.model;\n\npublic enum IncType\n{\n    Corp,\n    LLC;\n\n    public String getName()\n    {\n        return this.name();\n    }\n\n    public static IncType getEnumFromPureName(String pureName)\n    {\n        return IncType.valueOf(pureName);\n    }\n}',
        },
        {
          name: 'LegalEntity',
          package: '_pure.app.model',
          source:
            'package _pure.app.model;\n\nimport java.math.*;\nimport java.util.*;\nimport org.finos.legend.engine.plan.dependencies.domain.date.PureDate;\n\npublic interface LegalEntity extends org.finos.legend.engine.plan.dependencies.store.shared.IReferencedObject\n{\n    default String typeName$()\n    {\n        return "LegalEntity";\n    }\n\n    default String typePath$()\n    {\n        return "model::LegalEntity";\n    }\n\n    String getLegalName();\n    String getAlloyStoreObjectReference$();\n}',
        },
        {
          name: 'Execute',
          package: '_pure.plan.root',
          source:
            'package _pure.plan.root;\n\nimport java.sql.ResultSet;\nimport java.util.*;\nimport org.finos.legend.engine.plan.dependencies.store.relational.classResult.IRelationalClassInstantiationNodeExecutor;\n\npublic class Execute implements IRelationalClassInstantiationNodeExecutor\n{\n    private Helper helper;\n\n    public Execute()\n    {\n        this.helper = new Helper();\n    }\n\n    public Object getObjectFromResultSet(ResultSet resultSet,\n                                         String databaseTimeZone,\n                                         String databaseConnection)\n    {\n        return this.helper.getObjectFromResultSet(resultSet, databaseTimeZone, databaseConnection);\n    }\n}',
        },
        {
          name: 'Firm_model_Firm_BaseImpl',
          package: '_pure.plan.root',
          source:
            'package _pure.plan.root;\n\nimport com.fasterxml.jackson.annotation.JsonIgnore;\nimport com.fasterxml.jackson.annotation.JsonInclude;\nimport com.fasterxml.jackson.annotation.JsonProperty;\nimport com.fasterxml.jackson.core.JsonGenerator;\nimport com.fasterxml.jackson.databind.JsonSerializer;\nimport com.fasterxml.jackson.databind.ObjectMapper;\nimport com.fasterxml.jackson.databind.SerializerProvider;\nimport com.fasterxml.jackson.databind.module.SimpleModule;\nimport java.io.IOException;\nimport java.util.*;\nimport org.finos.legend.engine.plan.dependencies.domain.date.PureDate;\n\npublic class Firm_model_Firm_BaseImpl implements _pure.app.model.Firm\n{\n    private _pure.app.model.IncType incType;\n    private String legalName;\n    private String setId$;\n    public static String databaseConnection$;\n    private static final ObjectMapper objectMapper$ = new ObjectMapper().setSerializationInclusion(JsonInclude.Include.NON_NULL).registerModule(new SimpleModule().addSerializer(PureDate.class, new JsonSerializer<PureDate>() { @Override public void serialize(PureDate value, JsonGenerator gen, SerializerProvider serializers) throws IOException { gen.writeRawValue("\\"" + value.toString() + "\\""); } }));\n    private String alloyStoreObjectReference$;\n    private Object pk$_0;\n\n    @JsonProperty("incType")\n    public _pure.app.model.IncType getIncType()\n    {\n        return this.incType;\n    }\n\n    public void setIncType(_pure.app.model.IncType incType)\n    {\n        this.incType = incType;\n    }\n\n    @JsonProperty("legalName")\n    public String getLegalName()\n    {\n        return this.legalName;\n    }\n\n    public void setLegalName(String legalName)\n    {\n        this.legalName = legalName;\n    }\n\n    @JsonIgnore\n    public String getSetId$()\n    {\n        return this.setId$;\n    }\n\n    public void setSetId$(String setId)\n    {\n        this.setId$ = setId;\n    }\n\n    @JsonProperty("alloyStoreObjectReference$")\n    public String getAlloyStoreObjectReference$()\n    {\n        if (this.alloyStoreObjectReference$ == null)\n        {\n            try\n            {\n                StringBuilder referenceBuilder = new StringBuilder();\n                referenceBuilder.append("001:");\n                referenceBuilder.append("010:");\n\n                referenceBuilder.append("0000000010:");\n                referenceBuilder.append("Relational:");\n\n                referenceBuilder.append("0000000017:");\n                referenceBuilder.append("model::NewMapping:");\n\n                referenceBuilder.append("0000000010:");\n                referenceBuilder.append("model_Firm:");\n\n                String setId = this.getSetId$();\n                referenceBuilder.append(String.format("%010d", setId.length()));\n                referenceBuilder.append(":");\n                referenceBuilder.append(setId);\n                referenceBuilder.append(":");\n\n                String databaseConnectionString = _pure.plan.root.Firm_model_Firm_BaseImpl.databaseConnection$;\n                referenceBuilder.append(String.format("%010d", databaseConnectionString.length()));\n                referenceBuilder.append(":");\n                referenceBuilder.append(databaseConnectionString);\n                referenceBuilder.append(":");\n\n                Map<String, Object> pkMap = new HashMap<>();\n\n                pkMap.put("pk$_0", this.getPk$_0());\n                String pkMapString = objectMapper$.writeValueAsString(pkMap);\n                referenceBuilder.append(String.format("%010d", pkMapString.length()));\n                referenceBuilder.append(":");\n                referenceBuilder.append(pkMapString);\n\n                this.alloyStoreObjectReference$ = "ASOR:" + org.apache.commons.codec.binary.Base64.encodeBase64URLSafeString(referenceBuilder.toString().getBytes());\n            }\n            catch (Exception e)\n            {\n               throw new RuntimeException(e);\n            }\n        }\n\n        return this.alloyStoreObjectReference$;\n    }\n\n    @JsonIgnore\n    public Object getPk$_0()\n    {\n        return this.pk$_0;\n    }\n\n    public void setPk$_0(Object pk$_0)\n    {\n        this.pk$_0 = pk$_0;\n    }\n}',
        },
        {
          name: 'Firm_model_Firm_Impl',
          package: '_pure.plan.root',
          source:
            'package _pure.plan.root;\n\nimport com.fasterxml.jackson.annotation.JsonIgnore;\nimport com.fasterxml.jackson.annotation.JsonProperty;\nimport java.util.*;\n\npublic class Firm_model_Firm_Impl extends Firm_model_Firm_BaseImpl implements _pure.app.model.Firm\n{\n    public Firm_model_Firm_Impl()\n    {\n        this.setSetId$("model_Firm");\n    }\n}',
        },
        {
          name: 'Helper',
          package: '_pure.plan.root',
          source:
            "package _pure.plan.root;\n\nimport java.sql.ResultSet;\nimport java.sql.ResultSetMetaData;\nimport java.sql.Types;\nimport java.util.*;\nimport java.util.function.*;\nimport java.util.stream.*;\nimport org.finos.legend.engine.plan.dependencies.domain.date.PureDate;\n\npublic class Helper\n{\n    private static final List<Integer> STRING_TYPES = Arrays.asList(Types.CHAR, Types.VARCHAR, Types.LONGVARCHAR, Types.NCHAR, Types.NVARCHAR, Types.LONGNVARCHAR, Types.OTHER, Types.NULL);\n    private static final List<Integer> INT_TYPES = Arrays.asList(Types.TINYINT, Types.SMALLINT, Types.INTEGER, Types.BIGINT, Types.NULL);\n    private static final List<Integer> FLOAT_TYPES = Arrays.asList(Types.REAL, Types.FLOAT, Types.DOUBLE, Types.DECIMAL, Types.NUMERIC, Types.NULL);\n    private static final List<Integer> DECIMAL_TYPES = Arrays.asList(Types.DECIMAL, Types.NUMERIC, Types.NULL);\n    private static final List<Integer> BOOL_TYPES = Arrays.asList(Types.BIT, Types.BOOLEAN, Types.NULL);\n    private static final List<Integer> STRICT_DATE_TYPES = Arrays.asList(Types.DATE, Types.NULL);\n    private static final List<Integer> DATE_TIME_TYPES = Arrays.asList(Types.TIMESTAMP, Types.NULL);\n    private List<Integer> columnTypes;\n    private List<List<Integer>> propertyIndices;\n    private List<List<Supplier<Object>>> propertyGetters;\n    private Calendar calendar;\n\n    private Supplier<Object> getResultSetPropertyGetterForStringProperty(ResultSet resultSet,\n                                                                         int columnIndex,\n                                                                         int columnType,\n                                                                         String propertyName)\n    {\n        if (STRING_TYPES.contains(columnType))\n        {\n           return () -> {\n                try\n                {\n                    return resultSet.getString(columnIndex);\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        else\n        {\n            throw new RuntimeException(\"Error reading in property '\" + propertyName + \"' of type String from SQL column of type '\" + columnType + \"'.\");\n        }\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForIntegerProperty(ResultSet resultSet,\n                                                                          int columnIndex,\n                                                                          int columnType,\n                                                                          String propertyName)\n    {\n        if (INT_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    Long res = null;\n                    long r = resultSet.getLong(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = Long.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException(\"Error reading in property '\" + propertyName + \"' of type Integer from SQL column of type '\" + columnType + \"'.\");\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForFloatProperty(ResultSet resultSet,\n                                                                        int columnIndex,\n                                                                        int columnType,\n                                                                        String propertyName)\n    {\n        if (FLOAT_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    Double res = null;\n                    double r = resultSet.getDouble(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = Double.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (INT_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    Double res = null;\n                    long r = resultSet.getLong(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = Double.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException(\"Error reading in property '\" + propertyName + \"' of type Float from SQL column of type '\" + columnType + \"'.\");\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForDecimalProperty(ResultSet resultSet,\n                                                                          int columnIndex,\n                                                                          int columnType,\n                                                                          String propertyName)\n    {\n        if (DECIMAL_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    return resultSet.getBigDecimal(columnIndex);\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (FLOAT_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    java.math.BigDecimal res = null;\n                    double r = resultSet.getDouble(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = java.math.BigDecimal.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (INT_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    java.math.BigDecimal res = null;\n                    long r = resultSet.getLong(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = java.math.BigDecimal.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException(\"Error reading in property '\" + propertyName + \"' of type Decimal from SQL column of type '\" + columnType + \"'.\");\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForBooleanProperty(ResultSet resultSet,\n                                                                          int columnIndex,\n                                                                          int columnType,\n                                                                          String propertyName)\n    {\n        if (BOOL_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    Boolean res = null;\n                    boolean r = resultSet.getBoolean(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = Boolean.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (STRING_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    Boolean res = null;\n                    String r = resultSet.getString(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = Boolean.valueOf(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (INT_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    Boolean res = null;\n                    long r = resultSet.getLong(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        res = Boolean.valueOf(r == 1);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException(\"Error reading in property '\" + propertyName + \"' of type Boolean from SQL column of type '\" + columnType + \"'.\");\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForStrictDateProperty(ResultSet resultSet,\n                                                                             int columnIndex,\n                                                                             int columnType,\n                                                                             String propertyName)\n    {\n        if (STRICT_DATE_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    java.sql.Date r = resultSet.getDate(columnIndex);\n                    if (r != null)\n                    {\n                        res = PureDate.fromSQLDate(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (STRING_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    String r = resultSet.getString(columnIndex);\n                    if (r != null)\n                    {\n                        try\n                        {\n                            res = PureDate.parsePureDate(r);\n                        }\n                        catch (java.lang.IllegalArgumentException dateTimeParseException)\n                        {\n                            res = PureDate.fromSQLDate(java.sql.Date.valueOf(r));\n                        }\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException(\"Error reading in property '\" + propertyName + \"' of type StrictDate from SQL column of type '\" + columnType + \"'.\");\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForDateTimeProperty(ResultSet resultSet,\n                                                                           int columnIndex,\n                                                                           int columnType,\n                                                                           String propertyName)\n    {\n        if (DATE_TIME_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    java.sql.Timestamp r = resultSet.getTimestamp(columnIndex, this.calendar);\n                    if (r != null)\n                    {\n                        res = PureDate.fromSQLTimestamp(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (STRING_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    String r = resultSet.getString(columnIndex);\n                    if (r != null)\n                    {\n                        try\n                        {\n                            res = PureDate.parsePureDate(r);\n                        }\n                        catch (java.lang.IllegalArgumentException dateTimeParseException)\n                        {\n                            res = PureDate.fromSQLTimestamp(java.sql.Timestamp.valueOf(r));\n                        }\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException(\"Error reading in property '\" + propertyName + \"' of type DateTime from SQL column of type '\" + columnType + \"'.\");\n    }\n\n    private Supplier<Object> getResultSetPropertyGetterForDateProperty(ResultSet resultSet,\n                                                                       int columnIndex,\n                                                                       int columnType,\n                                                                       String propertyName)\n    {\n        if (STRICT_DATE_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    java.sql.Date r = resultSet.getDate(columnIndex);\n                    if (r != null)\n                    {\n                        res = PureDate.fromSQLDate(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (DATE_TIME_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    java.sql.Timestamp r = resultSet.getTimestamp(columnIndex, this.calendar);\n                    if (r != null)\n                    {\n                        res = PureDate.fromSQLTimestamp(r);\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        if (STRING_TYPES.contains(columnType))\n        {\n            return () -> {\n                try\n                {\n                    PureDate res = null;\n                    String r = resultSet.getString(columnIndex);\n                    if (r != null)\n                    {\n                        try\n                        {\n                            res = PureDate.parsePureDate(r);\n                        }\n                        catch (java.lang.IllegalArgumentException dateTimeParseException1)\n                        {\n                            try\n                            {\n                                res = PureDate.fromSQLTimestamp(java.sql.Timestamp.valueOf(r));\n                            }\n                            catch (java.time.format.DateTimeParseException dateTimeParseException2)\n                            {\n                                res = PureDate.fromSQLDate(java.sql.Date.valueOf(r));\n                            }\n                        }\n                    }\n                    return res;\n                }\n                catch (Exception e)\n                {\n                    throw new RuntimeException(e);\n                }\n            };\n        }\n        throw new RuntimeException(\"Error reading in property '\" + propertyName + \"' of type Date from SQL column of type '\" + columnType + \"'.\");\n    }\n\n    private Object getAlloyNativeValueFromResultSet(ResultSet resultSet,\n                                                    int columnIndex,\n                                                    int columnType)\n    {\n        try\n        {\n            Object result = null;\n            switch (columnType)\n            {\n                case Types.DATE:\n                {\n                    java.sql.Date date = resultSet.getDate(columnIndex);\n                    if (date != null)\n                    {\n                        result = PureDate.fromSQLDate(date);\n                    }\n                    break;\n                }\n                case Types.TIMESTAMP:\n                {\n                    java.sql.Timestamp timestamp = resultSet.getTimestamp(columnIndex, this.calendar);\n                    if (timestamp != null)\n                    {\n                        result = PureDate.fromSQLTimestamp(timestamp);\n                    }\n                    break;\n                }\n                case Types.TINYINT:\n                case Types.SMALLINT:\n                case Types.INTEGER:\n                case Types.BIGINT:\n                {\n                    long num = resultSet.getLong(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        result = Long.valueOf(num);\n                    }\n                    break;\n                }\n                case Types.REAL:\n                case Types.FLOAT:\n                case Types.DOUBLE:\n                {\n                    double num = resultSet.getDouble(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        result = Double.valueOf(num);\n                    }\n                    break;\n                }\n                case Types.DECIMAL:\n                case Types.NUMERIC:\n                {\n                    result = resultSet.getBigDecimal(columnIndex);\n                    break;\n                }\n                case Types.CHAR:\n                case Types.VARCHAR:\n                case Types.LONGVARCHAR:\n                case Types.NCHAR:\n                case Types.NVARCHAR:\n                case Types.LONGNVARCHAR:\n                case Types.OTHER:\n                {\n                    result = resultSet.getString(columnIndex);\n                    break;\n                }\n                case Types.BIT:\n                case Types.BOOLEAN:\n                {\n                    boolean bool = resultSet.getBoolean(columnIndex);\n                    if (!resultSet.wasNull())\n                    {\n                        result = Boolean.valueOf(bool);\n                    }\n                    break;\n                }\n                case Types.BINARY:\n                case Types.VARBINARY:\n                case Types.LONGVARBINARY:\n                {\n                    byte[] bytes = resultSet.getBytes(columnIndex);\n                    if (bytes != null)\n                    {\n                        result = this.encodeHex(bytes);\n                    }\n                    break;\n                }\n                case Types.NULL:\n                {\n                    // do nothing: value is already assigned to null\n                    break;\n                }\n                default:\n                {\n                    result = resultSet.getObject(columnIndex);\n                }\n            }\n            return result;}\n        catch (Exception e)\n        {\n            throw new RuntimeException(e);\n        }\n    }\n\n    private String encodeHex(byte[] data)\n    {\n        final char[] DIGITS_LOWER = {'0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'};\n        final int l = data.length;\n        final char[] out = new char[l << 1];\n        for (int i = 0, j = 0; i < l; i++)\n        {\n            out[j++] = DIGITS_LOWER[(0xF0 & data[i]) >>> 4];\n            out[j++] = DIGITS_LOWER[0x0F & data[i]];\n        }\n        return new String(out);\n    }\n\n    public Object getObjectFromResultSet(ResultSet resultSet,\n                                         String databaseTimeZone,\n                                         String databaseConnection)\n    {\n        if (this.propertyIndices == null)\n        {\n            this.doSetup(resultSet, databaseTimeZone, databaseConnection);\n        }\n        final _pure.plan.root.Firm_model_Firm_Impl object = new _pure.plan.root.Firm_model_Firm_Impl();\n        object.setSetId$(\"model_Firm\");\n        int pkColIndex;\n\n        pkColIndex = this.propertyIndices.get(0).get(1);\n        Object pk$_0 = this.getAlloyNativeValueFromResultSet(resultSet, pkColIndex, this.columnTypes.get(pkColIndex - 1));\n        object.setPk$_0(pk$_0);\n\n        int propertyIndex;\n\n        propertyIndex = this.propertyIndices.get(0).get(0);\n        {\n            String res = (String) this.propertyGetters.get(0).get(0).get();\n            if (res == null)\n            {\n                throw new RuntimeException(\"Error reading in property 'legalName'. Property of multiplicity [1] can not be null, PKs: \" + pk$_0.toString());\n            }\n            object.setLegalName(res);\n        }\n\n        return object;\n    }\n\n    private void doSetup(ResultSet resultSet, String databaseTimeZone, String databaseConnection)\n    {\n        try\n        {\n            this.calendar = new GregorianCalendar(TimeZone.getTimeZone(databaseTimeZone));\n            _pure.plan.root.Firm_model_Firm_BaseImpl.databaseConnection$ = databaseConnection;\n            ResultSetMetaData resultSetMetaData = resultSet.getMetaData();\n            int columnCount = resultSetMetaData.getColumnCount();\n            this.columnTypes = new ArrayList<>();\n            List<String> columnNames = new ArrayList<>();\n            for (int i = 1; i <= columnCount; i++)\n            {\n                String columnLabel = resultSetMetaData.getColumnLabel(i);\n                columnNames.add(columnLabel.startsWith(\"\\\"\") && columnLabel.endsWith(\"\\\"\") ? columnLabel.substring(1, columnLabel.length() - 1).toUpperCase() : columnLabel.toUpperCase());\n                this.columnTypes.add(resultSetMetaData.getColumnType(i));\n            }\n\n            this.propertyIndices = new ArrayList<>();\n            List<Integer> index_0 = new ArrayList<>();\n            index_0.add(columnNames.indexOf(\"LEGALNAME\") + 1);\n            index_0.add(columnNames.indexOf(\"PK_0\") + 1);\n            this.propertyIndices.add(index_0);\n\n            this.propertyGetters = new ArrayList<>();\n            int propertyIndex;\n            Supplier<Object> propertyGetter = null;\n\n            List<Supplier<Object>> propertyGetter_0 = new ArrayList<>();\n\n            propertyIndex = this.propertyIndices.get(0).get(0);\n            propertyGetter = this.getResultSetPropertyGetterForStringProperty(resultSet, propertyIndex, resultSetMetaData.getColumnType(propertyIndex), \"legalName\");\n            propertyGetter_0.add(propertyGetter);\n\n            this.propertyGetters.add(propertyGetter_0);\n        }\n        catch (RuntimeException e)\n        {\n            throw e;\n        }\n        catch (Exception e)\n        {\n            throw new RuntimeException(e);\n        }\n    }\n}",
        },
      ],
    },
    rootExecutionNode: {
      _type: 'relationalClassInstantiation',
      authDependent: false,
      executionNodes: [
        {
          _type: 'sql',
          authDependent: false,
          connection: {
            _type: 'RelationalDatabaseConnection',
            authenticationStrategy: { _type: 'h2Default' },
            datasourceSpecification: {
              _type: 'h2Local',
              testDataSetupSqls: [''],
            },
            element: 'model::Test',
            postProcessorWithParameter: [],
            postProcessors: [],
            type: 'H2',
          },
          executionNodes: [],
          resultColumns: [
            { dataType: 'INTEGER', label: '"pk_0"' },
            { dataType: '', label: '"legalName"' },
          ],
          resultType: {
            _type: 'dataType',
            dataType: 'meta::pure::metamodel::type::Any',
          },
          sqlComment: '-- "executionTraceID" : "${execID}"',
          sqlQuery:
            'select "root".id as "pk_0", concat("root".Legal_name, \'_LTD\') as "legalName" from FirmTable as "root"',
        },
      ],
      implementation: {
        _type: 'java',
        executionClassFullName: '_pure.plan.root.Execute',
      },
      resultSizeRange: { lowerBound: 0 },
      resultType: {
        _type: 'class',
        class: 'model::Firm',
        setImplementations: [
          {
            class: 'model::Firm',
            id: 'model_Firm',
            mapping: 'model::NewMapping',
            propertyMappings: [
              { enumMapping: {}, property: 'legalName', type: 'String' },
            ],
          },
        ],
      },
    },
    serializer: { name: 'pure', version: 'vX_X_X' },
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
      path: 'model::IncType',
      content: {
        _type: 'Enumeration',
        name: 'IncType',
        package: 'model',
        values: [
          {
            value: 'Corp',
          },
          {
            value: 'LLC',
          },
        ],
      },
      classifierPath: 'meta::pure::metamodel::type::Enumeration',
    },
    {
      path: 'model::Firm',
      content: {
        _type: 'class',
        constraints: [
          {
            functionDefinition: {
              _type: 'lambda',
              body: [
                {
                  _type: 'func',
                  function: 'startsWith',
                  parameters: [
                    {
                      _type: 'property',
                      parameters: [
                        {
                          _type: 'var',
                          name: 'this',
                        },
                      ],
                      property: 'legalName',
                    },
                    {
                      _type: 'string',
                      multiplicity: {
                        lowerBound: 1,
                        upperBound: 1,
                      },
                      values: ['_'],
                    },
                  ],
                },
              ],
              parameters: [],
            },
            name: 'validName',
          },
        ],
        name: 'Firm',
        package: 'model',
        properties: [
          {
            multiplicity: {
              lowerBound: 1,
            },
            name: 'employees',
            genericType: {
              rawType: {
                _type: 'packageableType',
                fullPath: 'model::Person',
              },
            },
          },
          {
            multiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            name: 'incType',
            type: 'model::IncType',
          },
        ],
        qualifiedProperties: [
          {
            body: [
              {
                _type: 'func',
                function: 'count',
                parameters: [
                  {
                    _type: 'property',
                    parameters: [
                      {
                        _type: 'var',
                        name: 'this',
                      },
                    ],
                    property: 'employees',
                  },
                ],
              },
            ],
            name: 'employeeSize',
            parameters: [],
            returnMultiplicity: {
              lowerBound: 1,
              upperBound: 1,
            },
            returnType: 'Number',
          },
        ],
        superTypes: ['model::LegalEntity'],
      },
      classifierPath: 'meta::pure::metamodel::type::Class',
    },
    {
      path: 'model::LegalEntity',
      content: {
        _type: 'class',
        name: 'LegalEntity',
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
      path: 'model::Test',
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
                    database: 'model::Test',
                    mainTableDb: 'model::Test',
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
                    database: 'model::Test',
                    mainTableDb: 'model::Test',
                    schema: 'default',
                    table: 'FirmTable',
                  },
                  tableAlias: 'FirmTable',
                },
              ],
            },
          },
        ],
        name: 'Test',
        package: 'model',
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
                    name: 'Legal_name',
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
      path: 'model::NewMapping',
      content: {
        _type: 'mapping',
        classMappings: [
          {
            _type: 'relational',
            class: 'model::Firm',
            distinct: false,
            mainTable: {
              _type: 'Table',
              database: 'model::Test',
              mainTableDb: 'model::Test',
              schema: 'default',
              table: 'FirmTable',
            },
            primaryKey: [
              {
                _type: 'column',
                column: 'id',
                table: {
                  _type: 'Table',
                  database: 'model::Test',
                  mainTableDb: 'model::Test',
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
                  _type: 'dynaFunc',
                  funcName: 'concat',
                  parameters: [
                    {
                      _type: 'column',
                      column: 'Legal_name',
                      table: {
                        _type: 'Table',
                        database: 'model::Test',
                        mainTableDb: 'model::Test',
                        schema: 'default',
                        table: 'FirmTable',
                      },
                      tableAlias: 'FirmTable',
                    },
                    {
                      _type: 'literal',
                      value: '_LTD',
                    },
                  ],
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
                      db: 'model::Test',
                      name: 'FirmPerson',
                    },
                  ],
                },
                target: 'model_Person',
              },
            ],
            root: true,
          },
          {
            _type: 'relational',
            class: 'model::Person',
            distinct: false,
            mainTable: {
              _type: 'Table',
              database: 'model::Test',
              mainTableDb: 'model::Test',
              schema: 'default',
              table: 'PersonTable',
            },
            primaryKey: [
              {
                _type: 'column',
                column: 'id',
                table: {
                  _type: 'Table',
                  database: 'model::Test',
                  mainTableDb: 'model::Test',
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
                    database: 'model::Test',
                    mainTableDb: 'model::Test',
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
                    database: 'model::Test',
                    mainTableDb: 'model::Test',
                    schema: 'default',
                    table: 'PersonTable',
                  },
                  tableAlias: 'PersonTable',
                },
              },
            ],
            root: true,
          },
        ],
        enumerationMappings: [],
        includedMappings: [],
        name: 'NewMapping',
        package: 'model',
        tests: [],
      },
      classifierPath: 'meta::pure::mapping::Mapping',
    },
  ],
};
