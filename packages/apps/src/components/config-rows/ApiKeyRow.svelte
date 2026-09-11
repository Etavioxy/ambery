<!-- 二级业务组件：provider key 输入行（形态乙——写应用级 env 文件，config.json 永不存 key）。
     - local = 本地端点（base_url 指向本机）→ 无需 key，只给提示。
     - 否则密码框 + 保存：状态按宿主查询判定（未设置 → 警示占位；已设置 → 留空则不改动 + 来源提示）。
     - 保存：留空 = 不改动；填值 = 覆盖。成功后刷新状态并回调 onChanged（引导 modal 会重跑连通测试）。
     - 无清除：key 只增不删，覆盖即更新。
     取值/写值经 props 进来的回调（组件不碰 bridge）。 -->
<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../../i18n";

  let {
    provider,
    envName,
    local,
    readOnly,
    loadStatus,
    save,
    onChanged = null,
  }: {
    provider: string;
    envName: string;
    local: boolean;
    readOnly: boolean;
    loadStatus: (provider: string) => Promise<{ set: boolean; source: string | null }>;
    save: (provider: string, value: string) => Promise<{ ok: boolean; error?: string }>;
    onChanged?: (() => void) | null;
  } = $props();

  let value = $state("");
  let isSet = $state(false);
  let source = $state<string | null>(null);
  let errorText = $state<string | null>(null);
  let busy = $state(false);

  async function refresh() {
    try {
      const r = await loadStatus(provider);
      isSet = r.set;
      source = r.source;
    } catch {
      // 状态查询失败 = 按未设置显示（保存动作仍可试）
      isSet = false;
      source = null;
    }
  }

  async function submit() {
    const v = value.trim();
    if (v === "") return; // 留空 = 不改动
    busy = true;
    try {
      const r = await save(provider, v);
      if (!r.ok) {
        errorText = t("setup.key-save-fail", { error: r.error ?? "" });
      } else {
        value = "";
        errorText = null;
        await refresh();
        onChanged?.();
      }
    } catch {
      errorText = t("setup.key-save-fail", { error: "?" });
    } finally {
      busy = false;
    }
  }

  onMount(() => {
    void refresh();
  });
</script>

<div class="cfg-row api-key-row" data-provider={provider}>
  {#if local}
    <div class="cfg-line">
      <div class="name select-none">{provider} · key</div>
      <span class="dim select-none">{t("setup.key-not-needed")}</span>
    </div>
  {:else}
    <div class="cfg-line">
      <div class="name select-none" title={envName}>{provider} · key</div>
      <input
        class="api-key-input"
        type="password"
        bind:value
        disabled={readOnly || busy}
        placeholder={isSet ? t("setup.key-placeholder-set") : t("setup.key-placeholder-unset")}
      />
      <button
        class="api-key-save"
        type="button"
        disabled={readOnly || busy}
        onclick={() => void submit()}
      >{t("setup.key-save")}</button>
    </div>
    <div class="desc api-key-hint select-none {errorText !== null ? "warn" : isSet ? "ok" : "warn"}">
      {errorText ?? (isSet ? t("setup.key-set-hint", { source: source ?? "" }) : t("setup.key-unset-hint"))}
    </div>
  {/if}
</div>

<style>
  /* provider key 输入行（形态乙）：密码框 + 保存，保存后自动测连通；无清除。
     .desc / .cfg-line 等跨组件共用的类仍留在共享样式表。 */
  .api-key-row .api-key-input {
    width: 170px;
    background: var(--ov-input-bg);
    border: 1px solid var(--ov-input-border);
    border-radius: 5px;
    color: var(--ov-text-strong);
    padding: 3px 6px;
    font: inherit;
  }
  .api-key-row .api-key-input::placeholder { color: color-mix(in srgb, var(--ov-text-strong) 40%, transparent); }
  .api-key-row .api-key-input:disabled { opacity: 0.45; }
  .api-key-row .api-key-save {
    background: var(--ov-input-bg);
    color: var(--ov-text-strong);
    border: 1px solid var(--ov-input-border);
    border-radius: var(--ov-control-radius);
    padding: 3px 10px;
    cursor: pointer;
    font: inherit;
    white-space: nowrap;
  }
  .api-key-row .api-key-save:hover {
    border-color: var(--ov-accent-border);
    color: var(--ov-accent);
  }
  .api-key-row .api-key-save:disabled { opacity: 0.45; cursor: default; }
  .api-key-hint.ok { color: var(--ov-ok); }
  .api-key-hint.warn { color: var(--ov-warn); }
</style>
