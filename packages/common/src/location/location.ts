/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {EventEmitter, Injectable} from '@angular/core';
import {SubscriptionLike} from 'rxjs';

import {LocationStrategy} from './location_strategy';
import {PlatformLocation} from './platform_location';

/** @publicApi */
export interface PopStateEvent {
  pop?: boolean;
  state?: any;
  type?: string;
  url?: string;
}

/**
 * @description
 *
 * A service that applications can use to interact with a browser's URL.
 *
 * 一个服务，应用可以用它来与浏览器的 URL 互动。
 *
 * Depending on the {@link LocationStrategy} used, `Location` will either persist
 * to the URL's path or the URL's hash segment.
 *
 * 这取决于使用了哪个 {@link LocationStrategy}，`Location` 可能会使用 URL 的路径进行持久化，也可能使用 URL 的哈希片段（`#`）进行持久化。
 *
 * @usageNotes
 *
 * It's better to use the {@link Router#navigate} service to trigger route changes. Use
 * `Location` only if you need to interact with or create normalized URLs outside of
 * routing.
 *
 * 最好使用 {@link Router#navigate} 服务来触发路由变更。只有当你要在路由体系之外创建规范化 URL 或与之交互时才会用到 `Location`。
 *
 * `Location` is responsible for normalizing the URL against the application's base href.
 * A normalized URL is absolute from the URL host, includes the application's base href, and has no
 * trailing slash:
 *
 * `Location` 负责基于应用的基地址（base href）对 URL 进行标准化。
 * 所谓标准化的 URL 就是一个从主机（host）开始算的绝对地址，包括应用的基地址，但不包括结尾的斜杠：
 *
 * - `/my/app/user/123` is normalized
 *
 *   `/my/app/user/123` 是标准化的
 *
 * - `my/app/user/123` **is not** normalized
 *
 *   `my/app/user/123` 不是标准化的
 *
 * - `/my/app/user/123/` **is not** normalized
 *
 *   `/my/app/user/123/` 不是标准化的
 *
 * ### Example
 *
 * {@example common/location/ts/path_location_component.ts region='LocationComponent'}
 *
 * @publicApi
 */
@Injectable()
export class Location {
  /** @internal */
  _subject: EventEmitter<any> = new EventEmitter();
  /** @internal */
  _baseHref: string;
  /** @internal */
  _platformStrategy: LocationStrategy;
  /** @internal */
  _platformLocation: PlatformLocation;
  /** @internal */
  _urlChangeListeners: ((url: string, state: unknown) => void)[] = [];

  constructor(platformStrategy: LocationStrategy, platformLocation: PlatformLocation) {
    this._platformStrategy = platformStrategy;
    const browserBaseHref = this._platformStrategy.getBaseHref();
    this._platformLocation = platformLocation;
    this._baseHref = Location.stripTrailingSlash(_stripIndexHtml(browserBaseHref));
    this._platformStrategy.onPopState((ev) => {
      this._subject.emit({
        'url': this.path(true),
        'pop': true,
        'state': ev.state,
        'type': ev.type,
      });
    });
  }

  /**
   * Returns the normalized URL path.
   *
   * 返回标准化之后的 URL 路径
   *
   * @param includeHash Whether path has an anchor fragment.
   *
   * 路径中是否包含一个锚点片段（Anchor fragment）。
   *
   * @returns The normalized URL path.
   *
   * 标准化之后的 URL 路径。
   *
   */
  // TODO: vsavkin. Remove the boolean flag and always include hash once the deprecated router is
  // removed.
  path(includeHash: boolean = false): string {
    return this.normalize(this._platformStrategy.path(includeHash));
  }

  /**
   * Returns the current value of the history.state object.
   */
  getState(): unknown { return this._platformLocation.getState(); }

