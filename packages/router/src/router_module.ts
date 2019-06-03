/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {APP_BASE_HREF, HashLocationStrategy, LOCATION_INITIALIZED, Location, LocationStrategy, PathLocationStrategy, PlatformLocation, ViewportScroller} from '@angular/common';
import {ANALYZE_FOR_ENTRY_COMPONENTS, APP_BOOTSTRAP_LISTENER, APP_INITIALIZER, ApplicationRef, Compiler, ComponentRef, Inject, Injectable, InjectionToken, Injector, ModuleWithProviders, NgModule, NgModuleFactoryLoader, NgProbeToken, Optional, Provider, SkipSelf, SystemJsNgModuleLoader} from '@angular/core';
import {ɵgetDOM as getDOM} from '@angular/platform-browser';
import {Subject, of } from 'rxjs';

import {EmptyOutletComponent} from './components/empty_outlet';
import {Route, Routes} from './config';
import {RouterLink, RouterLinkWithHref} from './directives/router_link';
import {RouterLinkActive} from './directives/router_link_active';
import {RouterOutlet} from './directives/router_outlet';
import {RouterEvent} from './events';
import {RouteReuseStrategy} from './route_reuse_strategy';
import {ErrorHandler, Router} from './router';
import {ROUTES} from './router_config_loader';
import {ChildrenOutletContexts} from './router_outlet_context';
import {NoPreloading, PreloadAllModules, PreloadingStrategy, RouterPreloader} from './router_preloader';
import {RouterScroller} from './router_scroller';
import {ActivatedRoute} from './router_state';
import {UrlHandlingStrategy} from './url_handling_strategy';
import {DefaultUrlSerializer, UrlSerializer, UrlTree} from './url_tree';
import {flatten} from './utils/collection';



/**
 * @description
 *
 * Contains a list of directives
 *
 * 所含指令的列表
 *
 */
const ROUTER_DIRECTIVES =
    [RouterOutlet, RouterLink, RouterLinkWithHref, RouterLinkActive, EmptyOutletComponent];

/**
 * @description
 *
 * Is used in DI to configure the router.
 *
 * DI 用它来配置路由器。
 * @publicApi
 */
export const ROUTER_CONFIGURATION = new InjectionToken<ExtraOptions>('ROUTER_CONFIGURATION');

/**
 * @docsNotRequired
 */
export const ROUTER_FORROOT_GUARD = new InjectionToken<void>('ROUTER_FORROOT_GUARD');

export const ROUTER_PROVIDERS: Provider[] = [
  Location,
  {provide: UrlSerializer, useClass: DefaultUrlSerializer},
  {
    provide: Router,
    useFactory: setupRouter,
    deps: [
      ApplicationRef, UrlSerializer, ChildrenOutletContexts, Location, Injector,
      NgModuleFactoryLoader, Compiler, ROUTES, ROUTER_CONFIGURATION,
      [UrlHandlingStrategy, new Optional()], [RouteReuseStrategy, new Optional()]
    ]
  },
  ChildrenOutletContexts,
  {provide: ActivatedRoute, useFactory: rootRoute, deps: [Router]},
  {provide: NgModuleFactoryLoader, useClass: SystemJsNgModuleLoader},
  RouterPreloader,
  NoPreloading,
  PreloadAllModules,
  {provide: ROUTER_CONFIGURATION, useValue: {enableTracing: false}},
];

export function routerNgProbeToken() {
  return new NgProbeToken('Router', Router);
}

