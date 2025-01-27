import { defineConfig } from 'tsl';
import type * as ts from 'typescript';

export default defineConfig({
	rules: {
		/**
		 * @example
		 * ```ts
		 * interface MyInterface {
		 *   prop: string,
		 * }
		 * ```
		 * should be
		 * ```ts
		 * interface MyInterface {
		 *   prop: string;
		 * }
		 * ```
		 */
		'interface-property-semicolon'({ typescript: ts, sourceFile, reportWarning }) {
			const { text } = sourceFile;
			ts.forEachChild(sourceFile, function walk(node) {
				if (ts.isInterfaceDeclaration(node)) {
					for (const member of node.members) {
						if (text[member.end - 1] !== ';') {
							reportWarning(
								`Interface properties should end with a semicolon.`,
								member.getStart(sourceFile),
								member.getEnd()
							).withFix(
								'Replace comma with semicolon',
								() => [{
									fileName: sourceFile.fileName,
									textChanges: [{
										newText: ';',
										span: {
											start: member.end - 1,
											length: 1,
										},
									}],
								}]
							);
						}
					}
				}
				ts.forEachChild(node, walk);
			});
		},
		/**
		 * @example
		 * ```ts
		 * if (foo) bar();
		 * ```
		 * should be
		 * ```ts
		 * if (foo) {
		 * 	bar();
		 * }
		 * ```
		 */
		'braces-around-statements'({ typescript: ts, sourceFile, reportWarning }) {
			ts.forEachChild(sourceFile, function walk(node) {
				if (ts.isIfStatement(node)) {
					if (!ts.isBlock(node.thenStatement)) {
						reportWithFix(node.thenStatement);
					}
					if (node.elseStatement && !ts.isIfStatement(node.elseStatement) && !ts.isBlock(node.elseStatement)) {
						reportWithFix(node.elseStatement);
					}
				}
				// @ts-expect-error
				else if ('statement' in node && ts.isStatement(node.statement)) {
					const statement = node.statement;
					if (!ts.isBlock(node.statement)) {
						reportWithFix(statement);
					}
				}
				ts.forEachChild(node, walk);
			});
			function reportWithFix(statement: ts.Statement) {
				reportWarning(
					`Statements should be wrapped in braces.`,
					statement.getStart(sourceFile),
					statement.getEnd()
				).withFix(
					'Add braces around the statement',
					() => [{
						fileName: sourceFile.fileName,
						textChanges: [
							{
								newText: isSameLine(statement)
									? ' {\n'
									: ' {',
								span: {
									start: statement.getFullStart(),
									length: 0,
								},
							},
							{
								newText: '\n}',
								span: {
									start:
										ts.getTrailingCommentRanges(
											sourceFile.text,
											statement.getEnd(),
										)?.reverse()?.[0]?.end
										?? statement.getEnd(),
									length: 0,
								},
							}
						],
					}]
				);
			}
			function isSameLine(node: ts.Node) {
				return ts.getLineAndCharacterOfPosition(sourceFile, node.getFullStart()).line
					=== ts.getLineAndCharacterOfPosition(sourceFile, node.parent.getEnd()).line;
			}
		},
		/**
		 * @example
		 * ```ts
		 * import * as ts from 'typescript';
		 * ```
		 * should be
		 * ```ts
		 * import type * as ts from 'typescript';
		 * ```
		 */
		'typescript-import-type'({ typescript: ts, sourceFile, reportError }) {
			ts.forEachChild(sourceFile, function walk(node) {
				if (ts.isImportDeclaration(node) && node.moduleSpecifier.getText(sourceFile).slice(1, -1) === 'typescript' && !node.importClause?.isTypeOnly) {
					reportError(
						`Importing 'typescript' should use 'import type'.`,
						node.getStart(sourceFile),
						node.getEnd()
					).withFix(
						'Add "type" to import statement',
						() => [{
							fileName: sourceFile.fileName,
							textChanges: [{
								newText: 'import type',
								span: {
									start: node.getStart(sourceFile),
									length: 'import'.length,
								},
							}],
						}]
					);
				}
				ts.forEachChild(node, walk);
			});
		},
		/**
		 * @example
		 * ```ts
		 * const foo = (bar) => {};
		 * ```
		 * should be
		 * ```ts
		 * const foo = bar => {};
		 * ```
		 */
		'arrow-parens'({ typescript: ts, sourceFile, reportWarning }) {
			ts.forEachChild(sourceFile, function walk(node) {
				if (
					ts.isArrowFunction(node)
					&& node.parameters.length === 1
					&& !node.type
				) {
					const parameter = node.parameters[0];
					if (
						ts.isIdentifier(parameter.name)
						&& !parameter.type
						&& !parameter.dotDotDotToken
						&& sourceFile.text[parameter.getStart(sourceFile) - 1] === '('
						&& sourceFile.text[parameter.getEnd()] === ')'
					) {
						reportWarning(
							`Parentheses should be omitted.`,
							parameter.getStart(sourceFile),
							parameter.getEnd()
						).withFix(
							'Remove parentheses around the parameter',
							() => [{
								fileName: sourceFile.fileName,
								textChanges: [
									{
										newText: '',
										span: {
											start: parameter.getStart(sourceFile) - 1,
											length: 1,
										},
									},
									{
										newText: '',
										span: {
											start: parameter.getEnd(),
											length: 1,
										},
									}
								],
							}]
						);
					}
				}
				ts.forEachChild(node, walk);
			});
		},
		'need-format'({ typescript: ts, sourceFile, languageService, reportWarning }) {
			const textChanges = languageService.getFormattingEditsForDocument(sourceFile.fileName, {
				...ts.getDefaultFormatCodeSettings(),
				convertTabsToSpaces: false,
				tabSize: 4,
				indentSize: 4,
				indentStyle: ts.IndentStyle.Smart,
				newLineCharacter: '\n',
				insertSpaceAfterCommaDelimiter: true,
				insertSpaceAfterConstructor: false,
				insertSpaceAfterSemicolonInForStatements: true,
				insertSpaceBeforeAndAfterBinaryOperators: true,
				insertSpaceAfterKeywordsInControlFlowStatements: true,
				insertSpaceAfterFunctionKeywordForAnonymousFunctions: true,
				insertSpaceBeforeFunctionParenthesis: false,
				insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
				insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: false,
				insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
				insertSpaceAfterOpeningAndBeforeClosingEmptyBraces: true,
				insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: false,
				insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: false,
				insertSpaceAfterTypeAssertion: false,
				placeOpenBraceOnNewLineForFunctions: false,
				placeOpenBraceOnNewLineForControlBlocks: false,
				semicolons: ts.SemicolonPreference.Ignore,
			});
			for (const textChange of textChanges) {
				const originalText = sourceFile.text.slice(textChange.span.start, textChange.span.start + textChange.span.length);
				if (originalText !== textChange.newText) {
					reportWarning(
						`The document is not formatted.`,
						textChange.span.start,
						textChange.span.start + textChange.span.length
					).withFix(
						'Format the file',
						() => [{
							fileName: sourceFile.fileName,
							textChanges: [textChange],
						}]
					);
				}
			}
		},
		'no-unnecessary-non-null-assertion'({ typescript: ts, sourceFile, languageService, reportWarning }) {
			ts.forEachChild(sourceFile, function walk(node) {
				if (ts.isNonNullExpression(node)) {
					const typeChecker = languageService.getProgram()!.getTypeChecker();
					const type = typeChecker.getTypeAtLocation(node.expression);
					if (typeChecker.typeToString(type) === typeChecker.typeToString(type.getNonNullableType())) {
						reportWarning(
							`Unnecessary non-null assertion.`,
							node.getStart(sourceFile),
							node.getEnd()
						).withFix(
							'Remove unnecessary non-null assertion',
							() => [{
								fileName: sourceFile.fileName,
								textChanges: [
									{
										newText: '',
										span: {
											start: node.expression.getEnd(),
											length: node.getEnd() - node.expression.getEnd(),
										},
									}
								],
							}]
						);
					}
				}
				ts.forEachChild(node, walk);
			});
		},
		/**
		 * @example
		 * ```ts
		 * const obj = { prop: 'value' };
		 * obj.prop;
		 * ```
		 * should be
		 * ```ts
		 * const obj = { prop: 'value' };
		 * // Use the property
		 * console.log(obj.prop);
		 * ```
		 */
		'no-unused-property-access'({ typescript: ts, sourceFile, reportWarning }) {
			ts.forEachChild(sourceFile, function walk(node) {
				if (ts.isPropertyAccessExpression(node)) {
					const parent = node.parent;
					if (ts.isExpressionStatement(parent)) {
						reportWarning(
							`Property '${node.name.text}' is accessed but not used.`,
							node.getStart(sourceFile),
							node.getEnd()
						).withFix(
							'Remove unused property access',
							() => [{
								fileName: sourceFile.fileName,
								textChanges: [
									{
										newText: '',
										span: {
											start: parent.getStart(sourceFile),
											length: parent.getEnd() - parent.getStart(sourceFile),
										},
									}
								],
							}]
						);
					}
				}
				ts.forEachChild(node, walk);
			});
		},
		'no-unused-variable-access'({ typescript: ts, sourceFile, reportWarning }) {
			ts.forEachChild(sourceFile, function walk(node) {
				if (ts.isIdentifier(node)) {
					const parent = node.parent;
					if (ts.isExpressionStatement(parent)) {
						reportWarning(
							`Variable '${node.text}' is accessed but not used.`,
							node.getStart(sourceFile),
							node.getEnd()
						).withFix(
							'Remove unused variable access',
							() => [{
								fileName: sourceFile.fileName,
								textChanges: [
									{
										newText: '',
										span: {
											start: parent.getStart(sourceFile),
											length: parent.getEnd() - parent.getStart(sourceFile),
										},
									}
								],
							}]
						);
					}
				}
				ts.forEachChild(node, walk);
			});
		},
	},
	plugins: [
		ctx => ({
			resolveRules(rules) {
				if (ctx.tsconfig.endsWith('/kit/tsconfig.json')) {
					delete rules['typescript-import-type'];
				}
				return rules;
			},
		}),
	]
});
