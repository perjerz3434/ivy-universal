import { createMap } from "./util";

export interface Delegate {
  contextEntered?(context: string, route: MatchDSL): void;
  willAddRoute?(context: string | undefined, route: string): string;
}

export type Opaque = {} | void | null | undefined;

export interface Route {
  path: string;
  handler: Opaque;
  queryParams?: string[];
}

export interface RouteRecognizer {
  delegate: Delegate | undefined;
  add(routes: Route[]): void;
}

export interface MatchCallback {
  (match: MatchDSL): void;
}

export interface MatchDSL {
  (path: string): ToDSL;
  (path: string, callback: MatchCallback): void;
}

export interface ToDSL {
  to(name: string, callback?: MatchCallback): void;
}

class Target implements ToDSL {
  path: string;
  matcher: Matcher;
  delegate: Delegate | undefined;

  constructor(path: string, matcher: Matcher, delegate: Delegate | undefined) {
    this.path = path;
    this.matcher = matcher;
    this.delegate = delegate;
  }

  to(target: string, callback: MatchCallback) {
    let delegate = this.delegate;

    if (delegate && delegate.willAddRoute) {
      target = delegate.willAddRoute(this.matcher.target, target);
    }

    this.matcher.add(this.path, target);

    if (callback) {
      if (callback.length === 0) { throw new Error("You must have an argument in the function passed to `to`"); }
      this.matcher.addChild(this.path, target, callback, this.delegate);
    }
  }
}

export class Matcher {
  routes: {
    [path: string]: string | undefined;
  };
  children: {
    [path: string]: Matcher | undefined;
  };
  target: string | undefined;

  constructor(target?: string) {
    this.routes = createMap<string>();
    this.children = createMap<Matcher>();
    this.target = target;
  }

  add(path: string, target: string) {
    this.routes[path] = target;
  }

  addChild(path: string, target: string, callback: MatchCallback, delegate: Delegate | undefined) {
    let matcher = new Matcher(target);
    this.children[path] = matcher;

    let match = generateMatch(path, matcher, delegate);

    if (delegate && delegate.contextEntered) {
      delegate.contextEntered(target, match);
    }

    callback(match);
  }
}

function generateMatch(startingPath: string, matcher: Matcher, delegate: Delegate | undefined): MatchDSL {
  function match(path: string): ToDSL;
  function match(path: string, callback: MatchCallback): void;
  function match(path: string, callback?: MatchCallback): ToDSL | void {
    let fullPath = startingPath + path;
    if (callback) {
      callback(generateMatch(fullPath, matcher, delegate));
    } else {
      return new Target(fullPath, matcher, delegate);
    }
  };
  return match;
}
