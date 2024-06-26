parser grammar datacube_filter__parser;
options {
	tokenVocab = datacube_filter__lexer;
}

filter: (groupCondition | group) EOF;
condition: column (OPERATOR | IDENTIFIER) (value)?;
column: COLUMN;
value: STRING | NUMBER;
group: GROUP_OPEN groupCondition GROUP_CLOSE;
groupOperator: GROUP_OPERATOR_AND | GROUP_OPERATOR_OR;
groupCondition: (condition | group) (
		groupOperator (condition | group)
	)*;
