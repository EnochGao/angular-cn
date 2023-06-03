/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Directive, ElementRef, inject, InjectionToken, Injector, Input, NgZone, OnChanges, OnDestroy, OnInit, PLATFORM_ID, Renderer2, SimpleChanges, ɵformatRuntimeError as formatRuntimeError, ɵRuntimeError as RuntimeError} from '@angular/core';

import {RuntimeErrorCode} from '../../errors';
import {isPlatformServer} from '../../platform_id';

import {imgDirectiveDetails} from './error_helper';
import {cloudinaryLoaderInfo} from './image_loaders/cloudinary_loader';
import {IMAGE_LOADER, ImageLoader, ImageLoaderConfig, noopImageLoader} from './image_loaders/image_loader';
import {imageKitLoaderInfo} from './image_loaders/imagekit_loader';
import {imgixLoaderInfo} from './image_loaders/imgix_loader';
import {LCPImageObserver} from './lcp_image_observer';
import {PreconnectLinkChecker} from './preconnect_link_checker';
import {PreloadLinkCreator} from './preload-link-creator';

/**
 * When a Base64-encoded image is passed as an input to the `NgOptimizedImage` directive,
 * an error is thrown. The image content \(as a string\) might be very long, thus making
 * it hard to read an error message if the entire string is included. This const defines
 * the number of characters that should be included into the error message. The rest
 * of the content is truncated.
 *
 * 当 Base64 编码的图像作为输入传递给 `NgOptimizedImage` 指令时，会抛出错误。 图像内容（作为字符串）可能很长，因此如果包含整个字符串，则很难阅读错误消息。 此常量定义应包含在错误消息中的字符数。 其余内容被截断。
 *
 */
const BASE64_IMG_MAX_LENGTH_IN_ERROR = 50;

/**
 * RegExpr to determine whether a src in a srcset is using width descriptors.
 * Should match something like: "100w, 200w".
 *
 * 用于确定 srcset 中的 src 是否使用宽度描述符的 RegExpr。 应该匹配类似：“100w，200w”。
 *
 */
const VALID_WIDTH_DESCRIPTOR_SRCSET = /^((\s*\d+w\s*(,|$)){1,})$/;

/**
 * RegExpr to determine whether a src in a srcset is using density descriptors.
 * Should match something like: "1x, 2x, 50x". Also supports decimals like "1.5x, 1.50x".
 *
 * 用于确定 srcset 中的 src 是否使用密度描述符的 RegExpr。 应匹配类似：“1x、2x、50x”的内容。 还支持小数，如“1.5x、1.50x”。
 *
 */
const VALID_DENSITY_DESCRIPTOR_SRCSET = /^((\s*\d+(\.\d+)?x\s*(,|$)){1,})$/;

/**
 * Srcset values with a density descriptor higher than this value will actively
 * throw an error. Such densities are not permitted as they cause image sizes
 * to be unreasonably large and slow down LCP.
 *
 * 密度描述符高于此值的 Srcset 值将主动抛出错误。 这样的密度是不允许的，因为它们会导致图像尺寸过大并减慢 LCP。
 *
 */
export const ABSOLUTE_SRCSET_DENSITY_CAP = 3;

/**
 * Used only in error message text to communicate best practices, as we will
 * only throw based on the slightly more conservative ABSOLUTE_SRCSET_DENSITY_CAP.
 *
 * 仅在错误消息文本中用于传达最佳实践，因为我们将仅基于稍微保守的 ABSOLUTE_SRCSET_DENSITY_CAP 进行抛出。
 *
 */
export const RECOMMENDED_SRCSET_DENSITY_CAP = 2;

/**
 * Used in generating automatic density-based srcsets
 *
 * 用于生成自动基于密度的 srcsets
 *
 */
const DENSITY_SRCSET_MULTIPLIERS = [1, 2];

/**
 * Used to determine which breakpoints to use on full-width images
 *
 * 用于确定在全宽图像上使用哪些断点
 *
 */
const VIEWPORT_BREAKPOINT_CUTOFF = 640;
/**
 * Used to determine whether two aspect ratios are similar in value.
 *
 * 用于判断两个纵横比值是否相似。
 *
 */
const ASPECT_RATIO_TOLERANCE = .1;

/**
 * Used to determine whether the image has been requested at an overly
 * large size compared to the actual rendered image size \(after taking
 * into account a typical device pixel ratio\). In pixels.
 *
 * 用于确定与实际渲染图像大小相比是否请求了过大的图像（在考虑典型设备像素比之后）。 以像素为单位。
 *
 */
const OVERSIZED_IMAGE_TOLERANCE = 1000;

/**
 * Used to limit automatic srcset generation of very large sources for
 * fixed-size images. In pixels.
 *
 * 用于限制为固定大小图像自动生成超大源的 srcset。 以像素为单位。
 *
 */
const FIXED_SRCSET_WIDTH_LIMIT = 1920;
const FIXED_SRCSET_HEIGHT_LIMIT = 1080;


/**
 * Info about built-in loaders we can test for.
 *
 * 关于我们可以测试的内置加载器的信息。
 *
 */
export const BUILT_IN_LOADERS = [imgixLoaderInfo, imageKitLoaderInfo, cloudinaryLoaderInfo];

/**
 * A configuration object for the NgOptimizedImage directive. Contains:
 *
 * NgOptimizedImage 指令的配置对象。 包含：
 *
 * - breakpoints: An array of integer breakpoints used to generate
 *      srcsets for responsive images.
 *
 *   breakpoints：整数断点数组，用于为响应式图像生成 srcsets。
 *
 * Learn more about the responsive image configuration in [the NgOptimizedImage
 * guide](guide/image-directive).
 *
 * 在[NgOptimizedImage 指南](guide/image-directive)中了解有关响应式图像配置的更多信息。
 *
 * @publicApi
 * @developerPreview
 */
export type ImageConfig = {
  breakpoints?: number[]
};