/**
 * @usageNotes
 *
 * RouterModule can be imported multiple times: once per lazily-loaded bundle.
 * Since the router deals with a global shared resource--location, we cannot have
 * more than one router service active.
 *
 * RouterModule 可能会被多次导入：每个惰性加载的发布包都会导入一次。
 * 但由于路由器要和全局共享的资源 - location 打交道，所以不能同时激活一个以上的 `Router` 服务。
 *
 * That is why there are two ways to create the module: `RouterModule.forRoot` and
 * `RouterModule.forChild`.
 *
 * 这就是需要两种方式来创建本模块的原因：`RouterModule.forRoot` 和 `RouterModule.forChild`。
 *
 * * `forRoot` creates a module that contains all the directives, the given routes, and the router
 *   service itself.
 *
 *   `forRoot` 创建一个包含所有指令、指定的路由和 `Router` 服务本身的模块。
 *
 * * `forChild` creates a module that contains all the directives and the given routes, but does not
 *   include the router service.
 *
 *   `forChild` 会创建一个包含所有指令、指定的路由，但不含 `Router` 服务的模块。
 *
 * When registered at the root, the module should be used as follows
 *
 * 当注册在根模块时，该模块应该这样用：
 *
 * ```
 * @NgModule({
 *   imports: [RouterModule.forRoot(ROUTES)]
 * })
 * class MyNgModule {}
 * ```
 *
 * For submodules and lazy loaded submodules the module should be used as follows:
 *
 * 对于子模块和惰性加载的子模块，该模块应该这样用：
 *
 * ```
 * @NgModule({
 *   imports: [RouterModule.forChild(ROUTES)]
 * })
 * class MyNgModule {}
 * ```
 *
 * @description
 *
 * Adds router directives and providers.
 *
 * 添加路由器指令和服务提供商。
 *
 * Managing state transitions is one of the hardest parts of building applications. This is
 * especially true on the web, where you also need to ensure that the state is reflected in the URL.
 * In addition, we often want to split applications into multiple bundles and load them on demand.
 * Doing this transparently is not trivial.
 *
 * 在构建应用时，管理状态的转换是最难的任务之一。对 Web 来说尤其如此，你还要确保这个状态同时在 URL 中反映出来。
 * 另外，我们通常会希望把应用拆分成多个发布包，并按需加载。要让这些工作透明化，可没那么简单。
 *
 * The Angular router solves these problems. Using the router, you can declaratively specify
 * application states, manage state transitions while taking care of the URL, and load bundles on
 * demand.
 *
 * Angular 的路由器解决了这些问题。使用路由器，你可以声明式的指定应用的状态、管理状态的转换，还可以处理好 URL，还可以按需加载发布包。
 *
 * [Read this developer guide](https://angular.io/docs/ts/latest/guide/router.html) to get an
 * overview of how the router should be used.
 *
 * [阅读开发指南](/guide/router) 以获得如何使用路由器的全景图。
 *
 * @publicApi
 */
@NgModule({
  declarations: ROUTER_DIRECTIVES,
  exports: ROUTER_DIRECTIVES,
  entryComponents: [EmptyOutletComponent]
})
export class RouterModule {
  // Note: We are injecting the Router so it gets created eagerly...
  constructor(@Optional() @Inject(ROUTER_FORROOT_GUARD) guard: any, @Optional() router: Router) {}

