// Generated from /Users/blacksteed232/Developer/legend/studio/packages/legend-application-repl/grammar/datacube_filter__parser.g4 by ANTLR 4.13.1
// noinspection ES6UnusedImports,JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import {
	ATN,
	ATNDeserializer, DecisionState, DFA, FailedPredicateException,
	RecognitionException, NoViableAltException, BailErrorStrategy,
	Parser, ParserATNSimulator,
	RuleContext, ParserRuleContext, PredictionMode, PredictionContextCache,
	TerminalNode, RuleNode,
	Token, TokenStream,
	Interval, IntervalSet
} from 'antlr4';
// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;

export default class datacube_filter__parser extends Parser {
	public static readonly OPERATOR = 1;
	public static readonly GROUP_OPERATOR_AND = 2;
	public static readonly GROUP_OPERATOR_OR = 3;
	public static readonly GROUP_OPEN = 4;
	public static readonly GROUP_CLOSE = 5;
	public static readonly NUMBER = 6;
	public static readonly STRING = 7;
	public static readonly COLUMN = 8;
	public static readonly IDENTIFIER = 9;
	public static readonly WHITESPACE = 10;
	public static readonly EOF = Token.EOF;
	public static readonly RULE_filter = 0;
	public static readonly RULE_condition = 1;
	public static readonly RULE_column = 2;
	public static readonly RULE_value = 3;
	public static readonly RULE_group = 4;
	public static readonly RULE_groupOperator = 5;
	public static readonly RULE_groupCondition = 6;
	public static readonly literalNames: (string | null)[] = [ null, null, 
                                                            "'&&'", "'||'", 
                                                            "'('", "')'" ];
	public static readonly symbolicNames: (string | null)[] = [ null, "OPERATOR", 
                                                             "GROUP_OPERATOR_AND", 
                                                             "GROUP_OPERATOR_OR", 
                                                             "GROUP_OPEN", 
                                                             "GROUP_CLOSE", 
                                                             "NUMBER", "STRING", 
                                                             "COLUMN", "IDENTIFIER", 
                                                             "WHITESPACE" ];
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"filter", "condition", "column", "value", "group", "groupOperator", "groupCondition",
	];
	public get grammarFileName(): string { return "datacube_filter__parser.g4"; }
	public get literalNames(): (string | null)[] { return datacube_filter__parser.literalNames; }
	public get symbolicNames(): (string | null)[] { return datacube_filter__parser.symbolicNames; }
	public get ruleNames(): string[] { return datacube_filter__parser.ruleNames; }
	public get serializedATN(): number[] { return datacube_filter__parser._serializedATN; }

	protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException {
		return new FailedPredicateException(this, predicate, message);
	}

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(this, datacube_filter__parser._ATN, datacube_filter__parser.DecisionsToDFA, new PredictionContextCache());
	}
	// @RuleVersion(0)
	public filter(): FilterContext {
		let localctx: FilterContext = new FilterContext(this, this._ctx, this.state);
		this.enterRule(localctx, 0, datacube_filter__parser.RULE_filter);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 16;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 0, this._ctx) ) {
			case 1:
				{
				this.state = 14;
				this.groupCondition();
				}
				break;
			case 2:
				{
				this.state = 15;
				this.group();
				}
				break;
			}
			this.state = 18;
			this.match(datacube_filter__parser.EOF);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public condition(): ConditionContext {
		let localctx: ConditionContext = new ConditionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 2, datacube_filter__parser.RULE_condition);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 20;
			this.column();
			this.state = 21;
			_la = this._input.LA(1);
			if(!(_la===1 || _la===9)) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			this.state = 23;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===6 || _la===7) {
				{
				this.state = 22;
				this.value();
				}
			}

			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public column(): ColumnContext {
		let localctx: ColumnContext = new ColumnContext(this, this._ctx, this.state);
		this.enterRule(localctx, 4, datacube_filter__parser.RULE_column);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 25;
			this.match(datacube_filter__parser.COLUMN);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public value(): ValueContext {
		let localctx: ValueContext = new ValueContext(this, this._ctx, this.state);
		this.enterRule(localctx, 6, datacube_filter__parser.RULE_value);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 27;
			_la = this._input.LA(1);
			if(!(_la===6 || _la===7)) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public group(): GroupContext {
		let localctx: GroupContext = new GroupContext(this, this._ctx, this.state);
		this.enterRule(localctx, 8, datacube_filter__parser.RULE_group);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 29;
			this.match(datacube_filter__parser.GROUP_OPEN);
			this.state = 30;
			this.groupCondition();
			this.state = 31;
			this.match(datacube_filter__parser.GROUP_CLOSE);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public groupOperator(): GroupOperatorContext {
		let localctx: GroupOperatorContext = new GroupOperatorContext(this, this._ctx, this.state);
		this.enterRule(localctx, 10, datacube_filter__parser.RULE_groupOperator);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 33;
			_la = this._input.LA(1);
			if(!(_la===2 || _la===3)) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public groupCondition(): GroupConditionContext {
		let localctx: GroupConditionContext = new GroupConditionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 12, datacube_filter__parser.RULE_groupCondition);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 37;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 8:
				{
				this.state = 35;
				this.condition();
				}
				break;
			case 4:
				{
				this.state = 36;
				this.group();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			this.state = 46;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===2 || _la===3) {
				{
				{
				this.state = 39;
				this.groupOperator();
				this.state = 42;
				this._errHandler.sync(this);
				switch (this._input.LA(1)) {
				case 8:
					{
					this.state = 40;
					this.condition();
					}
					break;
				case 4:
					{
					this.state = 41;
					this.group();
					}
					break;
				default:
					throw new NoViableAltException(this);
				}
				}
				}
				this.state = 48;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}

	public static readonly _serializedATN: number[] = [4,1,10,50,2,0,7,0,2,
	1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,6,1,0,1,0,3,0,17,8,0,1,0,1,
	0,1,1,1,1,1,1,3,1,24,8,1,1,2,1,2,1,3,1,3,1,4,1,4,1,4,1,4,1,5,1,5,1,6,1,
	6,3,6,38,8,6,1,6,1,6,1,6,3,6,43,8,6,5,6,45,8,6,10,6,12,6,48,9,6,1,6,0,0,
	7,0,2,4,6,8,10,12,0,3,2,0,1,1,9,9,1,0,6,7,1,0,2,3,47,0,16,1,0,0,0,2,20,
	1,0,0,0,4,25,1,0,0,0,6,27,1,0,0,0,8,29,1,0,0,0,10,33,1,0,0,0,12,37,1,0,
	0,0,14,17,3,12,6,0,15,17,3,8,4,0,16,14,1,0,0,0,16,15,1,0,0,0,17,18,1,0,
	0,0,18,19,5,0,0,1,19,1,1,0,0,0,20,21,3,4,2,0,21,23,7,0,0,0,22,24,3,6,3,
	0,23,22,1,0,0,0,23,24,1,0,0,0,24,3,1,0,0,0,25,26,5,8,0,0,26,5,1,0,0,0,27,
	28,7,1,0,0,28,7,1,0,0,0,29,30,5,4,0,0,30,31,3,12,6,0,31,32,5,5,0,0,32,9,
	1,0,0,0,33,34,7,2,0,0,34,11,1,0,0,0,35,38,3,2,1,0,36,38,3,8,4,0,37,35,1,
	0,0,0,37,36,1,0,0,0,38,46,1,0,0,0,39,42,3,10,5,0,40,43,3,2,1,0,41,43,3,
	8,4,0,42,40,1,0,0,0,42,41,1,0,0,0,43,45,1,0,0,0,44,39,1,0,0,0,45,48,1,0,
	0,0,46,44,1,0,0,0,46,47,1,0,0,0,47,13,1,0,0,0,48,46,1,0,0,0,5,16,23,37,
	42,46];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!datacube_filter__parser.__ATN) {
			datacube_filter__parser.__ATN = new ATNDeserializer().deserialize(datacube_filter__parser._serializedATN);
		}

		return datacube_filter__parser.__ATN;
	}


	static DecisionsToDFA = datacube_filter__parser._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );

}