const defaultConfig: ImageConfig = {
  breakpoints: [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
};

/**
 * Injection token that configures the image optimized image functionality.
 *
 * 配置图像优化图像功能的注入令牌。
 *
 * @see `NgOptimizedImage`
 * @publicApi
 * @developerPreview
 */
export const IMAGE_CONFIG = new InjectionToken<ImageConfig>(
    'ImageConfig', {providedIn: 'root', factory: () => defaultConfig});

/**
 * Directive that improves image loading performance by enforcing best practices.
 *
 * 通过实施最佳实践来提高图像加载性能的指令。
 *
 * `NgOptimizedImage` ensures that the loading of the Largest Contentful Paint \(LCP\) image is
 * prioritized by:
 *
 * `NgOptimizedImage` 确保 Largest Contentful Paint \(LCP\) 图像的加载优先级为：
 *
 * - Automatically setting the `fetchpriority` attribute on the `<img>` tag
 *
 *   自动设置 `<img>` 标签上的 `fetchpriority` 属性
 *
 * - Lazy loading non-priority images by default
 *
 *   默认延迟加载非优先级图像
 *
 * - Asserting that there is a corresponding preconnect link tag in the document head
 *
 *   断言文档头中有相应的预连接链接标签
 *
 * In addition, the directive:
 *
 * 此外，该指令：
 *
 * - Generates appropriate asset URLs if a corresponding `ImageLoader` function is provided
 *
 *   如果提供相应的 `ImageLoader` 函数，则生成适当的资产 URL
 *
 * - Automatically generates a srcset
 *
 *   自动生成 srcset
 *
 * - Requires that `width` and `height` are set
 *
 *   要求设置 `width` 和 `height`
 *
 * - Warns if `width` or `height` have been set incorrectly
 *
 *   如果 `width` 或 `height` 设置不正确，则发出警告
 *
 * - Warns if the image will be visually distorted when rendered
 *
 *   警告图像在渲染时是否会在视觉上扭曲
 *
 * @usageNotes
 *
 * The `NgOptimizedImage` directive is marked as [standalone](guide/standalone-components) and can
 * be imported directly.
 *
 * `NgOptimizedImage` 指令被标记为[独立的](guide/standalone-components)，可以直接导入。
 *
 * Follow the steps below to enable and use the directive:
 *
 * 请按照以下步骤启用和使用该指令：
 *
 * 1. Import it into the necessary NgModule or a standalone Component.
 *
 *    将其导入到必要的 NgModule 或独立组件中。
 *
 * 2. Optionally provide an `ImageLoader` if you use an image hosting service.
 *
 *    如果你使用图像托管服务，可选择提供 `ImageLoader` 。
 *
 * 3. Update the necessary `<img>` tags in templates and replace `src` attributes with `ngSrc`.
 *
 *    更新模板中必要的 `<img>` 标签，并将 `src` 属性替换为 `ngSrc` 。
 *
 * Using a `ngSrc` allows the directive to control when the `src` gets set, which triggers an image
 * download.
 *
 * 使用 `ngSrc` 允许指令控制何时设置 `src` ，这会触发图像下载。
 *
 * Step 1: import the `NgOptimizedImage` directive.
 *
 * 第 1 步：导入 `NgOptimizedImage` 指令。
 *
 * ```typescript
 * import { NgOptimizedImage } from '@angular/common';
 *
 * // Include it into the necessary NgModule
 * @NgModule({
 *   imports: [NgOptimizedImage],
 * })
 * class AppModule {}
 *
 * // ... or a standalone Component
 * @Component({
 *   standalone: true
 *   imports: [NgOptimizedImage],
 * })
 * class MyStandaloneComponent {}
 * ```
 *
 * Step 2: configure a loader.
 *
 * 第二步：配置加载器。
 *
 * To use the **default loader**: no additional code changes are necessary. The URL returned by the
 * generic loader will always match the value of "src". In other words, this loader applies no
 * transformations to the resource URL and the value of the `ngSrc` attribute will be used as is.
 *
 * 要使用**默认加载器**：不需要额外的代码更改。 通用加载器返回的 URL 将始终匹配“src”的值。 换句话说，此加载程序不会对资源 URL 应用任何转换，并且 `ngSrc` 属性的值将按原样使用。
 *
 * To use an existing loader for a **third-party image service**: add the provider factory for your
 * chosen service to the `providers` array. In the example below, the Imgix loader is used:
 *
 * 要将现有的加载器用于**第三方图片服务**，请将你选择的服务的提供者工厂添加到 `providers` 数组中。在下面的示例中，使用了 Imgix 加载器：
 *
 * ```typescript
 * import {provideImgixLoader} from '@angular/common';
 *
 * // Call the function and add the result to the `providers` array:
 * providers: [
 *   provideImgixLoader("https://my.base.url/"),
 * ],
 * ```
 *
 * The `NgOptimizedImage` directive provides the following functions:
 *
 * `NgOptimizedImage` 指令提供了以下功能：
 *
 * - `provideCloudflareLoader`
 * - `provideCloudinaryLoader`
 * - `provideImageKitLoader`
 * - `provideImgixLoader`
 *
 * If you use a different image provider, you can create a custom loader function as described
 * below.
 *
 * 如果你使用不同的图像提供者，你可以创建一个自定义加载器函数，如下所述。
 *
 * To use a **custom loader**: provide your loader function as a value for the `IMAGE_LOADER` DI
 * token.
 *
 * 要使用**自定义加载器**：提供你的加载器函数作为 `IMAGE_LOADER` DI 令牌的值。
 *
 * ```typescript
 * import {IMAGE_LOADER, ImageLoaderConfig} from '@angular/common';
 *
 * // Configure the loader using the `IMAGE_LOADER` token.
 * providers: [
 *   {
 *      provide: IMAGE_LOADER,
 *      useValue: (config: ImageLoaderConfig) => {
 *        return `https://example.com/${config.src}-${config.width}.jpg}`;
 *      }
 *   },
 * ],
 * ```
 *
 * Step 3: update `<img>` tags in templates to use `ngSrc` instead of `src`.
 *
 * 第 3 步：更新模板中的 `<img>` 标签以使用 `ngSrc` 而不是 `src` 。
 *
 * ```
 * <img ngSrc="logo.png" width="200" height="100">
 * ```
 *
 * @publicApi
 */
@Directive({
  standalone: true,
  selector: 'img[ngSrc]',
  host: {
    '[style.position]': 'fill ? "absolute" : null',
    '[style.width]': 'fill ? "100%" : null',
    '[style.height]': 'fill ? "100%" : null',
    '[style.inset]': 'fill ? "0px" : null'
  }
})
export class NgOptimizedImage implements OnInit, OnChanges, OnDestroy {
  private imageLoader = inject(IMAGE_LOADER);
  private config: ImageConfig = processConfig(inject(IMAGE_CONFIG));
  private renderer = inject(Renderer2);
  private imgElement: HTMLImageElement = inject(ElementRef).nativeElement;
  private injector = inject(Injector);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));
  private readonly preloadLinkCreator = inject(PreloadLinkCreator);

  // a LCP image observer - should be injected only in the dev mode
  private lcpObserver = ngDevMode ? this.injector.get(LCPImageObserver) : null;

  /**
   * Calculate the rewritten `src` once and store it.
   * This is needed to avoid repetitive calculations and make sure the directive cleanup in the
   * `ngOnDestroy` does not rely on the `IMAGE_LOADER` logic (which in turn can rely on some other
   * instance that might be already destroyed).
   */
  private _renderedSrc: string|null = null;

  /**
   * Name of the source image.
   * Image name will be processed by the image loader and the final URL will be applied as the `src`
   * property of the image.
   *
   * 源图像的名称。 图片名称将由图片加载器处理，最终 URL 将用作图片的 `src` 属性。
   *
   */
  @Input() ngSrc!: string;

  /**
   * A comma separated list of width or density descriptors.
   * The image name will be taken from `ngSrc` and combined with the list of width or density
   * descriptors to generate the final `srcset` property of the image.
   *
   * 逗号分隔的宽度或密度描述符列表。 图像名称将从 `ngSrc` 中获取，并与宽度或密度描述符列表结合以生成图像的最终 `srcset` 属性。
   *
   * Example:
   *
   * 范例：
   *
   * ```
   * <img ngSrc="hello.jpg" ngSrcset="100w, 200w" />  =>
   * <img src="path/hello.jpg" srcset="path/hello.jpg?w=100 100w, path/hello.jpg?w=200 200w" />
   * ```
   *
   */
  @Input() ngSrcset!: string;

  /**
   * The base `sizes` attribute passed through to the `<img>` element.
   * Providing sizes causes the image to create an automatic responsive srcset.
   *
   * 传递给 `<img>` 元素的基本 `sizes` 属性。 提供尺寸会导致图像创建自动响应 srcset。
   *
   */
  @Input() sizes?: string;

  /**
   * For responsive images: the intrinsic width of the image in pixels.
   * For fixed size images: the desired rendered width of the image in pixels.
   *
   * 对于响应式图像：图像的固有宽度（以像素为单位）。 对于固定大小的图像：所需的图像渲染宽度（以像素为单位）。
   *
   */
  @Input()
  set width(value: string|number|undefined) {
    ngDevMode && assertGreaterThanZero(this, value, 'width');
    this._width = inputToInteger(value);
  }
  get width(): number|undefined {
    return this._width;
  }
  private _width?: number;

  /**
   * For responsive images: the intrinsic height of the image in pixels.
   * For fixed size images: the desired rendered height of the image in pixels.\* The intrinsic
   * height of the image in pixels.
   *
   * 对于响应式图像：图像的固有高度（以像素为单位）。 对于固定大小的图像：所需的图像渲染高度（以像素为单位）。\* 图像的固有高度（以像素为单位）。
   *
   */
  @Input()
  set height(value: string|number|undefined) {
    ngDevMode && assertGreaterThanZero(this, value, 'height');
    this._height = inputToInteger(value);
  }
  get height(): number|undefined {
    return this._height;
  }
  private _height?: number;

  /**
   * The desired loading behavior \(lazy, eager, or auto\).
   *
   * 所需的加载行为（惰性、急切或自动）。
   *
   * Setting images as loading='eager' or loading='auto' marks them
   * as non-priority images. Avoid changing this input for priority images.
   *
   * 将图像设置为 loading='eager' 或 loading='auto' 将它们标记为非优先图像。 避免为优先图像更改此输入。
   *
   */
  @Input() loading?: 'lazy'|'eager'|'auto';

  /**
   * Indicates whether this image should have a high priority.
   *
   * 指示此图像是否应具有高优先级。
   *
   */
  @Input()
  set priority(value: string|boolean|undefined) {
    this._priority = inputToBoolean(value);
  }
  get priority(): boolean {
    return this._priority;
  }
  private _priority = false;

  /**
   * Data to pass through to custom loaders.
   *
   * 要传递给自定义加载器的数据。
   *
   */
  @Input() loaderParams?: {[key: string]: any};

  /**
   * Disables automatic srcset generation for this image.
   *
   * 禁用此图像的自动 srcset 生成。
   *
   */
  @Input()
  set disableOptimizedSrcset(value: string|boolean|undefined) {
    this._disableOptimizedSrcset = inputToBoolean(value);
  }
  get disableOptimizedSrcset(): boolean {
    return this._disableOptimizedSrcset;
  }
  private _disableOptimizedSrcset = false;

  /**
   * Sets the image to "fill mode", which eliminates the height/width requirement and adds
   * styles such that the image fills its containing element.
   *
   * 将图像设置为“填充模式”，这消除了高度/宽度要求并添加样式，使图像填充其包含的元素。
   *
   * @developerPreview
   */
  @Input()
  set fill(value: string|boolean|undefined) {
    this._fill = inputToBoolean(value);
  }
  get fill(): boolean {
    return this._fill;
  }
  private _fill = false;

  /**
   * Value of the `src` attribute if set on the host `<img>` element.
   * This input is exclusively read to assert that `src` is not set in conflict
   * with `ngSrc` and that images don't start to load until a lazy loading strategy is set.
   *
   * 如果在宿主 `<img>` 元素上设置了 `src` 属性的值。 专门读取此输入以断言 `src` 未设置为与 `ngSrc` 冲突，并且在设置延迟加载策略之前图像不会开始加载。
   *
   * @internal
   */
  @Input() src?: string;

  /**
   * Value of the `srcset` attribute if set on the host `<img>` element.
   * This input is exclusively read to assert that `srcset` is not set in conflict
   * with `ngSrcset` and that images don't start to load until a lazy loading strategy is set.
   *
   * `srcset` 属性的值（如果在宿主 `<img>` 元素上设置）。 专门读取此输入以断言 `srcset` 未设置为与 `ngSrcset` 冲突，并且在设置延迟加载策略之前图像不会开始加载。
   *
   * @internal
   */
  @Input() srcset?: string;

  /** @nodoc */
  ngOnInit() {
    if (ngDevMode) {
      assertNonEmptyInput(this, 'ngSrc', this.ngSrc);
      assertValidNgSrcset(this, this.ngSrcset);
      assertNoConflictingSrc(this);
      if (this.ngSrcset) {
        assertNoConflictingSrcset(this);
      }
      assertNotBase64Image(this);
      assertNotBlobUrl(this);
      if (this.fill) {
        assertEmptyWidthAndHeight(this);
        assertNonZeroRenderedHeight(this, this.imgElement, this.renderer);
      } else {
        assertNonEmptyWidthAndHeight(this);
        // Only check for distorted images when not in fill mode, where
        // images may be intentionally stretched, cropped or letterboxed.
        assertNoImageDistortion(this, this.imgElement, this.renderer);
      }
      assertValidLoadingInput(this);
      if (!this.ngSrcset) {
        assertNoComplexSizes(this);
      }
      assertNotMissingBuiltInLoader(this.ngSrc, this.imageLoader);
      assertNoNgSrcsetWithoutLoader(this, this.imageLoader);
      assertNoLoaderParamsWithoutLoader(this, this.imageLoader);
      if (this.priority) {
        const checker = this.injector.get(PreconnectLinkChecker);
        checker.assertPreconnect(this.getRewrittenSrc(), this.ngSrc);
      } else {
        // Monitor whether an image is an LCP element only in case
        // the `priority` attribute is missing. Otherwise, an image
        // has the necessary settings and no extra checks are required.
        if (this.lcpObserver !== null) {
          const ngZone = this.injector.get(NgZone);
          ngZone.runOutsideAngular(() => {
            this.lcpObserver!.registerImage(this.getRewrittenSrc(), this.ngSrc);
          });
        }
      }
    }
    this.setHostAttributes();
  }

  private setHostAttributes() {
    // Must set width/height explicitly in case they are bound (in which case they will
    // only be reflected and not found by the browser)
    if (this.fill) {
      if (!this.sizes) {
        this.sizes = '100vw';
      }
    } else {
      this.setHostAttribute('width', this.width!.toString());
      this.setHostAttribute('height', this.height!.toString());
    }

    this.setHostAttribute('loading', this.getLoadingBehavior());
    this.setHostAttribute('fetchpriority', this.getFetchPriority());

    // The `data-ng-img` attribute flags an image as using the directive, to allow
    // for analysis of the directive's performance.
    this.setHostAttribute('ng-img', 'true');

    // The `src` and `srcset` attributes should be set last since other attributes
    // could affect the image's loading behavior.
    const rewrittenSrc = this.getRewrittenSrc();
    this.setHostAttribute('src', rewrittenSrc);

    let rewrittenSrcset: string|undefined = undefined;

    if (this.sizes) {
      this.setHostAttribute('sizes', this.sizes);
    }

    if (this.ngSrcset) {
      rewrittenSrcset = this.getRewrittenSrcset();
    } else if (this.shouldGenerateAutomaticSrcset()) {
      rewrittenSrcset = this.getAutomaticSrcset();
    }

    if (rewrittenSrcset) {
      this.setHostAttribute('srcset', rewrittenSrcset);
    }

    if (this.isServer && this.priority) {
      this.preloadLinkCreator.createPreloadLinkTag(
          this.renderer, rewrittenSrc, rewrittenSrcset, this.sizes);
    }
  }

  /** @nodoc */
  ngOnChanges(changes: SimpleChanges) {
    if (ngDevMode) {
      assertNoPostInitInputChange(this, changes, [
        'ngSrc',
        'ngSrcset',
        'width',
        'height',
        'priority',
        'fill',
        'loading',
        'sizes',
        'loaderParams',
        'disableOptimizedSrcset',
      ]);
    }
  }

  private callImageLoader(configWithoutCustomParams: Omit<ImageLoaderConfig, 'loaderParams'>):
      string {
    let augmentedConfig: ImageLoaderConfig = configWithoutCustomParams;
    if (this.loaderParams) {
      augmentedConfig.loaderParams = this.loaderParams;
    }
    return this.imageLoader(augmentedConfig);
  }

  private getLoadingBehavior(): string {
    if (!this.priority && this.loading !== undefined) {
      return this.loading;
    }
    return this.priority ? 'eager' : 'lazy';
  }

  private getFetchPriority(): string {
    return this.priority ? 'high' : 'auto';
  }

  private getRewrittenSrc(): string {
    // ImageLoaderConfig supports setting a width property. However, we're not setting width here
    // because if the developer uses rendered width instead of intrinsic width in the HTML width
    // attribute, the image requested may be too small for 2x+ screens.
    if (!this._renderedSrc) {
      const imgConfig = {src: this.ngSrc};
      // Cache calculated image src to reuse it later in the code.
      this._renderedSrc = this.callImageLoader(imgConfig);
    }
    return this._renderedSrc;
  }

  private getRewrittenSrcset(): string {
    const widthSrcSet = VALID_WIDTH_DESCRIPTOR_SRCSET.test(this.ngSrcset);
    const finalSrcs = this.ngSrcset.split(',').filter(src => src !== '').map(srcStr => {
      srcStr = srcStr.trim();
      const width = widthSrcSet ? parseFloat(srcStr) : parseFloat(srcStr) * this.width!;
      return `${this.callImageLoader({src: this.ngSrc, width})} ${srcStr}`;
    });
    return finalSrcs.join(', ');
  }

  private getAutomaticSrcset(): string {
    if (this.sizes) {
      return this.getResponsiveSrcset();
    } else {
      return this.getFixedSrcset();
    }
  }

  private getResponsiveSrcset(): string {
    const {breakpoints} = this.config;

    let filteredBreakpoints = breakpoints!;
    if (this.sizes?.trim() === '100vw') {
      // Since this is a full-screen-width image, our srcset only needs to include
      // breakpoints with full viewport widths.
      filteredBreakpoints = breakpoints!.filter(bp => bp >= VIEWPORT_BREAKPOINT_CUTOFF);
    }

    const finalSrcs = filteredBreakpoints.map(
        bp => `${this.callImageLoader({src: this.ngSrc, width: bp})} ${bp}w`);
    return finalSrcs.join(', ');
  }

  private getFixedSrcset(): string {
    const finalSrcs = DENSITY_SRCSET_MULTIPLIERS.map(multiplier => `${this.callImageLoader({
                                                       src: this.ngSrc,
                                                       width: this.width! * multiplier
                                                     })} ${multiplier}x`);
    return finalSrcs.join(', ');
  }

  private shouldGenerateAutomaticSrcset(): boolean {
    return !this._disableOptimizedSrcset && !this.srcset && this.imageLoader !== noopImageLoader &&
        !(this.width! > FIXED_SRCSET_WIDTH_LIMIT || this.height! > FIXED_SRCSET_HEIGHT_LIMIT);
  }

  /** @nodoc */
  ngOnDestroy() {
    if (ngDevMode) {
      if (!this.priority && this._renderedSrc !== null && this.lcpObserver !== null) {
        this.lcpObserver.unregisterImage(this._renderedSrc);
      }
    }
  }

  private setHostAttribute(name: string, value: string): void {
    this.renderer.setAttribute(this.imgElement, name, value);
  }
}

