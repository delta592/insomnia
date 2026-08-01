type TokenPattern = string | RegExp | ((char: string) => boolean);

/**
 * Minimal CodeMirror StringStream compatible with graphql-language-service onlineParser.
 */
export class GraphQLStringStream {
  pos = 0;
  start = 0;
  string: string;

  constructor(sourceText: string) {
    this.string = sourceText;
  }

  eol(): boolean {
    return this.pos >= this.string.length;
  }

  sol(): boolean {
    return this.pos === 0;
  }

  peek(): string | undefined {
    return this.string.charAt(this.pos) || undefined;
  }

  next(): string {
    return this.string.charAt(this.pos++);
  }

  eat(pattern: TokenPattern): string | undefined {
    const char = this.string.charAt(this.pos);
    const matched =
      typeof pattern === 'string'
        ? char === pattern
        : pattern instanceof RegExp
          ? pattern.test(char)
          : pattern(char);
    if (matched) {
      this.start = this.pos;
      this.pos++;
      return char;
    }
    return undefined;
  }

  eatWhile(pattern: TokenPattern): boolean {
    const start = this.pos;
    while (!this.eol()) {
      const char = this.string.charAt(this.pos);
      const matched =
        typeof pattern === 'string'
          ? char === pattern
          : pattern instanceof RegExp
            ? pattern.test(char)
            : pattern(char);
      if (!matched) {
        break;
      }
      if (this.pos === start) {
        this.start = this.pos;
      }
      this.pos++;
    }
    return this.pos > start;
  }

  eatSpace(): boolean {
    return this.eatWhile(/[\s\u00A0]/);
  }

  skipToEnd(): void {
    this.pos = this.string.length;
  }

  backUp(n: number): void {
    this.pos -= n;
  }

  match(pattern: TokenPattern, consume: boolean | null = true, caseFold: boolean | null = false): RegExpMatchArray | boolean {
    let token: string | null = null;
    let match: RegExpMatchArray | null = null;

    if (typeof pattern === 'string') {
      const regex = new RegExp(pattern, caseFold ? 'i' : 'g');
      match = regex.test(this.string.slice(this.pos, this.pos + pattern.length)) ? [pattern] : null;
      token = pattern;
    } else if (pattern instanceof RegExp) {
      match = this.string.slice(this.pos).match(pattern);
      token = match?.[0] ?? null;
    }

    if (
      match &&
      (typeof pattern === 'string' || (Array.isArray(match) && this.string.startsWith(match[0], this.pos)))
    ) {
      if (consume) {
        this.start = this.pos;
        if (token?.length) {
          this.pos += token.length;
        }
      }
      return match;
    }

    return false;
  }

  current(): string {
    return this.string.slice(this.start, this.pos);
  }

  indentation(): number {
    const match = this.string.match(/\s*/);
    let indent = 0;
    if (match?.[0]) {
      let pos = 0;
      while (pos < match[0].length) {
        if (match[0].codePointAt(pos) === 9) {
          indent += 2;
        } else {
          indent++;
        }
        pos++;
      }
    }
    return indent;
  }

  column(): number {
    return this.pos;
  }
}
