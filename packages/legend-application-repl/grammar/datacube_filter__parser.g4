parser grammar datacube_filter__parser;
options {
	tokenVocab = datacube_filter__lexer;
}

filter: (groupCondition | group) EOF;
condition: column (OPERATOR | IDENTIFIER) (value)?;
column: COLUMN;
value: STRING | NUMBER; // TODO: support list of values? date?
group: GROUP_OPEN groupCondition GROUP_CLOSE;
groupOperator: GROUP_OPERATOR_AND | GROUP_OPERATOR_OR;
groupCondition: (condition | group) (
		groupOperator (condition | group)
	)*;
