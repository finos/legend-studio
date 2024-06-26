lexer grammar datacube_filter__lexer;

fragment Whitespace: [ \r\t\n]+;
fragment Identifier: Letter (Letter | Digit | ' ')* (Letter | Digit);
fragment Letter: [A-Za-z];
fragment Digit: [0-9];
fragment HexDigit: [0-9a-fA-F];
fragment UnicodeEsc:
	'u' (HexDigit (HexDigit (HexDigit HexDigit?)?)?)?;
fragment Esc: '\\';
fragment StringEscSeq:
	Esc (
		[btnfr"'\\] // The standard escaped character set such as tab, newline, etc.
		| UnicodeEsc // A Unicode escape sequence
		| . // Invalid escape character
		| EOF // Incomplete at EOF
	);
fragment String: ('"' ( StringEscSeq | ~["\r\n\\])* '"');
fragment Number: ((Digit)* '.' (Digit)+ | (Digit)+) (
		('e' | 'E') ('+' | '-')? (Digit)+
	)?;
fragment ColumnEscSeq:
	Esc (
		[btnfr[\]\\] // The standard escaped character set such as tab, newline, etc.
		| UnicodeEsc // A Unicode escape sequence
		| . // Invalid escape character
		| EOF // Incomplete at EOF
	);
fragment Column: ('[' ( StringEscSeq | ~[[\]\r\n\\])* ']');

OPERATOR: '==' | '!=' | '<>' | '>' | '<' | '>=' | '<=';
GROUP_OPERATOR_AND: '&&';
GROUP_OPERATOR_OR: '||';
GROUP_OPEN: '(';
GROUP_CLOSE: ')';
NUMBER: Number;
STRING: String;
COLUMN: Column;
IDENTIFIER: Identifier;
WHITESPACE: [ \t\r\n]+ -> skip;
