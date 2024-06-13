// Generated from /Users/blacksteed232/Developer/legend/studio/packages/legend-application-repl/grammar/datacube_filter__parser.g4 by ANTLR 4.13.1
import org.antlr.v4.runtime.atn.*;
import org.antlr.v4.runtime.dfa.DFA;
import org.antlr.v4.runtime.*;
import org.antlr.v4.runtime.misc.*;
import org.antlr.v4.runtime.tree.*;
import java.util.List;
import java.util.Iterator;
import java.util.ArrayList;

@SuppressWarnings({"all", "warnings", "unchecked", "unused", "cast", "CheckReturnValue"})
public class datacube_filter__parser extends Parser {
	static { RuntimeMetaData.checkVersion("4.13.1", RuntimeMetaData.VERSION); }

	protected static final DFA[] _decisionToDFA;
	protected static final PredictionContextCache _sharedContextCache =
		new PredictionContextCache();
	public static final int
		OPERATOR=1, GROUP_OPERATOR_AND=2, GROUP_OPERATOR_OR=3, GROUP_OPEN=4, GROUP_CLOSE=5, 
		NUMBER=6, STRING=7, COLUMN=8, IDENTIFIER=9, WHITESPACE=10;
	public static final int
		RULE_filter = 0, RULE_condition = 1, RULE_column = 2, RULE_value = 3, 
		RULE_group = 4, RULE_groupOperator = 5, RULE_groupCondition = 6;
	private static String[] makeRuleNames() {
		return new String[] {
			"filter", "condition", "column", "value", "group", "groupOperator", "groupCondition"
		};
	}
	public static final String[] ruleNames = makeRuleNames();

	private static String[] makeLiteralNames() {
		return new String[] {
			null, null, "'&&'", "'||'", "'('", "')'"
		};
	}
	private static final String[] _LITERAL_NAMES = makeLiteralNames();
	private static String[] makeSymbolicNames() {
		return new String[] {
			null, "OPERATOR", "GROUP_OPERATOR_AND", "GROUP_OPERATOR_OR", "GROUP_OPEN", 
			"GROUP_CLOSE", "NUMBER", "STRING", "COLUMN", "IDENTIFIER", "WHITESPACE"
		};
	}
	private static final String[] _SYMBOLIC_NAMES = makeSymbolicNames();
	public static final Vocabulary VOCABULARY = new VocabularyImpl(_LITERAL_NAMES, _SYMBOLIC_NAMES);

	/**
	 * @deprecated Use {@link #VOCABULARY} instead.
	 */
	@Deprecated
	public static final String[] tokenNames;
	static {
		tokenNames = new String[_SYMBOLIC_NAMES.length];
		for (int i = 0; i < tokenNames.length; i++) {
			tokenNames[i] = VOCABULARY.getLiteralName(i);
			if (tokenNames[i] == null) {
				tokenNames[i] = VOCABULARY.getSymbolicName(i);
			}

			if (tokenNames[i] == null) {
				tokenNames[i] = "<INVALID>";
			}
		}
	}

	@Override
	@Deprecated
	public String[] getTokenNames() {
		return tokenNames;
	}

	@Override

	public Vocabulary getVocabulary() {
		return VOCABULARY;
	}

	@Override
	public String getGrammarFileName() { return "datacube_filter__parser.g4"; }

	@Override
	public String[] getRuleNames() { return ruleNames; }

	@Override
	public String getSerializedATN() { return _serializedATN; }

	@Override
	public ATN getATN() { return _ATN; }

	public datacube_filter__parser(TokenStream input) {
		super(input);
		_interp = new ParserATNSimulator(this,_ATN,_decisionToDFA,_sharedContextCache);
	}

