<!-- 一级 widget：Input —— 文本 / 数字 / 密码 / 勾选的一层包装。
     bits-ui 没有对应原语，本 widget 自己写：值进出、禁用、错误态。
     提交语义是「失焦/回车」而非逐键（与既有配置行一致）；需要逐键的场景用 bind:value。
     外观沿用既有 .cfg-line 契约（字体、边框、内距由行的全局规则给），故这里不写样式。 -->
<script lang="ts">
  let {
    type = "text",
    value = $bindable(""),
    checked = false,
    disabled = false,
    min = null,
    max = null,
    step = null,
    placeholder = null,
    class: className = "",
    onCommit,
  }: {
    type?: "text" | "number" | "password" | "checkbox";
    value?: string;
    checked?: boolean;
    disabled?: boolean;
    min?: number | null;
    max?: number | null;
    step?: string | null;
    placeholder?: string | null;
    class?: string;
    onCommit: (value: string | number | boolean) => void;
  } = $props();

  function commit(ev: Event) {
    const el = ev.currentTarget as HTMLInputElement;
    if (type === "checkbox") {
      onCommit(el.checked);
      return;
    }
    if (type === "number") {
      onCommit(step === "0.1" ? parseFloat(el.value) : parseInt(el.value, 10));
      return;
    }
    onCommit(el.value);
  }
</script>

{#if type === "checkbox"}
  <input type="checkbox" class={className} {checked} {disabled} onchange={commit} />
{:else}
  <input
    {type}
    class={className}
    bind:value
    {disabled}
    {placeholder}
    min={min ?? undefined}
    max={max ?? undefined}
    step={step ?? undefined}
    onchange={commit}
  />
{/if}
