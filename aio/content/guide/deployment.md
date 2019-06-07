# Deployment

# 部署

When you are ready to deploy your Angular application to a remote server, you have various options for deployment.

当你准备把 Angular 应用部署到远程服务器上时，有很多可选的部署方式。

{@a dev-deploy}

{@a copy-files}


## Simple deployment options

## 最简单的部署选项


Before fully deploying your application, you can test the process, build configuration, and deployed behavior by using one of these interim techniques

在完整部署应用之前，你可以先临时用一种技术来测试流程、构建配置和部署行为。


### Building and serving from disk

### 从磁盘构建和提供服务


During development, you typically use the `ng serve` command to build, watch, and serve the application from local memory, using [webpack-dev-server](https://webpack.js.org/guides/development/#webpack-dev-server).
When you are ready to deploy, however, you must use the `ng build` command to build the app and deploy the build artifacts elsewhere.

在开发过程中，你通常会使用 `ng serve` 命令来借助 [webpack-dev-server](https://webpack.js.org/guides/development/#webpack-dev-server) 在本地内存中构建、监控和提供服务。但是，当你打算部署它时，就必须使用 `ng build` 命令来构建应用并在其它地方部署这些构建成果。


Both `ng build` and `ng serve` clear the output folder before they build the project, but only the `ng build` command writes the generated build artifacts to the output folder.

`ng build` 和 `ng serve` 在构建项目之前都会清除输出文件夹，但只有 `ng build` 命令会把生成的构建成果写入输出输出文件夹中。


<div class="alert is-helpful">

The output folder is  `dist/project-name/` by default.
To output to a different folder, change the `outputPath` in `angular.json`.

默认情况下，输出目录是 `dist/project-name/`。要输出到其它文件夹，就要修改 `angular.json` 中的 `outputPath`。


</div>

As you near the end of the development process, serving the contents of your output folder from a local web server can give you a better idea of how your application will behave when it is deployed to a remote server.
You will need two terminals to get the live-reload experience.

当开发临近收尾时，让本地 Web 服务器使用输出文件夹中的内容提供服务可以让你更好地了解当应用部署到远程服务器时的行为。你需要用两个终端才能体验到实时刷新的特性。


* On the first terminal, run the [`ng build` command](cli/build) in *watch* mode to compile the application to the `dist` folder.

  在第一个终端上，在*监控（watch）*模式下执行 [`ng build` 命令](cli/build)把该应用编译进 `dist` 文件夹。


  <code-example language="none" class="code-shell">
   ng build --watch
  </code-example>

  Like the `ng serve` command, this regenerates output files when source files change.

  与 `ng serve` 命令一样，当源文件发生变化时，就会重新生成输出文件。


* On the second terminal, install a web server (such as [lite-server](https://github.com/johnpapa/lite-server)), and run it against the output folder. For example:

  在第二个终端上，安装一个 Web 服务器（比如 [lite-server](https://github.com/johnpapa/lite-server) ），然后使用输出文件夹中的内容运行它。例如：


  <code-example language="none" class="code-shell">
   lite-server --baseDir="dist"
  </code-example>

   The server will automatically reload your browser when new files are output.

   每当输出了新文件时，服务器就会自动刷新你的浏览器。


<div class="alert is-critical">

This method is for development and testing only, and is not a supported or secure way of deploying an application.

该方法只能用于开发和测试，在部署应用时，它不受支持，也不是安全的方式。


</div>

### Basic deployment to a remote server

### 最简化的部署方式

For the simplest deployment, create a production build and copy the output directory to a web server.

最简化的部署方式就是为开发环境构建，并把其输出复制到 Web 服务器上。

1. Start with the production build:

   使用开发环境进行构建

  <code-example language="none" class="code-shell">
    ng build --prod
  </code-example>

2. Copy _everything_ within the output folder (`dist/` by default) to a folder on the server.

   把输出目录（默认为 `dist/`）下的*每个文件*都复制到到服务器上的某个目录下。

3. Configure the server to redirect requests for missing files to `index.html`.
Learn more about server-side redirects [below](#fallback).

   配置服务器，让缺失的文件都重定向到 `index.html` 上。
   欲知详情，参见[稍后](#fallback)的服务端重定向部分。

This is the simplest production-ready deployment of your application.

这是对应用进行生产环境部署的最简方式。

{@a deploy-to-github}

### Deploy to GitHub pages

### 发布到 GitHub pages（页面服务）

Another simple way to deploy your Angular app is to use [GitHub Pages](https://help.github.com/articles/what-is-github-pages/).

另一种发布 Angular 应用的简单途径是使用 [GitHub Pages](https://help.github.com/articles/what-is-github-pages/)。

1. You need to [create a GitHub account](https://github.com/join) if you don't have one, and then [create a repository](https://help.github.com/articles/create-a-repo/) for your project.
Make a note of the user name and project name in GitHub.

   你需要[创建一个 GitHub 账号](https://github.com/join)（如果没有的话），然后为你的项目[创建一个仓库](https://help.github.com/articles/create-a-repo/)。记下 GitHub 中的用户名和项目名。

1. Build your project using Github project name, with the Angular CLI command [`ng build`](cli/build) and the options shown here:

   使用 Angular CLI 命令 [`ng build`](cli/build) 来构建这个 GitHub 项目，选项如下：

   <code-example language="none" class="code-shell">
     ng build --prod --output-path docs --base-href /<project_name>/
    </code-example>

1. When the build is complete, make a copy of `docs/index.html` and name it `docs/404.html`.

   当构建完成时，把 `docs/index.html` 复制为 `docs/404.html`。

1. Commit your changes and push.

   提交你的更改，并推送。

1. On the GitHub project page, configure it to [publish from the docs folder](https://help.github.com/articles/configuring-a-publishing-source-for-github-pages/#publishing-your-github-pages-site-from-a-docs-folder-on-your-master-branch).

   在 GitHub 的项目页中，把该项目配置为[从 docs 目录下发布](https://help.github.com/articles/configuring-a-publishing-source-for-github-pages/#publishing-your-github-pages-site-from-a-docs-folder-on-your-master-branch)。

You can see your deployed page at `https://<user_name>.github.io/<project_name>/`.

你可以到 `https://<user_name>.github.io/<project_name>/` 中查看部署好的页面。

<div class="alert is-helpful">

Check out [angular-cli-ghpages](https://github.com/angular-buch/angular-cli-ghpages), a full featured package that does all this for you and has extra functionality.

 参见 [angular-cli-ghpages](https://github.com/angular-buch/angular-cli-ghpages)，这个包用到了全部这些特性，还提供了一些额外功能。

</div>

<hr>

{@a server-configuration}

## Server configuration

## 服务端配置

This section covers changes you may have make to the server or to files deployed to the server.

这一节涵盖了你可能对服务器或准备部署到服务器的文件要做的那些修改。

{@a fallback}

### Routed apps must fallback to `index.html`

### 带路由的应用必须以 `index.html` 作为后备页面

Angular apps are perfect candidates for serving with a simple static HTML server.
You don't need a server-side engine to dynamically compose application pages because
Angular does that on the client-side.

Angular 应用很适合用简单的静态 HTML 服务器提供服务。
你不需要服务端引擎来动态合成应用页面，因为 Angular 会在客户端完成这件事。

If the app uses the Angular router, you must configure the server
to return the application's host page (`index.html`) when asked for a file that it does not have.

如果该应用使用 Angular 路由器，你就必须配置服务器，让它对不存在的文件返回应用的宿主页(`index.html`)。

{@a deep-link}

A routed application should support "deep links".
A _deep link_ is a URL that specifies a path to a component inside the app.
For example, `http://www.mysite.com/heroes/42` is a _deep link_ to the hero detail page
that displays the hero with `id: 42`.

带路由的应用应该支持“深链接”。
所谓*深链接*就是指一个 URL，它用于指定到应用内某个组件的路径。
比如，`http://www.mysite.com/heroes/42` 就是一个到英雄详情页面的*深链接*，用于显示 `id: 42` 的英雄。

There is no issue when the user navigates to that URL from within a running client.
The Angular router interprets the URL and routes to that page and hero.

当用户从运行中的客户端应用导航到这个 URL 时，这没问题。
Angular 路由器会拦截这个 URL，并且把它路由到正确的页面。

But clicking a link in an email, entering it in the browser address bar,
or merely refreshing the browser while on the hero detail page &mdash;
all of these actions are handled by the browser itself, _outside_ the running application.
The browser makes a direct request to the server for that URL, bypassing the router.

但是，当从邮件中点击链接或在浏览器地址栏中输入它或仅仅在英雄详情页刷新下浏览器时，所有这些操作都是由浏览器本身处理的，在应用的控制范围之外。
浏览器会直接向服务器请求那个 URL，路由器没机会插手。

A static server routinely returns `index.html` when it receives a request for `http://www.mysite.com/`.
But it rejects `http://www.mysite.com/heroes/42` and returns a `404 - Not Found` error *unless* it is
configured to return `index.html` instead.

静态服务器会在收到对 `http://www.mysite.com/` 的请求时返回 `index.html`，但是会拒绝对 `http://www.mysite.com/heroes/42` 的请求，
并返回一个 `404 - Not Found` 错误，除非，它被配置成了返回 `index.html`。

#### Fallback configuration examples

#### 后备页面配置范例

There is no single configuration that works for every server.
The following sections describe configurations for some of the most popular servers.
The list is by no means exhaustive, but should provide you with a good starting point.

没有一种配置可以适用于所有服务器。
后面这些部分会描述对常见服务器的配置方式。
这个列表虽然不够详尽，但可以为你提供一个良好的起点。

* [Apache](https://httpd.apache.org/): add a
[rewrite rule](http://httpd.apache.org/docs/current/mod/mod_rewrite.html) to the `.htaccess` file as shown
  (https://ngmilk.rocks/2015/03/09/angularjs-html5-mode-or-pretty-urls-on-apache-using-htaccess/):

   [Apache](https://httpd.apache.org/)：在 `.htaccess` 文件中添加一个[重写规则](http://httpd.apache.org/docs/current/mod/mod_rewrite.html)，
代码如下（[出处](https://ngmilk.rocks/2015/03/09/angularjs-html5-mode-or-pretty-urls-on-apache-using-htaccess/)）：

  <code-example format=".">
    RewriteEngine On
    &#35 If an existing asset or directory is requested go to it as it is
    RewriteCond %{DOCUMENT_ROOT}%{REQUEST_URI} -f [OR]
    RewriteCond %{DOCUMENT_ROOT}%{REQUEST_URI} -d
    RewriteRule ^ - [L]

    &#35 If the requested resource doesn't exist, use index.html
    RewriteRule ^ /index.html
  </code-example>

* [Nginx](http://nginx.org/): use `try_files`, as described in
[Front Controller Pattern Web Apps](https://www.nginx.com/resources/wiki/start/topics/tutorials/config_pitfalls/#front-controller-pattern-web-apps),
modified to serve `index.html`:

   [NGinx](http://nginx.org/)：使用 `try_files` 指向 `index.html`，详细描述见[Web 应用的前端控制器模式](https://www.nginx.com/resources/wiki/start/topics/tutorials/config_pitfalls/#front-controller-pattern-web-apps)。

  <code-example format=".">
    try_files $uri $uri/ /index.html;
  </code-example>

* [IIS](https://www.iis.net/): add a rewrite rule to `web.config`, similar to the one shown
[here](http://stackoverflow.com/a/26152011/2116927):

   [IIS](https://www.iis.net/)：往 `web.config` 中添加一条重写规则，类似于[这里](http://stackoverflow.com/a/26152011/2116927)：

  <code-example format='.'>
    &lt;system.webServer&gt;
      &lt;rewrite&gt;
        &lt;rules&gt;
          &lt;rule name="Angular Routes" stopProcessing="true"&gt;
            &lt;match url=".*" /&gt;
            &lt;conditions logicalGrouping="MatchAll"&gt;
              &lt;add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" /&gt;
              &lt;add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" /&gt;
            &lt;/conditions&gt;
            &lt;action type="Rewrite" url="/index.html" /&gt;
          &lt;/rule&gt;
        &lt;/rules&gt;
      &lt;/rewrite&gt;
    &lt;/system.webServer&gt;

  </code-example>

* [GitHub Pages](https://pages.github.com/): you can't
[directly configure](https://github.com/isaacs/github/issues/408)
the GitHub Pages server, but you can add a 404 page.
Copy `index.html` into `404.html`.
It will still be served as the 404 response, but the browser will process that page and load the app properly.
It's also a good idea to
[serve from `docs/` on master](https://help.github.com/articles/configuring-a-publishing-source-for-github-pages/#publishing-your-github-pages-site-from-a-docs-folder-on-your-master-branch)
and to
[create a `.nojekyll` file](https://www.bennadel.com/blog/3181-including-node-modules-and-vendors-folders-in-your-github-pages-site.htm)

   [GitHub 页面服务](https://pages.github.com/)：你没办法[直接配置](https://github.com/isaacs/github/issues/408) Github 的页面服务，但可以添加一个 404 页，只要把 `index.html` 复制到 `404.html` 就可以了。
  它仍然会给出一个 404 响应，但是浏览器将会正确处理该页，并正常加载该应用。
  使用[在主分支的 `docs/` 下启动服务](https://help.github.com/articles/configuring-a-publishing-source-for-github-pages/#publishing-your-github-pages-site-from-a-docs-folder-on-your-master-branch)
  并[创建一个 `.nojekyll` 文件](https://www.bennadel.com/blog/3181-including-node-modules-and-vendors-folders-in-your-github-pages-site.htm)也是一个好办法。

* [Firebase hosting](https://firebase.google.com/docs/hosting/): add a
[rewrite rule](https://firebase.google.com/docs/hosting/url-redirects-rewrites#section-rewrites).

   [Firebase 主机服务](https://firebase.google.com/docs/hosting/)：添加一条[重写规则](https://firebase.google.com/docs/hosting/url-redirects-rewrites#section-rewrites)。

  <code-example format=".">
    "rewrites": [ {
      "source": "**",
      "destination": "/index.html"
    } ]

  </code-example>

{@a cors}

### Requesting services from a different server (CORS)

### 请求来自另一个服务器的服务（CORS）

Angular developers may encounter a
<a href="https://en.wikipedia.org/wiki/Cross-origin_resource_sharing" title="Cross-origin resource sharing">
<i>cross-origin resource sharing</i></a> error when making a service request (typically a data service request)
to a server other than the application's own host server.
Browsers forbid such requests unless the server permits them explicitly.

Angular 开发者在向与该应用的宿主服务器不同域的服务器发起请求时，可能会遇到一种<a href="https://en.wikipedia.org/wiki/Cross-origin_resource_sharing" target="_blank" title="Cross-origin resource sharing"><i>跨域资源共享（CORS）</i></a>错误。
浏览器会阻止该请求，除非得到那台服务器的明确许可。

There isn't anything the client application can do about these errors.
The server must be configured to accept the application's requests.
Read about how to enable CORS for specific servers at
<a href="http://enable-cors.org/server.html" title="Enabling CORS server">enable-cors.org</a>.

客户端应用对这种错误无能为力。
服务器必须配置成可以接受来自该应用的请求。
要了解如何对特定的服务器开启 CORS，参见<a href="http://enable-cors.org/server.html" target="_blank" title="Enabling CORS server">enable-cors.org</a>。

<hr>

{@a optimize}

## Production optimizations

## 为生产环境优化

The `--prod` _meta-flag_ engages the following build optimization features.

`--prod` 标志具有如下优化特性。

* [Ahead-of-Time (AOT) Compilation](guide/aot-compiler): pre-compiles Angular component templates.

  [预先(AOT)编译](guide/aot-compiler)：预编译 Angular 的组件模板。

* [Production mode](#enable-prod-mode): deploys the production environment which enables _production mode_.

  [生产模式](#enable-prod-mode)：部署到启用了*生产模式*的生产环境。

* Bundling: concatenates your many application and library files into a few bundles.

  打包：把你的多个应用于库文件拼接到少量包（bundle）中。

* Minification: removes excess whitespace, comments, and optional tokens.

  最小化：删除多余的空格、注释和可选令牌。

* Uglification: rewrites code to use short, cryptic variable and function names.

  混淆/丑化：重写代码，使用简短的、不容易理解的变量名和函数名。

* Dead code elimination: removes unreferenced modules and much unused code.

  消除死代码：删除未引用过的模块和很多未用到的代码。

See [`ng build`](cli/build) for more about CLI build options and what they do.

要了解关于 CLI 构建选项及其作用的更多知识，参见 [`ng build`](cli/build)。

{@a enable-prod-mode}

### Enable runtime production mode

### 启用生产模式

In addition to build optimizations, Angular also has a runtime production mode. Angular apps run in development mode by default, as you can see by the following message on the browser console:

除了构建期优化之外，Angular 还支持运行期生产模式。Angular 应用默认运行在开发模式下，你可以在浏览器的控制台中看到如下信息：

<code-example format="nocode">
  Angular is running in the development mode. Call enableProdMode() to enable the production mode.
</code-example>

Switching to _production mode_ makes it run faster by disabling development specific checks such as the dual change detection cycles.

切换到*生产模式*可以通过禁用开发阶段特有的检查（比如双重变更检测周期）来让它运行得更快。

When you enable production builds via `--prod` command line flag, the runtime production mode is enabled as well.

如果在构建时添加了 `--prod` 标识，也会同时启用*运行期生产模式*。

{@a lazy-loading}

### Lazy loading

### 惰性加载

You can dramatically reduce launch time by only loading the application modules that
absolutely must be present when the app starts.

通过只加载应用启动时绝对必须的那些模块，你可以极大缩短应用启动的时间。

Configure the Angular Router to defer loading of all other modules (and their associated code), either by
[waiting until the app has launched](guide/router#preloading  "Preloading")
or by [_lazy loading_](guide/router#asynchronous-routing "Lazy loading")
them on demand.

可以配置 Angular 的路由器，来推迟所有其它模块（及其相关代码）的加载时机，方法有[一直等到应用启动完毕](guide/router#preloading  "Preloading")，或者当用到时才按需[*惰性加载*](guide/router#asynchronous-routing "Lazy loading")。

<div class="alert is-helpful">

#### Don't eagerly import something from a lazy-loaded module

#### 不要急性（eagerly）导入来自惰性加载模块中的任何东西

If you mean to lazy-load a module, be careful not import it
in a file that's eagerly loaded when the app starts (such as the root `AppModule`).
If you do that, the module will be loaded immediately.

如果要惰性加载某个模块，就要小心别在应用启动时要急性加载的模块（比如根模块 `AppModule`）中导入它。
如果那么做，该模块就会立刻加载起来。

The bundling configuration must take lazy loading into consideration.
Because lazy-loaded modules aren't imported in JavaScript, bundlers exclude them by default.
Bundlers don't know about the router configuration and can't create separate bundles for lazy-loaded modules.
You would have to create these bundles manually.

配置打包方式时必须考虑惰性加载。
因为默认情况下惰性加载的模块没有在 JavaScript 中导入过，因此打包器默认会排除它们。
打包器不认识路由器配置，也就不能为惰性加载的模块创建独立的包。
你必须手动创建这些包。

The CLI runs the
[Angular Ahead-of-Time Webpack Plugin](https://github.com/angular/angular-cli/tree/master/packages/%40ngtools/webpack)
which automatically recognizes lazy-loaded `NgModules` and creates separate bundles for them.

CLI 会运行 [Angular Ahead-of-Time Webpack 插件](https://github.com/angular/angular-cli/tree/master/packages/%40ngtools/webpack)，它会自动识别出惰性加载的 `NgModules`，并为它们创建独立的包。

</div>

{@a measure}

### Measure performance

### 测量性能

You can make better decisions about what to optimize and how when you have a clear and accurate understanding of
what's making the application slow.
The cause may not be what you think it is.
You can waste a lot of time and money optimizing something that has no tangible benefit or even makes the app slower.
You should measure the app's actual behavior when running in the environments that are important to you.

如果你对哪些东西拖慢了应用有更加清晰、精确的了解，就可以更好地决定优化什么以及如何优化。
慢的原因可能和你所想的不一样。
你可能花费了大量的时间和金钱来优化一些实际上无关紧要的东西，甚至可能让应用变得更慢。
你应该测量应用在运行环境中的实际行为，这才是最重要的。

<p>
The
<a href="https://developers.google.com/web/tools/chrome-devtools/network-performance/understanding-resource-timing" title="Chrome DevTools Network Performance">
Chrome DevTools Network Performance page</a> is a good place to start learning about measuring performance.
</p>

<p><a href="https://developers.google.com/web/tools/chrome-devtools/network-performance/understanding-resource-timing" title="Chrome DevTools Network Performance">
Chrome DevTools 的网络和性能页</a>是你开始学习如何测量性能的好地方。</p>

The [WebPageTest](https://www.webpagetest.org/) tool is another good choice
that can also help verify that your deployment was successful.

[WebPageTest](https://www.webpagetest.org/)工具是另一个不错的选择，它还能帮你验证这次部署是否成功。

{@a inspect-bundle}

### Inspect the bundles

### 检查发布包

The <a href="https://github.com/danvk/source-map-explorer/blob/master/README.md">source-map-explorer</a>
tool is a great way to inspect the generated JavaScript bundles after a production build.

<a href="https://github.com/danvk/source-map-explorer/blob/master/README.md">source-map-explorer</a> 工具可以帮你在生产环境构建之后探查 JavaScript 包。

Install `source-map-explorer`:

安装 `source-map-explorer`：

<code-example language="none" class="code-shell">
  npm install source-map-explorer --save-dev
</code-example>

Build your app for production _including the source maps_

为生产环境构建应用，包括源码映射表（source map）

<code-example language="none" class="code-shell">
  ng build --prod --source-map
</code-example>

List the generated bundles in the `dist/` folder.

在 `dist/` 目录下列出生成的包。

<code-example language="none" class="code-shell">
  ls dist/*.bundle.js
</code-example>

Run the explorer to generate a graphical representation of one of the bundles.
The following example displays the graph for the _main_ bundle.

运行浏览器来生成其中一个包的图形化表示。
下面的例子展示了 `main` 包的图表。

<code-example language="none" class="code-shell">
  node_modules/.bin/source-map-explorer dist/main.*.bundle.js
</code-example>

The `source-map-explorer` analyzes the source map generated with the bundle and draws a map of all dependencies,
showing exactly which classes are included in the bundle.

`source-map-explorer` 会分析与包一起生成的 source map，并画出所有依赖的地图，精确展示哪些类包含在哪个包中。

Here's the output for the _main_ bundle of an example app called `cli-quickstart`.

下面是 "快速上手" 应用中 `main` 包的输出。

<figure>
  <img src="generated/images/guide/deployment/quickstart-sourcemap-explorer.png" alt="quickstart sourcemap explorer">
</figure>

{@a base-tag}

## The `base` tag

## `base` 标签

The HTML [_&lt;base href="..."/&gt;_](/guide/router)
specifies a base path for resolving relative URLs to assets such as images, scripts, and style sheets.
For example, given the `<base href="/my/app/">`, the browser resolves a URL such as `some/place/foo.jpg`
into a server request for `my/app/some/place/foo.jpg`.
During navigation, the Angular router uses the _base href_ as the base path to component, template, and module files.

HTML 的 [_&lt;base href="..."/&gt;_](/guide/router) 标签指定了用于解析静态文件（如图片、脚本和样式表）相对地址的基地址。
比如，对于 `<base href="/my/app/">`，浏览器就会把 `some/place/foo.jpg` 这样的 URL 解析成到 `my/app/some/place/foo.jpg` 的请求。
在导航期间，Angular 路由器使用 *base href* 作为到组件模板文件和模块文件的基地址。

<div class="alert is-helpful">

See also the [*APP_BASE_HREF*](api/common/APP_BASE_HREF "API: APP_BASE_HREF") alternative.

另一种方式参见 [*APP_BASE_HREF*](api/common/APP_BASE_HREF "API: APP_BASE_HREF")。

</div>

In development, you typically start the server in the folder that holds `index.html`.
That's the root folder and you'd add `<base href="/">` near the top of `index.html` because `/` is the root of the app.

在开发期间，你通常会在存有 `index.html` 的目录下启动开发服务器。
那就是根目录，你要在 `index.html` 的顶部附近添加 `<base href="/">`，因为 `/` 就是该应用的根路径。

But on the shared or production server, you might serve the app from a subfolder.
For example, when the URL to load the app is something like `http://www.mysite.com/my/app/`,
the subfolder is `my/app/` and you should add `<base href="/my/app/">` to the server version of the `index.html`.

但是在共享或生产服务器上，你可能会在子目录下启动服务器。
比如，当前应用的加载地址可能类似于 `http://www.mysite.com/my/app/`，这里的子目录就是 `my/app/`。所以你就要往服务端版本的 `index.html` 中添加 `<base href="/my/app/">`。

When the `base` tag is mis-configured, the app fails to load and the browser console displays `404 - Not Found` errors
for the missing files. Look at where it _tried_ to find those files and adjust the base tag appropriately.

这里如果不配置 `base` 标签，应用就会失败，并在浏览器的控制台中为缺失的文件显示一个 `404 - Not Found` 错误。看看它*试图*从哪里去查找那些文件，并据此调整 base 标签。

## Differential Loading

## 差异化加载

When building web applications, making sure your application is compatible with the majority of browsers is a goal. Even as JavaScript continues to evolve, with new features being introduced, not all browsers are updated with support for these new features at the same pace. This is where compilation and [polyfills](guide/browser-support#polyfills) come in. The code you write in development using TypeScript is compiled and bundled into a format that is compatible with most browsers, commonly known as ES5. Polyfills are used bridge the gap, providing functionality that simply doesn't exist in some legacy browsers. 

在构建 Web 应用时，确保你的应用与大多数浏览器兼容是目标之一。JavaScript 在不断发展，新功能不断推出，不是所有浏览器都能以同样的进度实现这些新功能。这就是编译和[腻子脚本（polyfill）](guide/browser-support#polyfills)的用武之地。你在开发过程中使用 TypeScript 编写的代码会被编译并打包成一种兼容大多数浏览器的格式，通常为 ES5。 腻子脚本用于抹平差距，提供一些老式浏览器中根本不存在的功能。


There is a cost to ensure this browser compatibility, and it comes in the form of larger bundle size. All modern browsers support ES2015 and beyond, but in most cases, you still have to account for users accessing your application from a browser that doesn't. To maximize compatibility, you ship a single bundle that includes all your compiled code, plus any polyfills that may be needed. Users with modern browsers shouldn't pay the price of increased bundle size when used in a modern browser that supports many of the latest features in JavaScript. This is where differential loading comes into play.

确保这种浏览器的兼容性是有代价的，那就是更大的包体积。所有现代浏览器都支持 ES2015 及更高版本，但在大多数情况下，你仍然要考虑那些从老式浏览器访问你的应用的用户。为了最大限度地提高兼容性，你需要发布一个包含所有已编译代码的发布包（bundle），以及所有可能会用到的腻子脚本。用户如果在支持大量最新 JavaScript 特性的现代浏览器中使用此应用，他就不应该为这些额外的包体积付出启动时间和流量等方面的代价。这就是差异化加载发挥作用的地方。


Differential loading is a strategy where the CLI builds two separate bundles as part of your deployed application. The modern bundle contains modern syntax, takes advantage of built-in support in modern browsers, ships less polyfills, and results in a smaller bundle size. The second bundle, includes the additional compiled code, all necessary polyfills, and results in a larger bundle size. This strategy allows you to continue to build your web application to support multiple browsers, but only load the necessary code that the browser needs.

差异化加载是指 CLI 在构建应用时，构建两个单独发布包的策略。现代的发布包中包含了现代的语法，利用了现代浏览器的内置支持，减少了腻子脚本的运行需求，减小了发布包的大小。第二个发布包中则包含了额外的编译代码，所有必需的腻子脚本，并导致了更大的包大小。这个策略允许你继续构建你的 Web 应用来支持多个浏览器，但是只加载相应浏览器中必需的代码。


### Differential builds

### 差异化构建


The Angular CLI handles differential loading for you as part of the _build_ process for deployment. The Angular CLI will produce the necessary bundles used for differential loading, based on your browser support requirements and compilation target. 

在面向部署的*构建*过程中，Angular CLI 会为你处理差异化加载。Angular CLI 会根据浏览器的支持情况和编译目标生成用于差异化加载的必要的发布包。


The Angular CLI uses two configurations for differential loading:

Angular CLI 使用两种配置进行差异化加载：


- Browserslist - The `browserslist` configuration file is included in your application [project structure](guide/file-structure#application-configuration-files) and provides the minimum browsers your application supports. See the [Browserslist spec](https://github.com/browserslist/browserslist) for complete configuration options.

  浏览器列表 - `browserslist` 配置文件包含在应用的[项目结构中](guide/file-structure#application-configuration-files)，它提供了本应用打算支持的最低浏览器版本。有关完整的配置选项，请参阅 [Browserslist 规范](https://github.com/browserslist/browserslist) 。

- tsconfig.json - The `target` in the TypeScript `compilerOptions` determines the ECMAScript target version that the code is compiled to. Modern browsers support ES2015 natively, while ES5 is more commonly used to support legacy browsers.

  tsconfig.json - TypeScript `compilerOptions` 中的 `target` 会决定编译后代码的 ECMAScript 目标版本。现代浏览器原生支持 ES2015，而 ES5 则更常用于支持老式浏览器。


<div class="alert is-helpful">

**Note:** Differential loading is currently only supported when using `es2015` as a compilation `target`. When used with targets higher than `es2015`, a warning is emitted during build time.

**注意：**目前，只有使用 `es2015` 作为编译 `target` 时，才支持差异化加载。当目标版本高于 `es2015` 时，会在构建时发出警告。


</div>

The CLI queries the Browserslist configuration, and checks the `target` to determine if support for legacy browsers is required. The combination of these two configurations determines whether multiple bundles are produced when you create a _build_. When you create a development build using [`ng build`](cli/build) and differential loading is enabled, the output produced is simpler and easier to debug, allowing you to rely less on sourcemaps of compiled code. When you create a production build using [`ng build --prod`](cli/build), the CLI uses the defined configurations above to determine the bundles to build for deployment of your application. 

CLI会查询 "浏览器列表" 配置，并检查 `target` 以确定是否需要支持老式浏览器。这两种配置的结合决定了在创建*构建*时是否产生了多个发布包。当使用 [`ng build`](cli/build) 创建开发构建时，如果启用了差异化加载，产生的输出就会更简单，也更容易调试，因为你可以更少地依赖已编译代码的 sourcemaps。当你使用 [`ng build --prod`](cli/build) 创建一个产品环境构建时，CLI 会使用上面定义的配置来确定要为部署你的应用而构建哪些包。


The `index.html` file is also modified during the build process to include script tags that enable differential loading. See the sample output below from the `index.html` file produced during a build using `ng build`.

在构建过程中还会修改 `index.html` 文件，以包含启用差异化加载的脚本标记。从使用 `ng build` 生成的 `index.html` 文件中可以看到如下输出：


```html
<!-- ... -->
<body>
  <app-root></app-root>
  <script src="runtime-es2015.js" type="module"></script>
  <script src="runtime-es5.js" nomodule></script>
  <script src="polyfills-es2015.js" type="module"></script>
  <script src="polyfills-es5.js" nomodule></script>
  <script src="styles-es2015.js" type="module"></script>
  <script src="styles-es5.js" nomodule></script>
  <script src="vendor-es2015.js" type="module"></script>
  <script src="vendor-es5.js" nomodule></script>
  <script src="main-es2015.js" type="module"></script>
  <script src="main-es5.js" nomodule></script>
</body>
<!-- ... -->
```

Each script tag has a `type="module"` or `nomodule` attribute. Browsers with native support for ES modules only load the scripts with the `module` type attribute and ignore scripts with the `nomodule` attribute. Legacy browsers only load the scripts with the `nomodule` attribute, and ignore the script tags with the `module` type that load ES modules. 

每个 script 标签都有一个 `type="module"` 或 `nomodule` 属性。原生支持 ES 模块的浏览器只会加载带有该类型属性的脚本，而忽略那些带有 `nomodule` 属性的脚本。而老式浏览器只会加载带有`nomodule`属性的脚本，而忽略那些 type 为 `module` 的脚本标签。


<div class="alert is-helpful">

**Note:** Some legacy browsers still download both bundles, but only execute the appropriate scripts based on the attributes mentioned above. You can read more on the issue [here](https://github.com/philipwalton/webpack-esnext-boilerplate/issues/1).

**注意：** 有些老式浏览器仍会下载这两个包，但会根据上面提到的属性仅执行相应的脚本。你可以到[这里](https://github.com/philipwalton/webpack-esnext-boilerplate/issues/1)阅读更多信息。


</div>

See the [configuration table](#configuration-table) below for the configurations for enabling differential loading.

参见下面的[配置表](#configuration-table)，了解启用差异化加载的配置。


### Configuring differential loading

### 配置差异化加载


Differential loading for creating builds is already supported with version 8 and later of the Angular CLI. For each application project in your workspace, you can configure how builds are produced based on the mentioned `browserslist` and `tsconfig.json` files in your application project.

Angular CLI 第 8 版及更高版本已支持构建差异化加载的发布包。工作空间中的每个应用项目，都可以根据其中的 `browserslist` 和 `tsconfig.json` 文件来配置发布包的构建方式。


Look at the default configuration for a newly created Angular application:

来看看新创建的 Angular 应用的默认配置：


The `browserslist` looks like this:

`browserslist` 是这样的：


```
> 0.5%
last 2 versions
Firefox ESR
not dead
not IE 9-11 # For IE 9-11 support, remove 'not'.
```

The `tsconfig.json` looks like this:

`tsconfig.json` 是这样的：


```
{
  "compileOnSave": false,
  "compilerOptions": {
    "baseUrl": "./",
    "outDir": "./dist/out-tsc",
    "sourceMap": true,
    "declaration": false,
    "module": "esnext",
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "es2015",
    "typeRoots": [
      "node_modules/@types"
    ],
    "lib": [
      "es2018",
      "dom"
    ]
  }
}
```

By default, legacy browsers such as IE 9-11 are ignored, and the compilation target is ES2015. As a result, this produces two builds, and differential loading is enabled. If you ignore browsers without ES2015 support, a single build is produced. To see the build result for differential loading based on different configurations, refer to the table below. 

默认情况下，会忽略老式浏览器（如IE 9-11），其编译目标设置为 ES2015。结果就会生成两个发布包，并启用差异化加载。如果忽略全部不支持 ES2015 的浏览器，就只会生成一个版本。要了解不同配置下差异化加载的构建结果，请参考下表。


<div class="alert is-important">

**Note:** To see which browsers are supported with the above configuration, see which settings meet to your browser support requirements, see the [Browserslist compatibility page](https://browserl.ist/?q=%3E+0.5%25%2C+last+2+versions%2C+Firefox+ESR%2C+Chrome+41%2C+not+dead%2C+not+IE+9-11).

**注意：**要查看上述配置会支持哪些浏览器，以及哪些设置符合特定浏览器的兼容性，请参阅“ [浏览器列表兼容性”页面](https://browserl.ist/?q=%3E+0.5%25%2C+last+2+versions%2C+Firefox+ESR%2C+Chrome+41%2C+not+dead%2C+not+IE+9-11) 。


</div>

{@a configuration-table }

{@a configuration-table}


| ES5 Browserslist Result | ES Target | Build Result                                             |
| ----------------------- | --------- | -------------------------------------------------------- |
| ES5 浏览器列表结果    | ES 目标    | 构建结果                                                 |
| disabled                | es5       | Single build                                             |
| 禁用                  | es5       | 单一构建                                                 |
| enabled                 | es5       | Single build w/Conditional Polyfills                     |
| 启用                  | es5       | 单一构建，按需附带腻子脚本                               |
| disabled                | es2015    | Single build                                             |
| 禁用                  | es2015    | 单一构建                                                 |
| enabled                 | es2015    | Differential Loading (Two builds w/Conditional Polyfills |
| 启用                  | es2015    | 差异化加载（两个构建，按需附带腻子脚本）                       |

When the ES5 Browserslist result is `disabled`, then ES5 browser support is not required. Otherwise, ES5 browser support is required.

当 ES5 浏览器列表的结果为 `disabled` 时，不需要 ES5 浏览器的支持，反之则需要。


### Opting out of differential loading

### 选择性地排除差异化加载


Differential loading can be explicitly disabled if it causes unexpected issues or you need to target ES5 specifically for legacy browser support. 

如果遇到意外问题，或者需要专门为老式浏览器而支持 ES5，也可以明确禁用差异化加载。


To explicitly disable differential loading:

要明确禁用差异化加载：


- Enable the `dead` or `IE` browsers in the `browserslist` config file by removing the `not` keyword in front of them.

  通过在 `browserslist` 配置文件中删除 `dead` 或 `IE` 前面的 `not` 关键字，即可启用这些浏览器。

- Set the `target` in the `compilerOptions` to `es5`.

  把 `compilerOptions` 中的 `target` 设置为 `es5`。