  /**
   * Creates a module with all the router providers and directives. It also optionally sets up an
   * application listener to perform an initial navigation.
   *
   * 创建一个带有所有路由器服务提供商和指令的模块。它还可以（可选的）设置一个应用监听器，来执行首次导航。
   *
   * Configuration Options:
   *
   * 配置项：
   *
   * * `enableTracing` Toggles whether the router should log all navigation events to the console.
   *
   *   `enableTracing` 可以切换路由器是否应该把它所有的内部事件都记录到控制台中。
   *
   * * `useHash` Enables the location strategy that uses the URL fragment instead of the history
   * API.
   *
   *   `useHash` 启用 `LocationStrategy` 位置策略，用 URL 片段（`#`）代替 `history` API。
   *
   * * `initialNavigation` Disables the initial navigation.
   *
   *   `initialNavigation` 禁用首次导航。
   *
   * * `errorHandler` Defines a custom error handler for failed navigations.
   *
   *   `errorHandler` 为那些失败的导航定义了一个自定义错误处理器。
   *
   * * `preloadingStrategy` Configures a preloading strategy. See `PreloadAllModules`.
   *
   *   `preloadingStrategy` 配置预加载策略（参见 `PreloadAllModules`）。
   *
   * * `onSameUrlNavigation` Define what the router should do if it receives a navigation request to
   * the current URL.
   *
   *   `onSameUrlNavigation` 定义了当路由器接收到一个到当前 URL 的导航请求时，应该做什么。
   *
   * * `scrollPositionRestoration` Configures if the scroll position needs to be restored when
   * navigating back.
   *
   *    `scrollPositionRestoration` 配置了当导航回来时是否需要还原滚动位置。
   *
   * * `anchorScrolling` Configures if the router should scroll to the element when the url has a
   * fragment.
   *
   *    `anchorScrolling` 配置了当 URL 指定了一个片段（fragment）时，路由器是否需要滚动到那个元素处。
   *
   * * `scrollOffset` Configures the scroll offset the router will use when scrolling to an element.
   *
   *    `scrollOffset` 配置了当滚动到某个元素时，路由应该使用的滚动偏移量。
   *
   * * `paramsInheritanceStrategy` Defines how the router merges params, data and resolved data from
   * parent to child routes.
   *
   *   `paramsInheritanceStrategy` 定义了路由器要如何把父路由的参数、数据和解析出的数据合并到子路由中。
   *
   * * `malformedUriErrorHandler` Defines a custom malformed uri error handler function. This
   * handler is invoked when encodedURI contains invalid character sequences.
   *
   *    `malformedUriErrorHandler` 定义了一个自定义的无效 uri 错误处理器函数。当 encodedURI 的参数中包含错误的字符序列时，就会调用这个处理器。
   *
   * * `urlUpdateStrategy` Defines when the router updates the browser URL. The default behavior is
   * to update after successful navigation.
   *
   *    `urlUpdateStrategy` 定义了路由器应该何时更新浏览器的 URL。默认的行为是在成功的导航之后才更新。
   *
   * * `relativeLinkResolution` Enables the correct relative link resolution in components with
   * empty paths.
   *
   *    `relativeLinkResolution` 指定了在空路径路由的组件中应该正确解析相对路径。
   *
   * See `ExtraOptions` for more details about the above options.
   *
   * 请参见 `ExtraOptions` 以了解上述选项的详情。
  */
  static forRoot(routes: Routes, config?: ExtraOptions): ModuleWithProviders<RouterModule> {
    return {
      ngModule: RouterModule,
      providers: [
        ROUTER_PROVIDERS,
        provideRoutes(routes),
        {
          provide: ROUTER_FORROOT_GUARD,
          useFactory: provideForRootGuard,
          deps: [[Router, new Optional(), new SkipSelf()]]
        },
        {provide: ROUTER_CONFIGURATION, useValue: config ? config : {}},
        {
          provide: LocationStrategy,
          useFactory: provideLocationStrategy,
          deps: [
            PlatformLocation, [new Inject(APP_BASE_HREF), new Optional()], ROUTER_CONFIGURATION
          ]
        },
        {
          provide: RouterScroller,
          useFactory: createRouterScroller,
          deps: [Router, ViewportScroller, ROUTER_CONFIGURATION]
        },
        {
          provide: PreloadingStrategy,
          useExisting: config && config.preloadingStrategy ? config.preloadingStrategy :
                                                             NoPreloading
        },
        {provide: NgProbeToken, multi: true, useFactory: routerNgProbeToken},
        provideRouterInitializer(),
      ],
    };
  }

  /**
   * Creates a module with all the router directives and a provider registering routes.
   *
   * 创建一个具有所有路由器指令和一个用于注册路由的提供商。
   */
  static forChild(routes: Routes): ModuleWithProviders<RouterModule> {
    return {ngModule: RouterModule, providers: [provideRoutes(routes)]};
  }
}

export function createRouterScroller(
    router: Router, viewportScroller: ViewportScroller, config: ExtraOptions): RouterScroller {
  if (config.scrollOffset) {
    viewportScroller.setOffset(config.scrollOffset);
  }
  return new RouterScroller(router, viewportScroller, config);
}

export function provideLocationStrategy(
    platformLocationStrategy: PlatformLocation, baseHref: string, options: ExtraOptions = {}) {
  return options.useHash ? new HashLocationStrategy(platformLocationStrategy, baseHref) :
                           new PathLocationStrategy(platformLocationStrategy, baseHref);
}

export function provideForRootGuard(router: Router): any {
  if (router) {
    throw new Error(
        `RouterModule.forRoot() called twice. Lazy loaded modules should use RouterModule.forChild() instead.`);
  }
  return 'guarded';
}

/**
 * @description
 *
 * Registers routes.
 *
 * 注册路由。
 *
 * @usageNotes
 *
 * ### Example
 *
 * ### 例子
 *
 * ```
 * @NgModule({
 *   imports: [RouterModule.forChild(ROUTES)],
 *   providers: [provideRoutes(EXTRA_ROUTES)]
 * })
 * class MyNgModule {}
 * ```
 *
 * @publicApi
 */
export function provideRoutes(routes: Routes): any {
  return [
    {provide: ANALYZE_FOR_ENTRY_COMPONENTS, multi: true, useValue: routes},
    {provide: ROUTES, multi: true, useValue: routes},
  ];
}

