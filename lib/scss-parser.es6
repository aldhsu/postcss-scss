const Comment = require('postcss/lib/comment')
const Parser = require('postcss/lib/parser')

const NestedDeclaration = require('./nested-declaration')
const scssTokenizer = require('./scss-tokenize')

class ScssParser extends Parser {
  createTokenizer () {
    this.tokenizer = scssTokenizer(this.input)
  }

  rule (tokens) {
    let withColon = false
    let brackets = 0
    let value = ''
    for (const i of tokens) {
      if (withColon) {
        if (i[0] !== 'comment' && i[0] !== '{') {
          value += i[1]
        }
      } else if (i[0] === 'space' && i[1].indexOf('\n') !== -1) {
        break
      } else if (i[0] === '(') {
        brackets += 1
      } else if (i[0] === ')') {
        brackets -= 1
      } else if (brackets === 0 && i[0] === ':') {
        withColon = true
      }
    }

    if (!withColon || value.trim() === '' || /^[a-zA-Z-:#]/.test(value)) {
      super.rule(tokens)
    } else {
      tokens.pop()
      const node = new NestedDeclaration()
      this.init(node)

      const last = tokens[tokens.length - 1]
      if (last[4]) {
        node.source.end = { line: last[4], column: last[5] }
      } else {
        node.source.end = { line: last[2], column: last[3] }
      }

      while (tokens[0][0] !== 'word') {
        node.raws.before += tokens.shift()[1]
      }
      node.source.start = { line: tokens[0][2], column: tokens[0][3] }

      node.prop = ''
      while (tokens.length) {
        const type = tokens[0][0]
        if (type === ':' || type === 'space' || type === 'comment') {
          break
        }
        node.prop += tokens.shift()[1]
      }

      node.raws.between = ''

      let token
      while (tokens.length) {
        token = tokens.shift()

        if (token[0] === ':') {
          node.raws.between += token[1]
          break
        } else {
          node.raws.between += token[1]
        }
      }

      if (node.prop[0] === '_' || node.prop[0] === '*') {
        node.raws.before += node.prop[0]
        node.prop = node.prop.slice(1)
      }
      node.raws.between += this.spacesAndCommentsFromStart(tokens)
      this.precheckMissedSemicolon(tokens)

      for (let i = tokens.length - 1; i > 0; i--) {
        token = tokens[i]
        if (token[1] === '!important') {
          node.important = true
          let string = this.stringFrom(tokens, i)
          string = this.spacesFromEnd(tokens) + string
          if (string !== ' !important') {
            node.raws.important = string
          }
          break
        } else if (token[1] === 'important') {
          const cache = tokens.slice(0)
          let str = ''
          for (let j = i; j > 0; j--) {
            const type = cache[j][0]
            if (str.trim().indexOf('!') === 0 &&
                            type !== 'space'
            ) {
              break
            }
            str = cache.pop()[1] + str
          }
          if (str.trim().indexOf('!') === 0) {
            node.important = true
            node.raws.important = str
            tokens = cache
          }
        }

        if (token[0] !== 'space' && token[0] !== 'comment') {
          break
        }
      }

      this.raw(node, 'value', tokens)

      if (node.value.indexOf(':') !== -1) {
        this.checkMissedSemicolon(tokens)
      }

      this.current = node
    }
  }

  comment (token) {
    if (token[6] === 'inline') {
      const node = new Comment()
      this.init(node, token[2], token[3])
      node.raws.inline = true
      node.source.end = { line: token[4], column: token[5] }

      const text = token[1].slice(2)
      if (/^\s*$/.test(text)) {
        node.text = ''
        node.raws.left = text
        node.raws.right = ''
      } else {
        const match = text.match(/^(\s*)([^]*[^\s])(\s*)$/)
        const fixed = match[2].replace(/(\*\/|\/\*)/g, '*//*')
        node.text = fixed
        node.raws.left = match[1]
        node.raws.right = match[3]
        node.raws.text = match[2]
      }
    } else {
      super.comment(token)
    }
  }

  raw (node, prop, tokens) {
    super.raw(node, prop, tokens)
    if (node.raws[prop]) {
      const scss = node.raws[prop].raw
      node.raws[prop].raw = tokens.reduce((all, i) => {
        if (i[0] === 'comment' && i[6] === 'inline') {
          const text = i[1].slice(2).replace(/(\*\/|\/\*)/g, '*//*')
          return all + '/*' + text + '*/'
        } else {
          return all + i[1]
        }
      }, '')
      if (scss !== node.raws[prop].raw) {
        node.raws[prop].scss = scss
      }
    }
  }
}

module.exports = ScssParser