/**
 * \*\* Helpers
 *
 * \*\*帮手
 *
 */

/**
 * Convert input value to integer.
 *
 * 将输入值转换为整数。
 *
 */
function inputToInteger(value: string|number|undefined): number|undefined {
  return typeof value === 'string' ? parseInt(value, 10) : value;
}

/**
 * Convert input value to boolean.
 *
 * 将输入值转换为布尔值。
 *
 */
function inputToBoolean(value: unknown): boolean {
  return value != null && `${value}` !== 'false';
}

/**
 * Sorts provided config breakpoints and uses defaults.
 *
 * 对提供的配置断点进行排序并使用默认值。
 *
 */
function processConfig(config: ImageConfig): ImageConfig {
  let sortedBreakpoints: {breakpoints?: number[]} = {};
  if (config.breakpoints) {
    sortedBreakpoints.breakpoints = config.breakpoints.sort((a, b) => a - b);
  }
  return Object.assign({}, defaultConfig, config, sortedBreakpoints);
}

/**
 * \*\* Assert functions
 *
 * \*\* 断言函数
 *
 */

/**
 * Verifies that there is no `src` set on a host element.
 *
 * 验证没有在宿主元素上设置 `src` 。
 *
 */
function assertNoConflictingSrc(dir: NgOptimizedImage) {
  if (dir.src) {
    throw new RuntimeError(
        RuntimeErrorCode.UNEXPECTED_SRC_ATTR,
        `${imgDirectiveDetails(dir.ngSrc)} both \`src\` and \`ngSrc\` have been set. ` +
            `Supplying both of these attributes breaks lazy loading. ` +
            `The NgOptimizedImage directive sets \`src\` itself based on the value of \`ngSrc\`. ` +
            `To fix this, please remove the \`src\` attribute.`);
  }
}

