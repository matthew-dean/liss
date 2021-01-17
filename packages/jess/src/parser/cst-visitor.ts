import { CstChild, CstNode, IToken } from '@jesscss/css-parser'
import { isToken, getLocation } from './util'
import { tokenMatcher } from 'chevrotain'
import type { JessParser } from '@jess/parser'
import {
  Anonymous,
  Call,
  Node,
  Root,
  Rule,
  List,
  Ruleset,
  Declaration,
  Expression,
  NodeMap,
  WS,
  Dimension,
  ILocationInfo
} from '../tree'

export class CstVisitor {
  [k: string]: any
  parser: JessParser

  constructor(parser: JessParser) {
    this.parser = parser
  }

  visit(ctx: CstChild): any {
    if (!ctx) {
      return
    }
    if (isToken(ctx)) {
      const tokens = this.parser.T
      const {
        image,
        startLine,
        startColumn,
        startOffset,
        endLine,
        endColumn,
        endOffset
      } = ctx

      const loc: ILocationInfo = [
        startLine,
        startColumn,
        startOffset,
        endLine,
        endColumn,
        endOffset
      ]

      let Clazz: any
      if (tokenMatcher(ctx, tokens.Dimension) || tokenMatcher(ctx, tokens.Number)) {
        return new Dimension(image, loc)
      }

      /** @todo - make more Node types eventually? */
      if (tokenMatcher(ctx, tokens.WS)) {
        Clazz = WS
      } else {
        Clazz = Anonymous
      }

      return new Clazz(image, loc)
    }
    const visit = this[ctx.name]
    return visit ? visit.call(this, ctx) : {}
  }

  visitArray(coll: CstChild[]) {
    return coll.map(node => this.visit(node)).filter(node => node)
  }

  /** Start building AST */
  root({ children, location }: CstNode) {
    const nodes = this.visitArray(children)
    return new Root(nodes, getLocation(location))
  }

  rule({ children, location }: CstNode): Node {
    let [pre, rule] = children
    // const ws = processWS(<IToken>pre)
    const ws = this.visit(pre)
    const node = this.visit(rule)
    return node
  }

  qualifiedRule({ children, location }: CstNode) {
    const [ selectorList, curlyBlock ] = children
    const sels = this.visit(selectorList)
    const value = this.visit(curlyBlock)
    return new Rule({ sels, value }, getLocation(location))
  }

  selectorList({ children, location}: CstNode) {
    const list = children.filter((val, i) => {
      return i % 2 === 0
    }).map(node => this.visit(node))
    return new List(list, getLocation(location))
  }

  complexSelector({ children, location }: CstNode) {
    const [ selectors, extend ] = children
    return {}
  }

  compoundSelector({ children, location }: any) {
    return children
  }

  curlyBlock({ children, location}: CstNode) {
    const rules = this.visit(children[1])
    return new Ruleset(rules, getLocation(location))
  }

  rules({ children, location }: CstNode) {
    return this.visitArray(children)
  }

  declaration({ children, location }: CstNode) {
    const name = this.visit(children[0])
    const value = this.visit(children[4])
    return new Declaration({ name, value }, getLocation(location))
  }

  /**
   * A property can contain interpolated statements,
   * so it's an expression
   */
  property({ children, location }: CstNode) {
    const name = this.visitArray(children)
    return new Expression(name, getLocation(location))
  }

  function({ children, location }: CstNode) {
    const name = (<IToken>children[0]).image.slice(0, -1)
    const value = this.visit(children[1])
    return new Call({ name, value }, getLocation(location))
  }

  expression({ children, location }: CstNode) {
    const value = this.visitArray(children)
    return new Expression(value, getLocation(location))
  }
}