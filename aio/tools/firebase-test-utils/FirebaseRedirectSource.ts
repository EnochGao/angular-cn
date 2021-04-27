import * as XRegExp from 'xregexp';

// The `XRegExp` typings are not accurate.
interface XRegExp extends RegExp {
  xregexp: { captureNames?: string[] };
}

export class FirebaseRedirectSource {
  regex = XRegExp(this.pattern) as XRegExp;
  namedGroups: string[] = [];

  private constructor(public pattern: string, public restNamedGroups: string[] = []) {
    const restNamedGroupsSet = new Set(restNamedGroups);
    pattern.replace(/\(\?<([^>]+)>/g, (_, name) => {
      if (!restNamedGroupsSet.has(name)) {
        this.namedGroups.push(name);
      }
      return '';
    });
  }

  static fromGlobPattern(glob: string): FirebaseRedirectSource {
    const dot = /\./g;
    const star = /\*/g;
    const doubleStar = /(^|\/)\*\*($|\/)/g;           // e.g. a/**/b or **/b or a/** but not a**b
    const modifiedPatterns = /(.)\(([^)]+)\)/g;       // e.g. `@(a|b)
    const restParam = /\/:([A-Za-z]+)\*/g;            // e.g. `:rest*`
    const namedParam = /\/:([A-Za-z]+)/g;             // e.g. `:api`
    const possiblyEmptyInitialSegments = /^\.🐷\//g;  // e.g. `**/a` can also match `a`
    const possiblyEmptySegments = /\/\.🐷\//g;        // e.g. `a/**/b` can also match `a/b`
    const willBeStar = /🐷/g;                         // e.g. `a**b` not matched by previous rule

    try {
      const restNamedGroups: string[] = [];
      const pattern = glob
          .replace(dot, '\\.')
          .replace(modifiedPatterns, replaceModifiedPattern)
          .replace(restParam, (_, param) => {
            // capture the rest of the string
            restNamedGroups.push(param);
            return `(?:/(?<${param}>.🐷))?`;
          })
          .replace(namedParam, `/(?<$1>[^/]+)`)
          .replace(doubleStar, '$1.🐷$2')                 // use the pig to avoid replacing ** in next rule
          .replace(star, '[^/]*')                         // match a single segment
          .replace(possiblyEmptyInitialSegments, '(?:.*)')// deal with **/ special cases
          .replace(possiblyEmptySegments, '(?:/|/.*/)')   // deal with /**/ special cases
          .replace(willBeStar, '*');                      // other ** matches

      return new FirebaseRedirectSource(`^${pattern}$`, restNamedGroups);
    } catch (err) {
      throw new Error(`Error in FirebaseRedirectSource: "${glob}" - ${err.message}`);
    }
  }

  test(url: string): boolean {
    return XRegExp.test(url, this.regex);
  }

  match(url: string): { [key: string]: string } | undefined {
    const match = XRegExp.exec(url, this.regex) as ReturnType<typeof XRegExp.exec>;

    if (!match) {
      return undefined;
    }

    const result: { [key: string]: string } = {};
    const names = this.regex.xregexp.captureNames || [];
    names.forEach(name => result[name] = match.groups![name]);
    return result;
  }
}

function replaceModifiedPattern(_: string, modifier: string, pattern: string) {
  switch (modifier) {
    case '!':
      throw new Error(`"not" expansions are not supported: "${_}"`);
    case '?':
    case '+':
      return `(${pattern})${modifier}`;
    case '*':
      return `(${pattern})🐷`;  // it will become a star
    case '@':
      return `(${pattern})`;
    default:
      throw new Error(`unknown expansion type: "${modifier}" in "${_}"`);
  }
}