/**
 * Verifies that there is no `srcset` set on a host element.
 *
 * 验证宿主元素上没有设置 `srcset` 。
 *
 */
function assertNoConflictingSrcset(dir: NgOptimizedImage) {
  if (dir.srcset) {
    throw new RuntimeError(
        RuntimeErrorCode.UNEXPECTED_SRCSET_ATTR,
        `${imgDirectiveDetails(dir.ngSrc)} both \`srcset\` and \`ngSrcset\` have been set. ` +
            `Supplying both of these attributes breaks lazy loading. ` +
            `The NgOptimizedImage directive sets \`srcset\` itself based on the value of ` +
            `\`ngSrcset\`. To fix this, please remove the \`srcset\` attribute.`);
  }
}

/**
 * Verifies that the `ngSrc` is not a Base64-encoded image.
 *
 * 验证 `ngSrc` 不是 Base64 编码的图像。
 *
 */
function assertNotBase64Image(dir: NgOptimizedImage) {
  let ngSrc = dir.ngSrc.trim();
  if (ngSrc.startsWith('data:')) {
    if (ngSrc.length > BASE64_IMG_MAX_LENGTH_IN_ERROR) {
      ngSrc = ngSrc.substring(0, BASE64_IMG_MAX_LENGTH_IN_ERROR) + '...';
    }
    throw new RuntimeError(
        RuntimeErrorCode.INVALID_INPUT,
        `${imgDirectiveDetails(dir.ngSrc, false)} \`ngSrc\` is a Base64-encoded string ` +
            `(${ngSrc}). NgOptimizedImage does not support Base64-encoded strings. ` +
            `To fix this, disable the NgOptimizedImage directive for this element ` +
            `by removing \`ngSrc\` and using a standard \`src\` attribute instead.`);
  }
}