/**
 * @description
 *
 * Represents an option to configure when the initial navigation is performed.
 *
 * 一个选项，用于控制执行首次导航的时机。
 *
 * * 'enabled' - the initial navigation starts before the root component is created.
 * The bootstrap is blocked until the initial navigation is complete.
 *
 *   'enabled' - 在根组件创建之前就开始首次导航。在首次导航完成之前，引导过程都会被阻塞。
 *
 * * 'disabled' - the initial navigation is not performed. The location listener is set up before
 * the root component gets created.
 *
 *   'disabled' - 不执行首次导航。在根组件创建之前，就会挂接上位置变更监听器。
 *
 * * 'legacy_enabled'- the initial navigation starts after the root component has been created.
 * The bootstrap is not blocked until the initial navigation is complete. @deprecated
 *
 *   'legacy_enabled' - 在根组件创建完之后开始首次导航。在首次导航之前不阻塞引导过程。@deprecated
 *
 * * 'legacy_disabled'- the initial navigation is not performed. The location listener is set up
 * after @deprecated
 * the root component gets created.
 *
 *   'legacy_disabled' - 不执行首次导航。在根组件创建完之后设置路径监听器。@deprecated
 *
 * * `true` - same as 'legacy_enabled'. @deprecated since v4
 *
 *   `true` - 同 'legacy_enabled'. @deprecated since v4
 *
 * * `false` - same as 'legacy_disabled'. @deprecated since v4
 *
 *   `false` - 同 'legacy_disabled'. @deprecated since v4
 *
 * The 'enabled' option should be used for applications unless there is a reason to have
 * more control over when the router starts its initial navigation due to some complex
 * initialization logic. In this case, 'disabled' should be used.
 *
 * 应用应该默认使用 'enabled'。如果在一些复杂的初始化逻辑中，需要在路由器开始首次导航之前进行更多的控制，则应该使用 'disabled'。
 *
 * The 'legacy_enabled' and 'legacy_disabled' should not be used for new applications.
 *
 * 新的应用中不应该再使用 'legacy_enabled' 和 'legacy_disabled'。
 *
 * @publicApi
 */
export type InitialNavigation =
    true | false | 'enabled' | 'disabled' | 'legacy_enabled' | 'legacy_disabled';

/**
 * @description
 *
 * Represents options to configure the router.
 *
 * 表示路由器的配置项。
 *
 * @publicApi
 */
export interface ExtraOptions {
  /**
   * Makes the router log all its internal events to the console.
   *
   * 让路由器将其所有的内部事件都记录到控制台中。
   */
  enableTracing?: boolean;

  /**
   * Enables the location strategy that uses the URL fragment instead of the history API.
   *
   * 修改位置策略（`LocationStrategy`），用 URL 片段（`#`）代替 `history` API。
   */
  useHash?: boolean;

  /**
   * Disables the initial navigation.
   *
   * 禁用首次导航
   */
  initialNavigation?: InitialNavigation;

  /**
   * A custom error handler.
   *
   * 自定义的错误处理器。
   */
  errorHandler?: ErrorHandler;

  /**
   * Configures a preloading strategy. See `PreloadAllModules`.
   *
   * 配置预加载策略，参见 `PreloadAllModules`。
   */
  preloadingStrategy?: any;

  /**
   * Define what the router should do if it receives a navigation request to the current URL.
   * By default, the router will ignore this navigation. However, this prevents features such
   * as a "refresh" button. Use this option to configure the behavior when navigating to the
   * current URL. Default is 'ignore'.
   *
   * 规定当路由器收到一个导航到当前 URL 的请求时该如何处理。
   * 默认情况下，路由器会忽略本次导航。不过，这会阻止实现类似于"刷新"按钮的功能。
   * 使用该选项可以控制导航到当前 URL 时的行为。默认为 'ignore'。
   */
  onSameUrlNavigation?: 'reload'|'ignore';

