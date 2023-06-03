/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ɵgetDOM as getDOM} from '@angular/common';
import {Directive, ElementRef, forwardRef, Inject, InjectionToken, Optional, Renderer2} from '@angular/core';

import {BaseControlValueAccessor, ControlValueAccessor, NG_VALUE_ACCESSOR} from './control_value_accessor';

export const DEFAULT_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => DefaultValueAccessor),
  multi: true
};

/**
 * We must check whether the agent is Android because composition events
 * behave differently between iOS and Android.
 *
 * 我们必须检查代理是否是 Android，因为组合事件在 iOS 和 Android 之间的行为方式不同。
 *
 */
function _isAndroid(): boolean {
  const userAgent = getDOM() ? getDOM().getUserAgent() : '';
  return /android (\d+)/.test(userAgent.toLowerCase());
}

/**
 * @description
 * Provide this token to control if form directives buffer IME input until
 * the "compositionend" event occurs.
 *
 * 提供此令牌来控制表单指令是否要缓冲 IME 输入，直到发生“ compositionend” 事件为止。
 *
 * @publicApi
 */
export const COMPOSITION_BUFFER_MODE = new InjectionToken<boolean>('CompositionEventMode');

/**
 * The default `ControlValueAccessor` for writing a value and listening to changes on input
 * elements. The accessor is used by the `FormControlDirective`, `FormControlName`, and
 * `NgModel` directives.
 *
 * 默认的 `ControlValueAccessor` ，用于写入值并监听输入元素的更改。该访问器供 `FormControlDirective`
 * 、`FormControlName` 和 `NgModel` 指令使用。
 *
 * {@searchKeywords ngDefaultControl}
 *
 * @usageNotes
 *
 * ### Using the default value accessor
 *
 * ### 使用默认值访问器
 *
 * The following example shows how to use an input element that activates the default value accessor
 * \(in this case, a text field\).
 *
 * 以下示例演示了如何使用输入元素激活默认值访问器（在这种情况下为文本字段）。
 *
 * ```ts
 * const firstNameControl = new FormControl();
 * ```
 *
 * ```
 * <input type="text" [formControl]="firstNameControl">
 * ```
 *
 * This value accessor is used by default for `<input type="text">` and `<textarea>` elements, but
 * you could also use it for custom components that have similar behavior and do not require special
 * processing. In order to attach the default value accessor to a custom element, add the
 * `ngDefaultControl` attribute as shown below.
 *
 * 默认情况下，此值访问器用于 `<input type="text">` 和 `<textarea>`
 * 元素，但你也可以将其用于具有类似行为且不需要特殊处理的自定义组件。为了将默认值访问器附加到自定义元素，请添加
 * `ngDefaultControl` 属性，如下所示。
 *
 * ```
 * <custom-input-component ngDefaultControl [(ngModel)]="value"></custom-input-component>
 * ```
 * @ngModule ReactiveFormsModule
 * @ngModule FormsModule
 * @publicApi
 */
@Directive({
  selector:
      'input:not([type=checkbox])[formControlName],textarea[formControlName],input:not([type=checkbox])[formControl],textarea[formControl],input:not([type=checkbox])[ngModel],textarea[ngModel],[ngDefaultControl]',
  // TODO: vsavkin replace the above selector with the one below it once
  // https://github.com/angular/angular/issues/3011 is implemented
  // selector: '[ngModel],[formControl],[formControlName]',
  host: {
    '(input)': '$any(this)._handleInput($event.target.value)',
    '(blur)': 'onTouched()',
    '(compositionstart)': '$any(this)._compositionStart()',
    '(compositionend)': '$any(this)._compositionEnd($event.target.value)'
  },
  providers: [DEFAULT_VALUE_ACCESSOR]
})
export class DefaultValueAccessor extends BaseControlValueAccessor implements ControlValueAccessor {
  /**
   * Whether the user is creating a composition string (IME events).
   *
   * 用户是否正在创建合成字符串（IME 事件）。
   *
   */
  private _composing = false;

  constructor(
      renderer: Renderer2, elementRef: ElementRef,
      @Optional() @Inject(COMPOSITION_BUFFER_MODE) private _compositionMode: boolean) {
    super(renderer, elementRef);
    if (this._compositionMode == null) {
      this._compositionMode = !_isAndroid();
    }
  }

  /**
   * Sets the "value" property on the input element.
   *
   * 在输入元素上设置 “value” 属性。
   *
   * @nodoc
   */
  writeValue(value: any): void {
    const normalizedValue = value == null ? '' : value;
    this.setProperty('value', normalizedValue);
  }

  /** @internal */
  _handleInput(value: any): void {
    if (!this._compositionMode || (this._compositionMode && !this._composing)) {
      this.onChange(value);
    }
  }

  /** @internal */
  _compositionStart(): void {
    this._composing = true;
  }

  /** @internal */
  _compositionEnd(value: any): void {
    this._composing = false;
    this._compositionMode && this.onChange(value);
  }
}