  /**
   * Normalizes the given path and compares to the current normalized path.
   *
   * 对指定的路径进行标准化，并和当前的标准化路径进行比较。
   *
   * @param path The given URL path
   *
   * 指定的 URL 路径
   *
   * @param query Query parameters
   *
   * 查询参数
   *
   * @returns `true` if the given URL path is equal to the current normalized path, `false`
   * otherwise.
   *
   * 如果指定的 URL 路径和标准化之后的路径一样，则返回 `true`，否则返回 `false`。
   *
   */
  isCurrentPathEqualTo(path: string, query: string = ''): boolean {
    return this.path() == this.normalize(path + Location.normalizeQueryParams(query));
  }

  /**
   * Given a string representing a URL, returns the URL path after stripping the
   * trailing slashes.
   *
   * 给出一个字符串形式的 URL，返回一个标准化的 URL 路径，但不包括首尾的斜杠。
   *
   * @param url String representing a URL.
   *
   * 表示一个 URL。
   *
   * @returns Normalized URL string.
   *
   * 标准化之后的 URL 字符串。
   *
   */
  normalize(url: string): string {
    return Location.stripTrailingSlash(_stripBaseHref(this._baseHref, _stripIndexHtml(url)));
  }

  /**
   * Given a string representing a URL, returns the platform-specific external URL path.
   * If the given URL doesn't begin with a leading slash (`'/'`), this method adds one
   * before normalizing. This method also adds a hash if `HashLocationStrategy` is
   * used, or the `APP_BASE_HREF` if the `PathLocationStrategy` is in use.
   *
   * 给出一个字符串形式的 URL，返回一个平台相关的外部 URL 路径。
   * 如果鬼畜的 URL 不使用前导斜杠（`'/'`）开头的，那么该方法就会在标准化之前先添加一个。
   * 如果正在使用 `HashLocationStrategy` 策略，则该方法还会添加一个 `#` 符号；如果正在使用 `PathLocationStrategy` 策略，则添加 `APP_BASE_HREF`。
   *
   * @param url String representing a URL.
   *
   * 表示一个 URL。
   *
   * @returns  A normalized platform-specific URL.
   *
   * 标准化之后的平台相关 URL。
   *
   */
  prepareExternalUrl(url: string): string {
    if (url && url[0] !== '/') {
      url = '/' + url;
    }
    return this._platformStrategy.prepareExternalUrl(url);
  }

  // TODO: rename this method to pushState
  /**
   * Changes the browsers URL to a normalized version of the given URL, and pushes a
   * new item onto the platform's history.
   *
   * 把浏览器的 URL 修改为指定 URL 的标准化版本，并往所属平台（如浏览器）的历史堆栈中追加一个新条目。
   *
   * @param path  URL path to normalizze
   *
   * 要标准化的路径。
   *
   * @param query Query parameters
   *
   * 查询参数
   *
   * @param state Location history state
   *
   * 历史状态
   *
   */
  go(path: string, query: string = '', state: any = null): void {
    this._platformStrategy.pushState(state, '', path, query);
    this._notifyUrlChangeListeners(
        this.prepareExternalUrl(path + Location.normalizeQueryParams(query)), state);
  }

  /**
   * Changes the browser's URL to a normalized version of the given URL, and replaces
   * the top item on the platform's history stack.
   *
   * 把浏览器的 URL 修改为指定 URL 的标准化版本，并替换所属平台（如浏览器）的历史堆栈的顶部条目。
   *
   * @param path  URL path to normalizze
   *
   * 要标准化的路径
   *
   * @param query Query parameters
   *
   * 查询参数
   *
   * @param state Location history state
   *
   * 历史状态
   *
   */
  replaceState(path: string, query: string = '', state: any = null): void {
    this._platformStrategy.replaceState(state, '', path, query);
    this._notifyUrlChangeListeners(
        this.prepareExternalUrl(path + Location.normalizeQueryParams(query)), state);
  }

  /**
   * Navigates forward in the platform's history.
   *
   * 在所属平台（如浏览器）的历史堆栈中前进一步。
   */
  forward(): void { this._platformStrategy.forward(); }

  /**
   * Navigates back in the platform's history.
   *
   * 在所属平台（如浏览器）的历史堆栈中后退一步。
   */
  back(): void { this._platformStrategy.back(); }