  /**
   * Configures if the scroll position needs to be restored when navigating back.
   *
   * 配置是否需要在导航回来的时候恢复滚动位置。
   *
   * * 'disabled'--does nothing (default).  Scroll position will be maintained on navigation.
   *
   *   'disabled' - 什么也不做（默认）。在导航时，会自动维护滚动位置
   *
   * * 'top'--set the scroll position to x = 0, y = 0 on all navigation.
   *
   *   'top' - 在任何一次导航中都把滚动位置设置为 x=0, y=0。
   *
   * * 'enabled'--restores the previous scroll position on backward navigation, else sets the
   * position to the anchor if one is provided, or sets the scroll position to [0, 0] (forward
   * navigation). This option will be the default in the future.
   *
   *   'enabled' —— 当向后导航时，滚动到以前的滚动位置。当向前导航时，如果提供了锚点，则自动滚动到那个锚点，否则把滚动位置设置为 [0, 0]。该选项将来会变成默认值。
   *
   * You can implement custom scroll restoration behavior by adapting the enabled behavior as
   * follows:
   *
   * 你可以通过如下方式来适配启用时的行为，来自定义恢复滚动位置的策略。
   *
   * ```typescript
   * class AppModule {
    *   constructor(router: Router, viewportScroller: ViewportScroller) {
    *     router.events.pipe(
    *       filter((e: Event): e is Scroll => e instanceof Scroll)
    *     ).subscribe(e => {
    *       if (e.position) {
    *         // backward navigation
    *         viewportScroller.scrollToPosition(e.position);
    *       } else if (e.anchor) {
    *         // anchor navigation
    *         viewportScroller.scrollToAnchor(e.anchor);
    *       } else {
    *         // forward navigation
    *         viewportScroller.scrollToPosition([0, 0]);
    *       }
    *     });
    *   }
    * }
    * ```
   */
  scrollPositionRestoration?: 'disabled'|'enabled'|'top';

  /**
   * Configures if the router should scroll to the element when the url has a fragment.
   *
   * 配置当 url 中带有片段（`#`）时路由器是否滚动到那个元素。
   *
   * * 'disabled'--does nothing (default).
   *
   *   'disabled' - 什么也不做（默认）。
   *
   * * 'enabled'--scrolls to the element. This option will be the default in the future.
   *
   *   'enabled' - 滚动到该元素。将来该选项会变为默认值。
   *
   * Anchor scrolling does not happen on 'popstate'. Instead, we restore the position
   * that we stored or scroll to the top.
   *
   * 在 'popstate' 时，不会自动滚动到锚点，而是恢复应用中保存的滚动位置，或滚动到顶部。
   */
  anchorScrolling?: 'disabled'|'enabled';

  /**
   * Configures the scroll offset the router will use when scrolling to an element.
   *
   * 配置当滚动到一个元素时，路由器使用的滚动偏移。
   *
   * When given a tuple with two numbers, the router will always use the numbers.
   * When given a function, the router will invoke the function every time it restores scroll
   * position.
   *
   * 当给出两个数字时，路由器总会使用它们。
   * 当给出一个函数时，路由器每当要恢复滚动位置时，都会调用该函数。
   */
  scrollOffset?: [number, number]|(() => [number, number]);

  /**
   * Defines how the router merges params, data and resolved data from parent to child
   * routes. Available options are:
   *
   * 定义路由器如何把父路由的参数、数据和解析出的数据合并到子路由。有效的选项包括：
   *
   * - `'emptyOnly'`, the default, only inherits parent params for path-less or component-less
   *   routes.
   *
   *   `'emptyOnly'`，默认值，只从无路径或无组件的路由中继承父路由的参数。
   *
   * - `'always'`, enables unconditional inheritance of parent params.
   *
   *   `'always'`，无条件继承父路由的参数。
   */
  paramsInheritanceStrategy?: 'emptyOnly'|'always';

  /**
   * A custom malformed uri error handler function. This handler is invoked when encodedURI contains
   * invalid character sequences. The default implementation is to redirect to the root url dropping
   * any path or param info. This function passes three parameters:
   *
   * 一个自定义的 URI 格式无效错误的处理器。每当 encodeURI 包含无效字符序列时，就会调用该处理器。默认的实现是跳转到根路径，抛弃任何路径和参数信息。该函数传入三个参数：
   *
   * - `'URIError'` - Error thrown when parsing a bad URL
   *
   *   `'URIError'` - 当传入错误的 URL 时抛出的错误
   *
   * - `'UrlSerializer'` - UrlSerializer that’s configured with the router.
   *
   *   `'UrlSerializer'` - 路由器所配置的 UrlSerializer。
   *
   * - `'url'` -  The malformed URL that caused the URIError
   *
   *   `'url'` - 导致 URIError 的格式无效的 URL
   *
   * */
  malformedUriErrorHandler?:
      (error: URIError, urlSerializer: UrlSerializer, url: string) => UrlTree;

