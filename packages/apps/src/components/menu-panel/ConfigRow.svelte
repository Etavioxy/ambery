<!-- 二级业务组件：一行配置（schema 节点 → 控件 + 名称 + desc）。
     认识 Config 的形状但不认识 core：值经 applyValue 回调出去（写、校验、广播都在 core）。
     控件按 kind 选：bool → Input(勾选)、enum → Select、int/float → Input(数字)、str → Input(文本)，
     其余只读呈现。表情池的 face 行额外给一个池间原子移动按钮（整节点写入，保原子性）。 -->
<script lang="ts">
  import type { ConfigSchemaNode } from "../../bridge";
  import { t } from "../../i18n";
  import Button from "../../widgets/button/Button.svelte";
  import Input from "../../widgets/input/Input.svelte";
  import Select from "../../widgets/select/Select.svelte";

  let {
    node,
    readOnly,
    pools = null,
    applyValue,
  }: {
    node: ConfigSchemaNode;
    readOnly: boolean;
    pools?: { system: Record<string, unknown>; user: Record<string, unknown> } | null;
    /** 写值：返回 false = core 拒绝（本行控件转错误态） */
    applyValue: (path: string, value: unknown) => Promise<boolean>;
  } = $props();

  const label = $derived(node.path.split(".").slice(1).join(".") || node.path);
  const kind = $derived(node.type.kind);
  /** 表情池条目行：kaomoji.{system|user}.<key>.face */
  const poolMove = $derived(node.path.match(/^kaomoji\.(system|user)\.([^.]+)\.face$/));
  const moveTo = $derived(poolMove ? (poolMove[1] === "system" ? "user" : "system") : null);
  let bad = $state(false);

  async function commit(value: unknown) {
    bad = !(await applyValue(node.path, value));
  }

  async function movePool() {
    if (!pools || !poolMove || !moveTo) return;
    const from = poolMove[1] as "system" | "user";
    const key = poolMove[2];
    const next: { system: Record<string, unknown>; user: Record<string, unknown> } = {
      system: { ...pools.system },
      user: { ...pools.user },
    };
    const entry = next[from][key];
    delete next[from][key];
    next[moveTo][key] = entry;
    bad = !(await applyValue("kaomoji", next));
  }
</script>

{#if kind === "map"}
  <!-- map 节点只作分组标记（条目已展开为独立子节点） -->
  <div class="cfg-row">
    <div class="map-head" title={node.desc ?? ""}>
      {label} <span class="dim">{t("menu.map-tag")}</span>
    </div>
  </div>
{:else}
  <div class="cfg-row">
    <div class="cfg-line">
      <!-- 长路径在面板内被截断，hover 看全；desc 已作为行下 hint 可见，不再重复 -->
      <div class="name" title={node.path}>{label}</div>
      {#if kind === "bool"}
        <Input
          type="checkbox"
          class={bad ? "bad" : ""}
          checked={node.value === true}
          disabled={readOnly}
          onCommit={commit}
        />
      {:else if kind === "enum"}
        <Select
          class={bad ? "bad" : ""}
          options={node.type.options ?? []}
          value={String(node.value ?? "")}
          {readOnly}
          onChange={commit}
        />
      {:else if kind === "int" || kind === "float"}
        <Input
          type="number"
          class={bad ? "bad" : ""}
          value={String(node.value)}
          min={node.type.min ?? null}
          max={node.type.max ?? null}
          step={kind === "float" ? "0.1" : null}
          disabled={readOnly}
          onCommit={commit}
        />
      {:else if kind === "str"}
        <Input
          type="text"
          class={bad ? "bad" : ""}
          value={String(node.value ?? "")}
          disabled={readOnly}
          onCommit={commit}
        />
      {:else}
        <code class="readonly">{JSON.stringify(node.value)}</code>
      {/if}
      {#if poolMove && pools && moveTo}
        <Button
          variant="quiet"
          disabled={readOnly}
          title={t("menu.move-title", { key: poolMove[2], to: moveTo })}
          onclick={() => void movePool()}
        >→{moveTo}</Button>
      {/if}
    </div>
    {#if node.desc}
      <div class="desc">{node.desc}</div>
    {/if}
  </div>
{/if}
