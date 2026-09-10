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