/**
 * Verifies that the 'sizes' only includes responsive values.
 *
 * 验证“尺寸”仅包含响应值。
 *
 */
function assertNoComplexSizes(dir: NgOptimizedImage) {
  let sizes = dir.sizes;
  if (sizes?.match(/((\)|,)\s|^)\d+px/)) {
    throw new RuntimeError(
        RuntimeErrorCode.INVALID_INPUT,
        `${imgDirectiveDetails(dir.ngSrc, false)} \`sizes\` was set to a string including ` +
            `pixel values. For automatic \`srcset\` generation, \`sizes\` must only include responsive ` +
            `values, such as \`sizes="50vw"\` or \`sizes="(min-width: 768px) 50vw, 100vw"\`. ` +
            `To fix this, modify the \`sizes\` attribute, or provide your own \`ngSrcset\` value directly.`);
  }
}

/**
 * Verifies that the `ngSrc` is not a Blob URL.
 *
 * 验证 `ngSrc` 不是 Blob URL。
 *
 */
function assertNotBlobUrl(dir: NgOptimizedImage) {
  const ngSrc = dir.ngSrc.trim();
  if (ngSrc.startsWith('blob:')) {
    throw new RuntimeError(
        RuntimeErrorCode.INVALID_INPUT,
        `${imgDirectiveDetails(dir.ngSrc)} \`ngSrc\` was set to a blob URL (${ngSrc}). ` +
            `Blob URLs are not supported by the NgOptimizedImage directive. ` +
            `To fix this, disable the NgOptimizedImage directive for this element ` +
            `by removing \`ngSrc\` and using a regular \`src\` attribute instead.`);
  }
}

/**
 * Verifies that the input is set to a non-empty string.
 *
 * 验证输入是否设置为非空字符串。
 *
 */
