import { ReadonlySignal, Signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { useListenSignal } from "./use-listen-signal.ts";

export type RouterOptions = {
  links: boolean;
  search: boolean;
};

/// VERY WIP Version of nanostores router, but on top of Signals.

// type InputPage<Config extends RouterConfig = RouterConfig, PageName extends keyof Config = any> = PageName extends any
//   ? Input<ParamsFromConfig<Config>[PageName]> extends EmptyObject
//     ? {
//         params?: Input<ParamsFromConfig<Config>[PageName]>;
//         route: PageName;
//       }
//     : {
//         params: Input<ParamsFromConfig<Config>[PageName]>;
//         route: PageName;
//       }
//   : never;

// Splitting string by delimiter
type Split<S extends string, D extends string> = string extends S
  ? string[]
  : S extends ""
    ? []
    : S extends `${infer T}${D}${infer U}`
      ? [T, ...Split<U, D>]
      : [S];

// Converting path array to object
type PathToParams<PathArray, Params> = PathArray extends [infer First, ...infer Rest]
  ? First extends `:${infer Param}`
    ? // eslint-disable-next-line @typescript-eslint/no-shadow
      First extends `:${infer Param}?`
      ? PathToParams<Rest, Params & Partial<Record<Param, string>>>
      : PathToParams<Rest, Params & Record<Param, string>>
    : PathToParams<Rest, Params>
  : Params;

type ParseUrl<Path extends string> = PathToParams<Split<Path, "/">, {}>;

type ParamsFromConfig<K extends RouterConfig> = {
  [key in keyof K]: K[key] extends Pattern<infer P> ? P : K[key] extends string ? ParseUrl<K[key]> : never;
};

type EmptyObject = Record<string, never>;
type SearchParams = Record<string, number | string>;
type Input<T> = {
  [P in keyof T]: number | string;
};

type MappedC<A, B> = {
  [K in keyof A & keyof B]: A[K] extends B[K] ? never : K;
};
type OptionalKeys<T> = MappedC<T, Required<T>>[keyof T];

export type ParamsArg<
  Config extends RouterConfig,
  PageName extends keyof Config,
> = keyof ParamsFromConfig<Config>[PageName] extends never
  ? [EmptyObject?, SearchParams?]
  : keyof ParamsFromConfig<Config>[PageName] extends OptionalKeys<ParamsFromConfig<Config>[PageName]>
    ? [Input<ParamsFromConfig<Config>[PageName]>?, SearchParams?]
    : [Input<ParamsFromConfig<Config>[PageName]>, SearchParams?];

type Pattern<RouteParams> = Readonly<[RegExp, (...parts: string[]) => RouteParams]>;
export type RouterConfig = Record<string, Pattern<any> | RegExp | string>;

export type Page<Config extends RouterConfig = RouterConfig, PageName extends keyof Config = any> = PageName extends any
  ? {
      hash: string;
      params: ParamsFromConfig<Config>[PageName];
      path: string;
      route: PageName;
      search: Record<string, string>;
    }
  : never;

export class SignalRouter<const Config extends RouterConfig> {
  readonly #signal: Signal<Page<Config, keyof Config> | undefined>;
  readonly #opts: RouterOptions;

  #prev: string | undefined;

  readonly routes: ReadonlyArray<[string, RegExp, (...params: string[]) => object, string?]>;

  constructor(routes: Config, opts: Partial<RouterOptions> = {}) {
    this.#prev = undefined;
    this.#opts = {
      links: opts.links ?? false,
      search: opts.search ?? false,
    };

    this.routes = Object.keys(routes).map((name) => {
      let pattern = routes[name];

      if (typeof pattern !== "string") {
        return [name, ...[pattern].flat()];
      }

      pattern = pattern.replace(/\/$/g, "") || "/";

      let regexp = pattern
        .replace(/[\s!#$()+,.:<=?[\\\]^{|}]/g, "\\$&")
        .replace(/\/\\:(\w+)\\\?/g, "(?:/(?<$1>(?<=/)[^/]+))?")
        .replace(/\/\\:(\w+)/g, "/(?<$1>[^/]+)");

      return [name, RegExp("^" + regexp + "$", "i"), null, pattern];
    }) as any;

    let click = (event: any) => {
      let link = event.target.closest("a");
      if (
        link &&
        event.button === 0 && // Left mouse button
        link.target !== "_blank" && // Not for new tab
        link.origin === location.origin && // Not external link
        link.rel !== "external" && // Not external link
        link.target !== "_self" && // Now manually disabled
        !link.download && // Not download link
        !event.altKey && // Not download link by user
        !event.metaKey && // Not open in new tab by user
        !event.ctrlKey && // Not open in new tab by user
        !event.shiftKey && // Not open in new window by user
        !event.defaultPrevented // Click was not cancelled
      ) {
        event.preventDefault();
        let hashChanged = location.hash !== link.hash;
        this.open(link.href);
        if (hashChanged) {
          location.hash = link.hash;
          if (link.hash === "" || link.hash === "#") {
            window.dispatchEvent(new HashChangeEvent("hashchange"));
          }
        }
      }
    };

    this.#signal = new Signal(this.parse(initialValue()));

    let change = () => {
      console.log("change", location.href);
      let page = this.parse(location.href);
      if (page) {
        this.#signal.value = page;
      }
    };

    if (typeof window !== "undefined" && typeof location !== "undefined") {
      let subscribers = 0;
      const subscribeOrig = this.#signal.subscribe.bind(this.#signal);
      this.#signal.subscribe = (value) => {
        subscribers += 1;
        if (subscribers == 1) {
          let page = this.parse(location.href);
          if (page) this.#signal.value = page;
          if (opts.links !== false) document.body.addEventListener("click", click);
          window.addEventListener("popstate", change);
          window.addEventListener("hashchange", change);
        }
        const unsubscribe = subscribeOrig(value);
        return () => {
          subscribers -= 1;
          if (subscribers <= 0) {
            this.#prev = undefined;
            document.body.removeEventListener("click", click);
            window.removeEventListener("popstate", change);
            window.removeEventListener("hashchange", change);
          }
          unsubscribe();
        };
      };
    } else {
      this.#signal.value = this.parse("/");
    }
  }

  open(path: string, redirect?: boolean): void {
    let page = this.parse(path);
    if (page) {
      if (typeof history !== "undefined") {
        if (redirect) {
          history.replaceState(null, "unused", path);
        } else {
          history.pushState(null, "unused", path);
        }
      }
      this.#signal.value = page;
    }
  }

  get signal(): ReadonlySignal<Page<Config, keyof Config> | undefined> {
    return this.#signal;
  }

  get page(): Page<Config, keyof Config> | undefined {
    return this.#signal.value;
  }

  parse(href: string): Page<Config, keyof Config> | undefined {
    let url = new URL(href.replace(/#$/, ""), "http://a");
    let cache = url.pathname + url.search + url.hash;
    if (this.#prev === cache) return undefined;
    this.#prev = cache;

    let path = this.#opts.search ? url.pathname + url.search : url.pathname;
    path = path.replace(/\/($|\?)/, "$1") || "/";

    for (let [route, regexp, callback] of this.routes) {
      let match = path.match(regexp);
      if (match) {
        return {
          hash: url.hash,
          params: callback
            ? callback(...match.slice(1))
            : Object.keys({ ...match.groups }).reduce((params: any, key: any) => {
                const g = match.groups![key];
                params[key] = g ? decodeURIComponent(g) : "";
                return params;
              }, {}),
          path,
          route,
          search: Object.fromEntries(url.searchParams),
        } as any;
      }
    }
  }
}

export function getPagePath<const Config extends RouterConfig, PageName extends keyof Config>(
  router: SignalRouter<Config>,
  name: PageName,
  ...params: ParamsArg<Config, PageName>
): string;
// export function getPagePath<const Config extends RouterConfig, PageName extends keyof Config>(
//   router: SignalRouter<Config>,
//   route: InputPage<Config, PageName>,
//   search?: SearchParams,
// ): string;
export function getPagePath<const Config extends RouterConfig>(
  router: SignalRouter<Config>,
  name: keyof Config,
  params: any,
  search: any,
) {
  if (typeof name === "object") {
    search = params;
    // @ts-expect-error
    params = name.params;
    // @ts-expect-error
    name = name.route;
  }
  let route = router.routes.find((i) => i[0] === name);
  // @ts-expect-error
  if (process.env.NODE_ENV !== "production") {
    // @ts-expect-error
    if (!route[3]) throw new Error("RegExp routes are not supported");
  }
  // @ts-expect-error
  let path = route[3]
    .replace(/\/:\w+\?/g, (i) => {
      let param = params && params[i.slice(2, -1)];
      if (param) {
        return "/" + encodeURIComponent(param);
      } else {
        return "";
      }
    })
    .replace(/\/:\w+/g, (i) => "/" + encodeURIComponent(params[i.slice(2)]));
  if (search) {
    let postfix = "" + new URLSearchParams(search);
    if (postfix) return path + "?" + postfix;
  }
  return path;
}

export function openPage<Config extends RouterConfig, PageName extends keyof Config>(
  router: SignalRouter<Config>,
  name: PageName,
  ...params: ParamsArg<Config, PageName>
): void;
// export function openPage<
//   Config extends RouterConfig,
//   PageName extends keyof Config
// >(
//   router: SignalRouter<Config>,
//   route: InputPage<Config, PageName>,
//   search?: SearchParams
// ): void
export function openPage<Config extends RouterConfig>(
  router: SignalRouter<Config>,
  name: any,
  params: any,
  search?: any,
) {
  router.open(getPagePath(router, name, params, search));
}

export function redirectPage<Config extends RouterConfig, PageName extends keyof Config>(
  router: SignalRouter<Config>,
  name: PageName,
  ...params: ParamsArg<Config, PageName>
): void;
// export function redirectPage<
//   Config extends RouterConfig,
//   PageName extends keyof Config
// >(
//   router: SignalRouter<Config>,
//   route: InputPage<Config, PageName>,
//   search?: SearchParams
// ): void
export function redirectPage<Config extends RouterConfig>(
  router: SignalRouter<Config>,
  name: any,
  params: any,
  search?: any,
) {
  router.open(getPagePath(router, name, params, search), true);
}

function initialValue() {
  if (typeof location !== "undefined") {
    return location.href;
  } else {
    return "/";
  }
}

export function useRouterUpdates<T extends RouterConfig>(router: SignalRouter<T>) {
  useSignals();
  useListenSignal(router.signal);

  return router;
}
