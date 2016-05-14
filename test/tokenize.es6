import tokenize from '../lib/scss-tokenize';

import { expect } from 'chai';
import   Input    from 'postcss/lib/input';

let test = (css, tokens) => {
    expect(tokenize(new Input(css))).to.eql(tokens);
};

describe('SCSS Tokenizer', () => {

    it('tokenizes inline comments', () => {
        test('// a\n', [ ['comment', '// a', 1, 1, 1, 4, 'inline'],
                         ['space', '\n'] ]);
    });

    it('tokenizes inline comments with any new line', () => {
        test('// a\r\n', [ ['comment', '// a', 1, 1, 1, 4, 'inline'],
                           ['space', '\r\n'] ]);
    });

    it('tokenizes inline comments in end of file', () => {
        test('// a', [ ['comment', '// a', 1, 1, 1, 4, 'inline'] ]);
    });

    it('tokenizes interpolation', () => {
        test('#{a\nb}', [ ['word', '#{a\nb}', 1, 1, 2, 2] ]);
    });

    it('tokenizes interpolations', () => {
        test('#{#{#{}}}', [ ['word', '#{#{#{}}}', 1, 1, 1, 9] ]);
    });

});