function assertNonEmptyInput(dir: NgOptimizedImage, name: string, value: unknown) {
  const isString = typeof value === 'string';
  const isEmptyString = isString && value.trim() === '';
  if (!isString || isEmptyString) {
    throw new RuntimeError(
        RuntimeErrorCode.INVALID_INPUT,
        `${imgDirectiveDetails(dir.ngSrc)} \`${name}\` has an invalid value ` +
            `(\`${value}\`). To fix this, change the value to a non-empty string.`);
  }
}

/**
 * Verifies that the `ngSrcset` is in a valid format, e.g. "100w, 200w" or "1x, 2x".
 *
 * 验证 `ngSrcset` 的格式是否有效，例如“100w, 200w”或“1x, 2x”。
 *
 */
export function assertValidNgSrcset(dir: NgOptimizedImage, value: unknown) {
  if (value == null) return;
  assertNonEmptyInput(dir, 'ngSrcset', value);
  const stringVal = value as string;
  const isValidWidthDescriptor = VALID_WIDTH_DESCRIPTOR_SRCSET.test(stringVal);
  const isValidDensityDescriptor = VALID_DENSITY_DESCRIPTOR_SRCSET.test(stringVal);

  if (isValidDensityDescriptor) {
    assertUnderDensityCap(dir, stringVal);
  }

  const isValidSrcset = isValidWidthDescriptor || isValidDensityDescriptor;
  if (!isValidSrcset) {
    throw new RuntimeError(
        RuntimeErrorCode.INVALID_INPUT,
        `${imgDirectiveDetails(dir.ngSrc)} \`ngSrcset\` has an invalid value (\`${value}\`). ` +
            `To fix this, supply \`ngSrcset\` using a comma-separated list of one or more width ` +
            `descriptors (e.g. "100w, 200w") or density descriptors (e.g. "1x, 2x").`);
  }
}

function assertUnderDensityCap(dir: NgOptimizedImage, value: string) {
  const underDensityCap =
      value.split(',').every(num => num === '' || parseFloat(num) <= ABSOLUTE_SRCSET_DENSITY_CAP);
  if (!underDensityCap) {
    throw new RuntimeError(
        RuntimeErrorCode.INVALID_INPUT,
        `${
            imgDirectiveDetails(
                dir.ngSrc)} the \`ngSrcset\` contains an unsupported image density:` +
            `\`${value}\`. NgOptimizedImage generally recommends a max image density of ` +
            `${RECOMMENDED_SRCSET_DENSITY_CAP}x but supports image densities up to ` +
            `${ABSOLUTE_SRCSET_DENSITY_CAP}x. The human eye cannot distinguish between image densities ` +
            `greater than ${RECOMMENDED_SRCSET_DENSITY_CAP}x - which makes them unnecessary for ` +
            `most use cases. Images that will be pinch-zoomed are typically the primary use case for ` +
            `${ABSOLUTE_SRCSET_DENSITY_CAP}x images. Please remove the high density descriptor and try again.`);
  }
}

/**
 * Creates a `RuntimeError` instance to represent a situation when an input is set after
 * the directive has initialized.
 *
 * 创建一个 `RuntimeError` 实例来表示在指令初始化后设置输入的情况。
 *
 */
function postInitInputChangeError(dir: NgOptimizedImage, inputName: string): {} {
  let reason!: string;
  if (inputName === 'width' || inputName === 'height') {
    reason = `Changing \`${inputName}\` may result in different attribute value ` +
        `applied to the underlying image element and cause layout shifts on a page.`;
  } else {
    reason = `Changing the \`${inputName}\` would have no effect on the underlying ` +
        `image element, because the resource loading has already occurred.`;
  }
  return new RuntimeError(
      RuntimeErrorCode.UNEXPECTED_INPUT_CHANGE,
      `${imgDirectiveDetails(dir.ngSrc)} \`${inputName}\` was updated after initialization. ` +
          `The NgOptimizedImage directive will not react to this input change. ${reason} ` +
          `To fix this, either switch \`${inputName}\` to a static value ` +
          `or wrap the image element in an *ngIf that is gated on the necessary value.`);
}

/**
 * Verify that none of the listed inputs has changed.
 *
 * 确认列出的输入均未更改。
 *
 */
function assertNoPostInitInputChange(
    dir: NgOptimizedImage, changes: SimpleChanges, inputs: string[]) {
  inputs.forEach(input => {
    const isUpdated = changes.hasOwnProperty(input);
    if (isUpdated && !changes[input].isFirstChange()) {
      if (input === 'ngSrc') {
        // When the `ngSrc` input changes, we detect that only in the
        // `ngOnChanges` hook, thus the `ngSrc` is already set. We use
        // `ngSrc` in the error message, so we use a previous value, but
        // not the updated one in it.
        dir = {ngSrc: changes[input].previousValue} as NgOptimizedImage;
      }
      throw postInitInputChangeError(dir, input);
    }
  });
}

/**
 * Verifies that a specified input is a number greater than 0.
 *
 * 验证指定的输入是否为大于 0 的数字。
 *
 */
function assertGreaterThanZero(dir: NgOptimizedImage, inputValue: unknown, inputName: string) {
  const validNumber = typeof inputValue === 'number' && inputValue > 0;
  const validString =
      typeof inputValue === 'string' && /^\d+$/.test(inputValue.trim()) && parseInt(inputValue) > 0;
  if (!validNumber && !validString) {
    throw new RuntimeError(
        RuntimeErrorCode.INVALID_INPUT,
        `${imgDirectiveDetails(dir.ngSrc)} \`${inputName}\` has an invalid value ` +
            `(\`${inputValue}\`). To fix this, provide \`${inputName}\` ` +
            `as a number greater than 0.`);
  }
}

/**
 * Verifies that the rendered image is not visually distorted. Effectively this is checking:
 *
 * 验证渲染图像在视觉上没有失真。 这实际上是在检查：
 *
 * - Whether the "width" and "height" attributes reflect the actual dimensions of the image.
 *
 *   “宽度”和“高度”属性是否反映图像的实际尺寸。
 *
 * - Whether image styling is "correct" \(see below for a longer explanation\).
 *
 *   图片样式是否“正确”（详见下文）。
 *
 */
