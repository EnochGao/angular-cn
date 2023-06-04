/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ReactiveNode, setActiveConsumer} from './graph';

/**
 * A cleanup function that can be optionally registered from the watch logic. If registered, the
 * cleanup logic runs before the next watch execution.
 *
 * 可以从监视逻辑中选择性地注册的清理功能。如果已注册，清理逻辑将在下一次监视执行之前运行。
 *
 */
export type WatchCleanupFn = () => void;

/**
 * A callback passed to the watch function that makes it possible to register cleanup logic.
 *
 * 传递给监视函数的回调，使注册清理逻辑成为可能。
 *
 */
export type WatchCleanupRegisterFn = (cleanupFn: WatchCleanupFn) => void;

const NOOP_CLEANUP_FN: WatchCleanupFn = () => {};

/**
 * Watches a reactive expression and allows it to be scheduled to re-run
 * when any dependencies notify of a change.
 *
 * 观察一个反应式表达式，并允许它被安排在任何依赖项通知更改时重新运行。
 *
 * `Watch` doesn't run reactive expressions itself, but relies on a consumer-
 * provided scheduling operation to coordinate calling `Watch.run()`.
 *
 * `Watch` 本身不运行反应式表达式，而是依赖于消费者提供的调度操作来协调调用 `Watch.run()`。
 *
 */
export class Watch extends ReactiveNode {
  protected override readonly consumerAllowSignalWrites: boolean;
  private dirty = false;
  private cleanupFn = NOOP_CLEANUP_FN;
  private registerOnCleanup =
      (cleanupFn: WatchCleanupFn) => {
        this.cleanupFn = cleanupFn;
      }

  constructor(
      private watch: (onCleanup: WatchCleanupRegisterFn) => void,
      private schedule: (watch: Watch) => void, allowSignalWrites: boolean) {
    super();
    this.consumerAllowSignalWrites = allowSignalWrites;
  }

  notify(): void {
    if (!this.dirty) {
      this.schedule(this);
    }
    this.dirty = true;
  }

  protected override onConsumerDependencyMayHaveChanged(): void {
    this.notify();
  }

  protected override onProducerUpdateValueVersion(): void {
    // Watches are not producers.
  }

  /**
   * Execute the reactive expression in the context of this `Watch` consumer.
   *
   * 在此 `Watch` 消费者的上下文中执行反应式表达式。
   *
   * Should be called by the user scheduling algorithm when the provided
   * `schedule` hook is called by `Watch`.
   *
   * 当 `Watch` 调用提供的 `schedule` 挂钩时，应该由用户调度算法调用。
   *
   */
  run(): void {
    this.dirty = false;
    if (this.trackingVersion !== 0 && !this.consumerPollProducersForChange()) {
      return;
    }

    const prevConsumer = setActiveConsumer(this);
    this.trackingVersion++;
    try {
      this.cleanupFn();
      this.cleanupFn = NOOP_CLEANUP_FN;
      this.watch(this.registerOnCleanup);
    } finally {
      setActiveConsumer(prevConsumer);
    }
  }

  cleanup() {
    this.cleanupFn();
  }
}