  /**
   * Register URL change listeners. This API can be used to catch updates performed by the Angular
   * framework. These are not detectible through "popstate" or "hashchange" events.
   */
  onUrlChange(fn: (url: string, state: unknown) => void) {
    this._urlChangeListeners.push(fn);
    this.subscribe(v => { this._notifyUrlChangeListeners(v.url, v.state); });
  }

  /** @internal */
  _notifyUrlChangeListeners(url: string = '', state: unknown) {
    this._urlChangeListeners.forEach(fn => fn(url, state));
  }

  /**
   * Subscribe to the platform's `popState` events.
   *
   * 订阅所属平台（如浏览器）的 `popState` 事件。
   *
   * @param value Event that is triggered when the state history changes.
   *
   * 当状态历史发生变化时触发的事件
   *
   * @param exception The exception to throw.
   *
   * 要抛出的异常。
   *
   * @returns Subscribed events.
   *
   * 已订阅的事件。
   *
   */
  subscribe(
      onNext: (value: PopStateEvent) => void, onThrow?: ((exception: any) => void)|null,
      onReturn?: (() => void)|null): SubscriptionLike {
    return this._subject.subscribe({next: onNext, error: onThrow, complete: onReturn});
  }

  /**
   * Given a string of url parameters, prepend with `?` if needed, otherwise return the
   * parameters as is.
   *
   * 给定 URL 参数字符串，如果需要则增加 '?' 前缀，否则原样返回。
   *
   *  @param  params String of URL parameters
   *
   * URL 参数字符串
   *
   *  @returns URL parameters prepended with `?` or the parameters as is.
   *
   *  为 URL 参数加上 `?` 前缀，如果原来就有，则原样返回。
   *
   */
  public static normalizeQueryParams(params: string): string {
    return params && params[0] !== '?' ? '?' + params : params;
  }

  /**
   * Given 2 parts of a URL, join them with a slash if needed.
   *
   * 给定 url 的两个部分，把它们连接（join）在一起，如有必要则添加一个斜杠。
   *
   * @param start  URL string
   * @param end    URL string
   *
   *
   * @returns Given URL strings joined with a slash, if needed.
   *
   * 给定的一组 URL 字符串，如果需要，就用斜杠合在一起。
   *
   */
  public static joinWithSlash(start: string, end: string): string {
    if (start.length == 0) {
      return end;
    }
    if (end.length == 0) {
      return start;
    }
    let slashes = 0;
    if (start.endsWith('/')) {
      slashes++;
    }
    if (end.startsWith('/')) {
      slashes++;
    }
    if (slashes == 2) {
      return start + end.substring(1);
    }
    if (slashes == 1) {
      return start + end;
    }
    return start + '/' + end;
  }

  /**
   * If URL has a trailing slash, remove it, otherwise return the URL as is. The
   * method looks for the first occurrence of either `#`, `?`, or the end of the
   * line as `/` characters and removes the trailing slash if one exists.
   *
   * 如果 url 具有结尾斜杠，则移除它，否则原样返回。
   * 该方法会查找第一个 `#`、`?` 之前的结尾 `/` 字符，之后的则不管。如果 url 中没有 `#`、`?`，则替换行尾的。
   *
   * @param url URL string
   *
   * @returns Returns a URL string after removing the trailing slash if one exists, otherwise
   * returns the string as is.
   *
   * 返回一个 URL 字符串，如果有结尾斜杠，则移除，否则原样返回。
   *
   */
  public static stripTrailingSlash(url: string): string {
    const match = url.match(/#|\?|$/);
    const pathEndIdx = match && match.index || url.length;
    const droppedSlashIdx = pathEndIdx - (url[pathEndIdx - 1] === '/' ? 1 : 0);
    return url.slice(0, droppedSlashIdx) + url.slice(pathEndIdx);
  }
}

function _stripBaseHref(baseHref: string, url: string): string {
  return baseHref && url.startsWith(baseHref) ? url.substring(baseHref.length) : url;
}

function _stripIndexHtml(url: string): string {
  return url.replace(/\/index.html$/, '');
}