	@SuppressWarnings("CheckReturnValue")
	public static class FilterContext extends ParserRuleContext {
		public TerminalNode EOF() { return getToken(datacube_filter__parser.EOF, 0); }
		public GroupConditionContext groupCondition() {
			return getRuleContext(GroupConditionContext.class,0);
		}
		public GroupContext group() {
			return getRuleContext(GroupContext.class,0);
		}
		public FilterContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_filter; }
	}

	public final FilterContext filter() throws RecognitionException {
		FilterContext _localctx = new FilterContext(_ctx, getState());
		enterRule(_localctx, 0, RULE_filter);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(16);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,0,_ctx) ) {
			case 1:
				{
				setState(14);
				groupCondition();
				}
				break;
			case 2:
				{
				setState(15);
				group();
				}
				break;
			}
			setState(18);
			match(EOF);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class ConditionContext extends ParserRuleContext {
		public ColumnContext column() {
			return getRuleContext(ColumnContext.class,0);
		}
		public TerminalNode OPERATOR() { return getToken(datacube_filter__parser.OPERATOR, 0); }
		public TerminalNode IDENTIFIER() { return getToken(datacube_filter__parser.IDENTIFIER, 0); }
		public ValueContext value() {
			return getRuleContext(ValueContext.class,0);
		}
		public ConditionContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_condition; }
	}

	public final ConditionContext condition() throws RecognitionException {
		ConditionContext _localctx = new ConditionContext(_ctx, getState());
		enterRule(_localctx, 2, RULE_condition);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(20);
			column();
			setState(21);
			_la = _input.LA(1);
			if ( !(_la==OPERATOR || _la==IDENTIFIER) ) {
			_errHandler.recoverInline(this);
			}
			else {
				if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
				_errHandler.reportMatch(this);
				consume();
			}
			setState(23);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if (_la==NUMBER || _la==STRING) {
				{
				setState(22);
				value();
				}
			}

			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class ColumnContext extends ParserRuleContext {
		public TerminalNode COLUMN() { return getToken(datacube_filter__parser.COLUMN, 0); }
		public ColumnContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_column; }
	}

	public final ColumnContext column() throws RecognitionException {
		ColumnContext _localctx = new ColumnContext(_ctx, getState());
		enterRule(_localctx, 4, RULE_column);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(25);
			match(COLUMN);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class ValueContext extends ParserRuleContext {
		public TerminalNode STRING() { return getToken(datacube_filter__parser.STRING, 0); }
		public TerminalNode NUMBER() { return getToken(datacube_filter__parser.NUMBER, 0); }
		public ValueContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_value; }
	}

	public final ValueContext value() throws RecognitionException {
		ValueContext _localctx = new ValueContext(_ctx, getState());
		enterRule(_localctx, 6, RULE_value);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(27);
			_la = _input.LA(1);
			if ( !(_la==NUMBER || _la==STRING) ) {
			_errHandler.recoverInline(this);
			}
			else {
				if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
				_errHandler.reportMatch(this);
				consume();
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class GroupContext extends ParserRuleContext {
		public TerminalNode GROUP_OPEN() { return getToken(datacube_filter__parser.GROUP_OPEN, 0); }
		public GroupConditionContext groupCondition() {
			return getRuleContext(GroupConditionContext.class,0);
		}
		public TerminalNode GROUP_CLOSE() { return getToken(datacube_filter__parser.GROUP_CLOSE, 0); }
		public GroupContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_group; }
	}

	public final GroupContext group() throws RecognitionException {
		GroupContext _localctx = new GroupContext(_ctx, getState());
		enterRule(_localctx, 8, RULE_group);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(29);
			match(GROUP_OPEN);
			setState(30);
			groupCondition();
			setState(31);
			match(GROUP_CLOSE);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class GroupOperatorContext extends ParserRuleContext {
		public TerminalNode GROUP_OPERATOR_AND() { return getToken(datacube_filter__parser.GROUP_OPERATOR_AND, 0); }
		public TerminalNode GROUP_OPERATOR_OR() { return getToken(datacube_filter__parser.GROUP_OPERATOR_OR, 0); }
		public GroupOperatorContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_groupOperator; }
	}

	public final GroupOperatorContext groupOperator() throws RecognitionException {
		GroupOperatorContext _localctx = new GroupOperatorContext(_ctx, getState());
		enterRule(_localctx, 10, RULE_groupOperator);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(33);
			_la = _input.LA(1);
			if ( !(_la==GROUP_OPERATOR_AND || _la==GROUP_OPERATOR_OR) ) {
			_errHandler.recoverInline(this);
			}
			else {
				if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
				_errHandler.reportMatch(this);
				consume();
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class GroupConditionContext extends ParserRuleContext {
		public List<ConditionContext> condition() {
			return getRuleContexts(ConditionContext.class);
		}
		public ConditionContext condition(int i) {
			return getRuleContext(ConditionContext.class,i);
		}
		public List<GroupContext> group() {
			return getRuleContexts(GroupContext.class);
		}
		public GroupContext group(int i) {
			return getRuleContext(GroupContext.class,i);
		}
		public List<GroupOperatorContext> groupOperator() {
			return getRuleContexts(GroupOperatorContext.class);
		}
		public GroupOperatorContext groupOperator(int i) {
			return getRuleContext(GroupOperatorContext.class,i);
		}
		public GroupConditionContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_groupCondition; }
	}

	public final GroupConditionContext groupCondition() throws RecognitionException {
		GroupConditionContext _localctx = new GroupConditionContext(_ctx, getState());
		enterRule(_localctx, 12, RULE_groupCondition);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(37);
			_errHandler.sync(this);
			switch (_input.LA(1)) {
			case COLUMN:
				{
				setState(35);
				condition();
				}
				break;
			case GROUP_OPEN:
				{
				setState(36);
				group();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			setState(46);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==GROUP_OPERATOR_AND || _la==GROUP_OPERATOR_OR) {
				{
				{
				setState(39);
				groupOperator();
				setState(42);
				_errHandler.sync(this);
				switch (_input.LA(1)) {
				case COLUMN:
					{
					setState(40);
					condition();
					}
					break;
				case GROUP_OPEN:
					{
					setState(41);
					group();
					}
					break;
				default:
					throw new NoViableAltException(this);
				}
				}
				}
				setState(48);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static final String _serializedATN =
		"\u0004\u0001\n2\u0002\u0000\u0007\u0000\u0002\u0001\u0007\u0001\u0002"+
		"\u0002\u0007\u0002\u0002\u0003\u0007\u0003\u0002\u0004\u0007\u0004\u0002"+
		"\u0005\u0007\u0005\u0002\u0006\u0007\u0006\u0001\u0000\u0001\u0000\u0003"+
		"\u0000\u0011\b\u0000\u0001\u0000\u0001\u0000\u0001\u0001\u0001\u0001\u0001"+
		"\u0001\u0003\u0001\u0018\b\u0001\u0001\u0002\u0001\u0002\u0001\u0003\u0001"+
		"\u0003\u0001\u0004\u0001\u0004\u0001\u0004\u0001\u0004\u0001\u0005\u0001"+
		"\u0005\u0001\u0006\u0001\u0006\u0003\u0006&\b\u0006\u0001\u0006\u0001"+
		"\u0006\u0001\u0006\u0003\u0006+\b\u0006\u0005\u0006-\b\u0006\n\u0006\f"+
		"\u00060\t\u0006\u0001\u0006\u0000\u0000\u0007\u0000\u0002\u0004\u0006"+
		"\b\n\f\u0000\u0003\u0002\u0000\u0001\u0001\t\t\u0001\u0000\u0006\u0007"+
		"\u0001\u0000\u0002\u0003/\u0000\u0010\u0001\u0000\u0000\u0000\u0002\u0014"+
		"\u0001\u0000\u0000\u0000\u0004\u0019\u0001\u0000\u0000\u0000\u0006\u001b"+
		"\u0001\u0000\u0000\u0000\b\u001d\u0001\u0000\u0000\u0000\n!\u0001\u0000"+
		"\u0000\u0000\f%\u0001\u0000\u0000\u0000\u000e\u0011\u0003\f\u0006\u0000"+
		"\u000f\u0011\u0003\b\u0004\u0000\u0010\u000e\u0001\u0000\u0000\u0000\u0010"+
		"\u000f\u0001\u0000\u0000\u0000\u0011\u0012\u0001\u0000\u0000\u0000\u0012"+
		"\u0013\u0005\u0000\u0000\u0001\u0013\u0001\u0001\u0000\u0000\u0000\u0014"+
		"\u0015\u0003\u0004\u0002\u0000\u0015\u0017\u0007\u0000\u0000\u0000\u0016"+
		"\u0018\u0003\u0006\u0003\u0000\u0017\u0016\u0001\u0000\u0000\u0000\u0017"+
		"\u0018\u0001\u0000\u0000\u0000\u0018\u0003\u0001\u0000\u0000\u0000\u0019"+
		"\u001a\u0005\b\u0000\u0000\u001a\u0005\u0001\u0000\u0000\u0000\u001b\u001c"+
		"\u0007\u0001\u0000\u0000\u001c\u0007\u0001\u0000\u0000\u0000\u001d\u001e"+
		"\u0005\u0004\u0000\u0000\u001e\u001f\u0003\f\u0006\u0000\u001f \u0005"+
		"\u0005\u0000\u0000 \t\u0001\u0000\u0000\u0000!\"\u0007\u0002\u0000\u0000"+
		"\"\u000b\u0001\u0000\u0000\u0000#&\u0003\u0002\u0001\u0000$&\u0003\b\u0004"+
		"\u0000%#\u0001\u0000\u0000\u0000%$\u0001\u0000\u0000\u0000&.\u0001\u0000"+
		"\u0000\u0000\'*\u0003\n\u0005\u0000(+\u0003\u0002\u0001\u0000)+\u0003"+
		"\b\u0004\u0000*(\u0001\u0000\u0000\u0000*)\u0001\u0000\u0000\u0000+-\u0001"+
		"\u0000\u0000\u0000,\'\u0001\u0000\u0000\u0000-0\u0001\u0000\u0000\u0000"+
		".,\u0001\u0000\u0000\u0000./\u0001\u0000\u0000\u0000/\r\u0001\u0000\u0000"+
		"\u00000.\u0001\u0000\u0000\u0000\u0005\u0010\u0017%*.";
	public static final ATN _ATN =
		new ATNDeserializer().deserialize(_serializedATN.toCharArray());
	static {
		_decisionToDFA = new DFA[_ATN.getNumberOfDecisions()];
		for (int i = 0; i < _ATN.getNumberOfDecisions(); i++) {
			_decisionToDFA[i] = new DFA(_ATN.getDecisionState(i), i);
		}
	}
}