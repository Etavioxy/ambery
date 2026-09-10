<!-- 一级 widget：Select —— 包 bits-ui 的 Select 原语（单选取值/键盘/定位/点外关归原语）。
     为什么不用原生 <select>：它的选项弹层是 OS 级的，会被 alwaysOnTop 窗口盖住；
     bits-ui 在文档内浮层渲染，属窗口表面的一部分，抬窗时一起抬。
     外观沿用既有 .cfg-select-* 契约（视觉零变化）；类钩子与全局样式暂留全局，样式收拢随后一刀。
     可选 add：下拉下方「+」触发器 + 一格输入弹层（新增枚举项，如给 llm.active 加 provider）。 -->
<script lang="ts">
  import { Select as BitsSelect } from "bits-ui";

  let {
    options,
    value,
    readOnly = false,
    add = null,
    class: className = "",
    onChange,
  }: {
    options: readonly string[];
    value: string;
    readOnly?: boolean;
    add?: {
      label: string;
      /** 确认前本地校验：返回错误文本则格内红字拦截 */
      validate?: (value: string) => string | null;
      onConfirm: (value: string) => Promise<{ ok: boolean; error?: string }>;
    } | null;
    class?: string;
    onChange: (value: string) => void;
  } = $props();

  let popupOpen = $state(false);
  let popupValue = $state("");
  let popupError = $state<string | null>(null);

  function openPopup() {
    popupValue = "";
    popupError = null;
    popupOpen = true;
  }

  async function confirmPopup() {
    if (!add) return;
    const v = popupValue.trim();
    const invalid = add.validate?.(v) ?? null;
    if (invalid) {
      popupError = invalid;
      return;
    }
    const resp = await add.onConfirm(v);
    if (!resp.ok) {
      popupError = resp.error ?? "";
      return;
    }
    popupOpen = false;
  }
</script>