function assertNoImageDistortion(
    dir: NgOptimizedImage, img: HTMLImageElement, renderer: Renderer2) {
  const removeListenerFn = renderer.listen(img, 'load', () => {
    removeListenerFn();
    const computedStyle = window.getComputedStyle(img);
    let renderedWidth = parseFloat(computedStyle.getPropertyValue('width'));
    let renderedHeight = parseFloat(computedStyle.getPropertyValue('height'));
    const boxSizing = computedStyle.getPropertyValue('box-sizing');

    if (boxSizing === 'border-box') {
      const paddingTop = computedStyle.getPropertyValue('padding-top');
      const paddingRight = computedStyle.getPropertyValue('padding-right');
      const paddingBottom = computedStyle.getPropertyValue('padding-bottom');
      const paddingLeft = computedStyle.getPropertyValue('padding-left');
      renderedWidth -= parseFloat(paddingRight) + parseFloat(paddingLeft);
      renderedHeight -= parseFloat(paddingTop) + parseFloat(paddingBottom);
    }

    const renderedAspectRatio = renderedWidth / renderedHeight;
    const nonZeroRenderedDimensions = renderedWidth !== 0 && renderedHeight !== 0;

    const intrinsicWidth = img.naturalWidth;
    const intrinsicHeight = img.naturalHeight;
    const intrinsicAspectRatio = intrinsicWidth / intrinsicHeight;

    const suppliedWidth = dir.width!;
    const suppliedHeight = dir.height!;
    const suppliedAspectRatio = suppliedWidth / suppliedHeight;

    // Tolerance is used to account for the impact of subpixel rendering.
    // Due to subpixel rendering, the rendered, intrinsic, and supplied
    // aspect ratios of a correctly configured image may not exactly match.
    // For example, a `width=4030 height=3020` image might have a rendered
    // size of "1062w, 796.48h". (An aspect ratio of 1.334... vs. 1.333...)
    const inaccurateDimensions =
        Math.abs(suppliedAspectRatio - intrinsicAspectRatio) > ASPECT_RATIO_TOLERANCE;
    const stylingDistortion = nonZeroRenderedDimensions &&
        Math.abs(intrinsicAspectRatio - renderedAspectRatio) > ASPECT_RATIO_TOLERANCE;

    if (inaccurateDimensions) {
      console.warn(formatRuntimeError(
          RuntimeErrorCode.INVALID_INPUT,
          `${imgDirectiveDetails(dir.ngSrc)} the aspect ratio of the image does not match ` +
              `the aspect ratio indicated by the width and height attributes. ` +
              `\nIntrinsic image size: ${intrinsicWidth}w x ${intrinsicHeight}h ` +
              `(aspect-ratio: ${
                  round(intrinsicAspectRatio)}). \nSupplied width and height attributes: ` +
              `${suppliedWidth}w x ${suppliedHeight}h (aspect-ratio: ${
                  round(suppliedAspectRatio)}). ` +
              `\nTo fix this, update the width and height attributes.`));
    } else if (stylingDistortion) {
      console.warn(formatRuntimeError(
          RuntimeErrorCode.INVALID_INPUT,
          `${imgDirectiveDetails(dir.ngSrc)} the aspect ratio of the rendered image ` +
              `does not match the image's intrinsic aspect ratio. ` +
              `\nIntrinsic image size: ${intrinsicWidth}w x ${intrinsicHeight}h ` +
              `(aspect-ratio: ${round(intrinsicAspectRatio)}). \nRendered image size: ` +
              `${renderedWidth}w x ${renderedHeight}h (aspect-ratio: ` +
              `${round(renderedAspectRatio)}). \nThis issue can occur if "width" and "height" ` +
              `attributes are added to an image without updating the corresponding ` +
              `image styling. To fix this, adjust image styling. In most cases, ` +
              `adding "height: auto" or "width: auto" to the image styling will fix ` +
              `this issue.`));
    } else if (!dir.ngSrcset && nonZeroRenderedDimensions) {
      // If `ngSrcset` hasn't been set, sanity check the intrinsic size.
      const recommendedWidth = RECOMMENDED_SRCSET_DENSITY_CAP * renderedWidth;
      const recommendedHeight = RECOMMENDED_SRCSET_DENSITY_CAP * renderedHeight;
      const oversizedWidth = (intrinsicWidth - recommendedWidth) >= OVERSIZED_IMAGE_TOLERANCE;
      const oversizedHeight = (intrinsicHeight - recommendedHeight) >= OVERSIZED_IMAGE_TOLERANCE;
      if (oversizedWidth || oversizedHeight) {
        console.warn(formatRuntimeError(
            RuntimeErrorCode.OVERSIZED_IMAGE,
            `${imgDirectiveDetails(dir.ngSrc)} the intrinsic image is significantly ` +
                `larger than necessary. ` +
                `\nRendered image size: ${renderedWidth}w x ${renderedHeight}h. ` +
                `\nIntrinsic image size: ${intrinsicWidth}w x ${intrinsicHeight}h. ` +
                `\nRecommended intrinsic image size: ${recommendedWidth}w x ${
                    recommendedHeight}h. ` +
                `\nNote: Recommended intrinsic image size is calculated assuming a maximum DPR of ` +
                `${RECOMMENDED_SRCSET_DENSITY_CAP}. To improve loading time, resize the image ` +
                `or consider using the "ngSrcset" and "sizes" attributes.`));
      }
    }
  });
}

/**
 * Verifies that a specified input is set.
 *
 * 验证是否设置了指定的输入。
 *
 */
function assertNonEmptyWidthAndHeight(dir: NgOptimizedImage) {
  let missingAttributes = [];
  if (dir.width === undefined) missingAttributes.push('width');
  if (dir.height === undefined) missingAttributes.push('height');
  if (missingAttributes.length > 0) {
    throw new RuntimeError(
        RuntimeErrorCode.REQUIRED_INPUT_MISSING,
        `${imgDirectiveDetails(dir.ngSrc)} these required attributes ` +
            `are missing: ${missingAttributes.map(attr => `"${attr}"`).join(', ')}. ` +
            `Including "width" and "height" attributes will prevent image-related layout shifts. ` +
            `To fix this, include "width" and "height" attributes on the image tag or turn on ` +
            `"fill" mode with the \`fill\` attribute.`);
  }
}

/**
 * Verifies that width and height are not set. Used in fill mode, where those attributes don't make
 * sense.
 *
 * 验证未设置宽度和高度。 用于填充模式，其中这些属性没有意义。
 *
 */