export class FilterContext extends ParserRuleContext {
	constructor(parser?: datacube_filter__parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public EOF(): TerminalNode {
		return this.getToken(datacube_filter__parser.EOF, 0);
	}
	public groupCondition(): GroupConditionContext {
		return this.getTypedRuleContext(GroupConditionContext, 0) as GroupConditionContext;
	}
	public group(): GroupContext {
		return this.getTypedRuleContext(GroupContext, 0) as GroupContext;
	}
    public get ruleIndex(): number {
    	return datacube_filter__parser.RULE_filter;
	}
}


export class ConditionContext extends ParserRuleContext {
	constructor(parser?: datacube_filter__parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public column(): ColumnContext {
		return this.getTypedRuleContext(ColumnContext, 0) as ColumnContext;
	}
	public OPERATOR(): TerminalNode {
		return this.getToken(datacube_filter__parser.OPERATOR, 0);
	}
	public IDENTIFIER(): TerminalNode {
		return this.getToken(datacube_filter__parser.IDENTIFIER, 0);
	}
	public value(): ValueContext {
		return this.getTypedRuleContext(ValueContext, 0) as ValueContext;
	}
    public get ruleIndex(): number {
    	return datacube_filter__parser.RULE_condition;
	}
}


export class ColumnContext extends ParserRuleContext {
	constructor(parser?: datacube_filter__parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public COLUMN(): TerminalNode {
		return this.getToken(datacube_filter__parser.COLUMN, 0);
	}
    public get ruleIndex(): number {
    	return datacube_filter__parser.RULE_column;
	}
}


export class ValueContext extends ParserRuleContext {
	constructor(parser?: datacube_filter__parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public STRING(): TerminalNode {
		return this.getToken(datacube_filter__parser.STRING, 0);
	}
	public NUMBER(): TerminalNode {
		return this.getToken(datacube_filter__parser.NUMBER, 0);
	}
    public get ruleIndex(): number {
    	return datacube_filter__parser.RULE_value;
	}
}


export class GroupContext extends ParserRuleContext {
	constructor(parser?: datacube_filter__parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public GROUP_OPEN(): TerminalNode {
		return this.getToken(datacube_filter__parser.GROUP_OPEN, 0);
	}
	public groupCondition(): GroupConditionContext {
		return this.getTypedRuleContext(GroupConditionContext, 0) as GroupConditionContext;
	}
	public GROUP_CLOSE(): TerminalNode {
		return this.getToken(datacube_filter__parser.GROUP_CLOSE, 0);
	}
    public get ruleIndex(): number {
    	return datacube_filter__parser.RULE_group;
	}
}


export class GroupOperatorContext extends ParserRuleContext {
	constructor(parser?: datacube_filter__parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public GROUP_OPERATOR_AND(): TerminalNode {
		return this.getToken(datacube_filter__parser.GROUP_OPERATOR_AND, 0);
	}
	public GROUP_OPERATOR_OR(): TerminalNode {
		return this.getToken(datacube_filter__parser.GROUP_OPERATOR_OR, 0);
	}
    public get ruleIndex(): number {
    	return datacube_filter__parser.RULE_groupOperator;
	}
}


export class GroupConditionContext extends ParserRuleContext {
	constructor(parser?: datacube_filter__parser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public condition_list(): ConditionContext[] {
		return this.getTypedRuleContexts(ConditionContext) as ConditionContext[];
	}
	public condition(i: number): ConditionContext {
		return this.getTypedRuleContext(ConditionContext, i) as ConditionContext;
	}
	public group_list(): GroupContext[] {
		return this.getTypedRuleContexts(GroupContext) as GroupContext[];
	}
	public group(i: number): GroupContext {
		return this.getTypedRuleContext(GroupContext, i) as GroupContext;
	}
	public groupOperator_list(): GroupOperatorContext[] {
		return this.getTypedRuleContexts(GroupOperatorContext) as GroupOperatorContext[];
	}
	public groupOperator(i: number): GroupOperatorContext {
		return this.getTypedRuleContext(GroupOperatorContext, i) as GroupOperatorContext;
	}
    public get ruleIndex(): number {
    	return datacube_filter__parser.RULE_groupCondition;
	}
}