<div class="cfg-select">
  <BitsSelect.Root
    type="single"
    {value}
    disabled={readOnly}
    onValueChange={(next) => onChange(next)}
  >
    <BitsSelect.Trigger class="cfg-select-btn {className}">
      <BitsSelect.Value />
      <svg class="cfg-select-arrow" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true">
        <path
          d="M1 1l4 4 4-4"
          stroke="currentColor"
          stroke-width="2"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </BitsSelect.Trigger>
    <BitsSelect.Portal>
      <BitsSelect.Content class="cfg-select-list">
        <BitsSelect.Viewport>
          {#each options as option (option)}
            <BitsSelect.Item class="cfg-select-option" value={option}>{option}</BitsSelect.Item>
          {/each}
        </BitsSelect.Viewport>
      </BitsSelect.Content>
    </BitsSelect.Portal>
  </BitsSelect.Root>

  {#if add && !readOnly}
    <!-- addMode：「+」触发器（独立行靠右），点它弹一格输入 + ✓ -->
    <button
      class="cfg-select-add-trigger"
      type="button"
      title={add.label}
      onclick={openPopup}
    >+</button>
    {#if popupOpen}
      <div class="cfg-select-add-popup">
        <div class="cfg-select-add-cell">
          <input
            class="cfg-select-add-input"
            placeholder={add.label}
            bind:value={popupValue}
            onkeydown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                void confirmPopup();
              }
            }}
          />
          <button class="cfg-select-add-confirm" type="button" onclick={() => void confirmPopup()}>✓</button>
        </div>
        {#if popupError !== null}
          <div class="cfg-select-add-err">{popupError || "写入失败"}</div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  /* 注意：`.cfg-select-btn/-arrow/-list/-option` 落在 bits-ui 的 Trigger/Content/Item 上
     （子组件元素拿不到本组件的作用域哈希），故必须 :global——否则会被当"未使用"剪掉。
     其余 .cfg-select（本组件自己的容器）与 addMode 弹层是本组件元素，保持作用域样式。

     原生 select 的弹出层是 OS 级的，会被 alwaysOnTop 窗口本体盖住，故走 DOM 内浮层。
     按钮复刻原生 select（appearance:none + 同 token/尺寸）；箭头 = 内联 SVG 下 chevron。 */
  .cfg-select {
    position: relative;
    display: inline-block;
  }
  :global(.cfg-select-btn) {
    position: relative;
    appearance: none;
    -webkit-appearance: none;
    box-sizing: content-box; /* 与 .cfg-line select 默认 box-sizing 一致，渲染尺寸对齐 */
    width: 170px; /* 与原生 select 声明宽度一致 */
    background: var(--ov-input-bg);
    border: 1px solid var(--ov-input-border);
    border-radius: 5px;
    color: var(--ov-text-strong);
    padding: 3px 6px;
    font: inherit;
    text-align: left;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  :global(.cfg-select-arrow) {
    position: absolute;
    right: 5px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--ov-text-strong);
    pointer-events: none;
  }
  :global(.cfg-select-btn:disabled) {
    opacity: 0.45;
    cursor: default;
  }
  :global(.cfg-select-btn:disabled .cfg-select-arrow) {
    opacity: 0.6;
  }
  /* 浮层：bits-ui 用 floating 定位（逃出滚动容器），本处只给视觉 */
  :global(.cfg-select-list) {
    position: fixed;
    z-index: 10000;
    box-sizing: border-box;
    background: var(--ov-panel-bg);
    border: 1px solid var(--ov-input-border);
    border-radius: 5px;
    box-shadow: var(--ov-popup-shadow);
    overflow-y: auto;
    /* 浮层 append 到 body，不继承 .cfg-line 的主题色/字体——显式补上 */
    color: var(--ov-text-strong);
    font: inherit;
  }
  :global(.cfg-select-option) {
    padding: 3px 8px; /* 上下 3px 与原生 select 一致 → 选项行高≈select 高 */
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  :global(.cfg-select-option:hover) {
    background: var(--ov-accent-bg);
  }
  /* 选中态：bits-ui 的 Item 带 data-selected */
  :global(.cfg-select-option[data-selected]) {
    color: var(--ov-accent);
  }
  .cfg-select-add-trigger {
    display: block;
    margin: 4px 0 0 auto;
    width: 20px;
    height: 20px;
    padding: 0;
    line-height: 1;
    border: 1px solid var(--ov-input-border);
    border-radius: 5px;
    background: var(--ov-input-bg);
    color: var(--ov-text-strong);
    cursor: pointer;
  }
  .cfg-select-add-trigger:hover {
    border-color: var(--ov-accent-border);
    color: var(--ov-accent);
  }
  /* 一格输入弹层：贴触发器下方右对齐（旧实现用 JS 按 rect 定 fixed 位置，等价视觉） */
  .cfg-select-add-popup {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 10000;
    box-sizing: border-box;
    min-width: 170px;
    background: var(--ov-panel-bg);
    border: 1px solid var(--ov-input-border);
    border-radius: 5px;
    box-shadow: var(--ov-popup-shadow);
    color: var(--ov-text-strong);
    padding: 2px;
  }
  .cfg-select-add-cell {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .cfg-select-add-input {
    flex: 1;
    min-width: 0;
    background: var(--ov-input-bg);
    border: 1px solid var(--ov-input-border);
    border-radius: 4px;
    color: var(--ov-text-strong);
    padding: 2px 6px;
    font: inherit;
  }
  .cfg-select-add-confirm {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    padding: 0;
    line-height: 1;
    border: 1px solid var(--ov-input-border);
    border-radius: 4px;
    background: var(--ov-input-bg);
    color: var(--ov-ok);
    cursor: pointer;
  }
  .cfg-select-add-confirm:hover {
    border-color: var(--ov-success);
  }
  .cfg-select-add-err {
    color: var(--ov-error);
    font-size: 11px;
    padding: 2px 6px 4px;
  }
</style>