  /**
   * Defines when the router updates the browser URL. The default behavior is to update after
   * successful navigation. However, some applications may prefer a mode where the URL gets
   * updated at the beginning of navigation. The most common use case would be updating the
   * URL early so if navigation fails, you can show an error message with the URL that failed.
   * Available options are:
   *
   * 定义路由器要何时更新浏览器的 URL。默认行为是在每次成功的导航之后更新。
   * 不过，有些应用会更愿意在导航开始时就更新。最常见的情况是尽早更新 URL，这样当导航失败时，你就可以在出错的 URL 上显示一条错误信息了。
   * 可用的选项包括：
   *
   * - `'deferred'`, the default, updates the browser URL after navigation has finished.
   *
   *   `'deferred'`，默认值，在导航完毕后更新浏览器 URL。
   *
   * - `'eager'`, updates browser URL at the beginning of navigation.
   *
   *   `'eager'`，在导航开始时更新浏览器的 URL。
   */
  urlUpdateStrategy?: 'deferred'|'eager';

  /**
   * Enables a bug fix that corrects relative link resolution in components with empty paths.
   * Example:
   *
   * 启用 BUG 补丁，纠正空路径组件的相对链接解析问题。
   *
   * ```
   * const routes = [
   *   {
   *     path: '',
   *     component: ContainerComponent,
   *     children: [
   *       { path: 'a', component: AComponent },
   *       { path: 'b', component: BComponent },
   *     ]
   *   }
   * ];
   * ```
   *
   * From the `ContainerComponent`, this will not work:
   *
   * 在 `ContainerComponent` 中不能这样用：
   *
   * `<a [routerLink]="['./a']">Link to A</a>`
   *
   * However, this will work:
   *
   * 不过，可以这样用：
   *
   * `<a [routerLink]="['../a']">Link to A</a>`
   *
   * In other words, you're required to use `../` rather than `./`. This is currently the default
   * behavior. Setting this option to `corrected` enables the fix.
   *
   * 换句话说，要使用 `../` 而不是 `./`。目前 v6 版本的默认值是 `legacy`，到 v7 就会移除该选项，以纠正此行为。
   */
  relativeLinkResolution?: 'legacy'|'corrected';
}

export function setupRouter(
    ref: ApplicationRef, urlSerializer: UrlSerializer, contexts: ChildrenOutletContexts,
    location: Location, injector: Injector, loader: NgModuleFactoryLoader, compiler: Compiler,
    config: Route[][], opts: ExtraOptions = {}, urlHandlingStrategy?: UrlHandlingStrategy,
    routeReuseStrategy?: RouteReuseStrategy) {
  const router = new Router(
      null, urlSerializer, contexts, location, injector, loader, compiler, flatten(config));

  if (urlHandlingStrategy) {
    router.urlHandlingStrategy = urlHandlingStrategy;
  }

  if (routeReuseStrategy) {
    router.routeReuseStrategy = routeReuseStrategy;
  }

  if (opts.errorHandler) {
    router.errorHandler = opts.errorHandler;
  }

  if (opts.malformedUriErrorHandler) {
    router.malformedUriErrorHandler = opts.malformedUriErrorHandler;
  }

  if (opts.enableTracing) {
    const dom = getDOM();
    router.events.subscribe((e: RouterEvent) => {
      dom.logGroup(`Router Event: ${(<any>e.constructor).name}`);
      dom.log(e.toString());
      dom.log(e);
      dom.logGroupEnd();
    });
  }

  if (opts.onSameUrlNavigation) {
    router.onSameUrlNavigation = opts.onSameUrlNavigation;
  }

  if (opts.paramsInheritanceStrategy) {
    router.paramsInheritanceStrategy = opts.paramsInheritanceStrategy;
  }

  if (opts.urlUpdateStrategy) {
    router.urlUpdateStrategy = opts.urlUpdateStrategy;
  }

  if (opts.relativeLinkResolution) {
    router.relativeLinkResolution = opts.relativeLinkResolution;
  }

  return router;
}

export function rootRoute(router: Router): ActivatedRoute {
  return router.routerState.root;
}