function assertEmptyWidthAndHeight(dir: NgOptimizedImage) {
  if (dir.width || dir.height) {
    throw new RuntimeError(
        RuntimeErrorCode.INVALID_INPUT,
        `${
            imgDirectiveDetails(
                dir.ngSrc)} the attributes \`height\` and/or \`width\` are present ` +
            `along with the \`fill\` attribute. Because \`fill\` mode causes an image to fill its containing ` +
            `element, the size attributes have no effect and should be removed.`);
  }
}

/**
 * Verifies that the rendered image has a nonzero height. If the image is in fill mode, provides
 * guidance that this can be caused by the containing element's CSS position property.
 *
 * 验证渲染图像具有非零高度。 如果图像处于填充模式，则提供指导说明这可能是由包含元素的 CSS position 属性引起的。
 *
 */
function assertNonZeroRenderedHeight(
    dir: NgOptimizedImage, img: HTMLImageElement, renderer: Renderer2) {
  const removeListenerFn = renderer.listen(img, 'load', () => {
    removeListenerFn();
    const renderedHeight = img.clientHeight;
    if (dir.fill && renderedHeight === 0) {
      console.warn(formatRuntimeError(
          RuntimeErrorCode.INVALID_INPUT,
          `${imgDirectiveDetails(dir.ngSrc)} the height of the fill-mode image is zero. ` +
              `This is likely because the containing element does not have the CSS 'position' ` +
              `property set to one of the following: "relative", "fixed", or "absolute". ` +
              `To fix this problem, make sure the container element has the CSS 'position' ` +
              `property defined and the height of the element is not zero.`));
    }
  });
}

/**
 * Verifies that the `loading` attribute is set to a valid input &
 * is not used on priority images.
 *
 * 验证 `loading` 属性是否设置为有效输入并且未在优先图像上使用。
 *
 */
function assertValidLoadingInput(dir: NgOptimizedImage) {
  if (dir.loading && dir.priority) {
    throw new RuntimeError(
        RuntimeErrorCode.INVALID_INPUT,
        `${imgDirectiveDetails(dir.ngSrc)} the \`loading\` attribute ` +
            `was used on an image that was marked "priority". ` +
            `Setting \`loading\` on priority images is not allowed ` +
            `because these images will always be eagerly loaded. ` +
            `To fix this, remove the “loading” attribute from the priority image.`);
  }
  const validInputs = ['auto', 'eager', 'lazy'];
  if (typeof dir.loading === 'string' && !validInputs.includes(dir.loading)) {
    throw new RuntimeError(
        RuntimeErrorCode.INVALID_INPUT,
        `${imgDirectiveDetails(dir.ngSrc)} the \`loading\` attribute ` +
            `has an invalid value (\`${dir.loading}\`). ` +
            `To fix this, provide a valid value ("lazy", "eager", or "auto").`);
  }
}

/**
 * Warns if NOT using a loader \(falling back to the generic loader\) and
 * the image appears to be hosted on one of the image CDNs for which
 * we do have a built-in image loader. Suggests switching to the
 * built-in loader.
 *
 * 如果不使用加载器（回退到通用加载器）并且图像似乎托管在我们有内置图像加载器的图像 CDN 之一上，则会发出警告。 建议切换到内置加载器。
 *
 * @param ngSrc Value of the ngSrc attribute
 *
 * ngSrc 属性的值
 *
 * @param imageLoader ImageLoader provided
 *
 * 提供 ImageLoader
 *
 */
function assertNotMissingBuiltInLoader(ngSrc: string, imageLoader: ImageLoader) {
  if (imageLoader === noopImageLoader) {
    let builtInLoaderName = '';
    for (const loader of BUILT_IN_LOADERS) {
      if (loader.testUrl(ngSrc)) {
        builtInLoaderName = loader.name;
        break;
      }
    }
    if (builtInLoaderName) {
      console.warn(formatRuntimeError(
          RuntimeErrorCode.MISSING_BUILTIN_LOADER,
          `NgOptimizedImage: It looks like your images may be hosted on the ` +
              `${builtInLoaderName} CDN, but your app is not using Angular's ` +
              `built-in loader for that CDN. We recommend switching to use ` +
              `the built-in by calling \`provide${builtInLoaderName}Loader()\` ` +
              `in your \`providers\` and passing it your instance's base URL. ` +
              `If you don't want to use the built-in loader, define a custom ` +
              `loader function using IMAGE_LOADER to silence this warning.`));
    }
  }
}

/**
 * Warns if ngSrcset is present and no loader is configured \(i.e. the default one is being used\).
 *
 * 如果 ngSrcset 存在并且没有配置加载器（即正在使用默认加载器），则发出警告。
 *
 */
function assertNoNgSrcsetWithoutLoader(dir: NgOptimizedImage, imageLoader: ImageLoader) {
  if (dir.ngSrcset && imageLoader === noopImageLoader) {
    console.warn(formatRuntimeError(
        RuntimeErrorCode.MISSING_NECESSARY_LOADER,
        `${imgDirectiveDetails(dir.ngSrc)} the \`ngSrcset\` attribute is present but ` +
            `no image loader is configured (i.e. the default one is being used), ` +
            `which would result in the same image being used for all configured sizes. ` +
            `To fix this, provide a loader or remove the \`ngSrcset\` attribute from the image.`));
  }
}

/**
 * Warns if loaderParams is present and no loader is configured \(i.e. the default one is being
 * used\).
 *
 * 如果 loaderParams 存在并且没有配置加载器（即正在使用默认加载器），则发出警告。
 *
 */
function assertNoLoaderParamsWithoutLoader(dir: NgOptimizedImage, imageLoader: ImageLoader) {
  if (dir.loaderParams && imageLoader === noopImageLoader) {
    console.warn(formatRuntimeError(
        RuntimeErrorCode.MISSING_NECESSARY_LOADER,
        `${imgDirectiveDetails(dir.ngSrc)} the \`loaderParams\` attribute is present but ` +
            `no image loader is configured (i.e. the default one is being used), ` +
            `which means that the loaderParams data will not be consumed and will not affect the URL. ` +
            `To fix this, provide a custom loader or remove the \`loaderParams\` attribute from the image.`));
  }
}


function round(input: number): number|string {
  return Number.isInteger(input) ? input : input.toFixed(2);
}