/**
 * To initialize the router properly we need to do in two steps:
 *
 * 要正确初始化路由器，我们需要完成两个步骤：
 *
 * We need to start the navigation in a APP_INITIALIZER to block the bootstrap if
 * a resolver or a guards executes asynchronously. Second, we need to actually run
 * activation in a BOOTSTRAP_LISTENER. We utilize the afterPreactivation
 * hook provided by the router to do that.
 *
 * 为了让解析器或路由守卫能异步执行，我们需要在 APP_INITIALIZER 中开始导航，以便阻塞引导过程。
 * 其次，我们要在 BOOTSTRAP_LISTENER 中实际运行激活逻辑。
 * 我们利用路由器提供的 `afterPreactivation`（预激活完成后） 钩子来做到这一点。
 *
 * The router navigation starts, reaches the point when preactivation is done, and then
 * pauses. It waits for the hook to be resolved. We then resolve it only in a bootstrap listener.
 *
 * 路由器开始导航，当预激活（`preactivation`）完成之后，就到达了这个时间点，并等待。它会一直等到这个钩子被解析之后才会继续。以后我们就只会在引导过程监听器中解析它了。
 */
@Injectable()
export class RouterInitializer {
  private initNavigation: boolean = false;
  private resultOfPreactivationDone = new Subject<void>();

  constructor(private injector: Injector) {}

  appInitializer(): Promise<any> {
    const p: Promise<any> = this.injector.get(LOCATION_INITIALIZED, Promise.resolve(null));
    return p.then(() => {
      let resolve: Function = null !;
      const res = new Promise(r => resolve = r);
      const router = this.injector.get(Router);
      const opts = this.injector.get(ROUTER_CONFIGURATION);

      if (this.isLegacyDisabled(opts) || this.isLegacyEnabled(opts)) {
        resolve(true);

      } else if (opts.initialNavigation === 'disabled') {
        router.setUpLocationChangeListener();
        resolve(true);

      } else if (opts.initialNavigation === 'enabled') {
        router.hooks.afterPreactivation = () => {
          // only the initial navigation should be delayed
          if (!this.initNavigation) {
            this.initNavigation = true;
            resolve(true);
            return this.resultOfPreactivationDone;

            // subsequent navigations should not be delayed
          } else {
            return of (null) as any;
          }
        };
        router.initialNavigation();

      } else {
        throw new Error(`Invalid initialNavigation options: '${opts.initialNavigation}'`);
      }

      return res;
    });
  }

  bootstrapListener(bootstrappedComponentRef: ComponentRef<any>): void {
    const opts = this.injector.get(ROUTER_CONFIGURATION);
    const preloader = this.injector.get(RouterPreloader);
    const routerScroller = this.injector.get(RouterScroller);
    const router = this.injector.get(Router);
    const ref = this.injector.get<ApplicationRef>(ApplicationRef);

    if (bootstrappedComponentRef !== ref.components[0]) {
      return;
    }

    if (this.isLegacyEnabled(opts)) {
      router.initialNavigation();
    } else if (this.isLegacyDisabled(opts)) {
      router.setUpLocationChangeListener();
    }

    preloader.setUpPreloading();
    routerScroller.init();
    router.resetRootComponentType(ref.componentTypes[0]);
    this.resultOfPreactivationDone.next(null !);
    this.resultOfPreactivationDone.complete();
  }

  private isLegacyEnabled(opts: ExtraOptions): boolean {
    return opts.initialNavigation === 'legacy_enabled' || opts.initialNavigation === true ||
        opts.initialNavigation === undefined;
  }

  private isLegacyDisabled(opts: ExtraOptions): boolean {
    return opts.initialNavigation === 'legacy_disabled' || opts.initialNavigation === false;
  }
}

export function getAppInitializer(r: RouterInitializer) {
  return r.appInitializer.bind(r);
}

export function getBootstrapListener(r: RouterInitializer) {
  return r.bootstrapListener.bind(r);
}

/**
 * A token for the router initializer that will be called after the app is bootstrapped.
 *
 * 一个代表路由器初始化器的令牌，应用引导完毕后就会调用它。
 *
 * @publicApi
 */
export const ROUTER_INITIALIZER =
    new InjectionToken<(compRef: ComponentRef<any>) => void>('Router Initializer');

export function provideRouterInitializer() {
  return [
    RouterInitializer,
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: getAppInitializer,
      deps: [RouterInitializer]
    },
    {provide: ROUTER_INITIALIZER, useFactory: getBootstrapListener, deps: [RouterInitializer]},
    {provide: APP_BOOTSTRAP_LISTENER, multi: true, useExisting: ROUTER_INITIALIZER},
  ];
}
