<!-- 二级业务组件：设置面板主体 —— 状态横幅 / 分组 / 配置行 / provider key 行 / 主题分享 / 脚部。
     数据与动作都从 menu 状态来（menu-state），宿主动作（隐藏、脚部两键）由窗口组件传入。 -->
<script lang="ts">
  import { t } from "../../i18n";
  import type { MenuState } from "../../shell/kinds/menu-state.svelte";
  import ApiKeyRow from "../config-rows/ApiKeyRow.svelte";
  import ConfigRow from "../config-rows/ConfigRow.svelte";

  let {
    menu,
    onTogglePet,
    onQuit,
  }: { menu: MenuState; onTogglePet: () => void; onQuit: () => void } = $props();

  let importFile = $state("");

  async function exportTheme() {
    menu.setStatus("…", "");
    const r = await menu.exportTheme();
    menu.setStatus(
      r.ok ? t("menu.exported", { path: r.path ?? "" }) : `✗ ${r.error}`,
      r.ok ? "ok" : "err",
    );
  }

  async function importTheme() {
    const file = importFile.trim();
    if (!file) return;
    menu.setStatus("…", "");
    const r = await menu.importTheme(file);
    menu.setStatus(
      r.ok ? t("menu.imported", { name: r.name ?? "" }) : `✗ ${r.error}`,
      r.ok ? "ok" : "err",
    );
  }
</script>

<div id="panel-body">
  {#if menu.offline}
    <div class="err">{t("menu.offline")}</div>
  {/if}
  {#if menu.readOnly}
    <div class="warn">{t("menu.readonly")}</div>
  {/if}
  {#if menu.loadError}
    <div class="err">{t("menu.load-error", { error: menu.loadError })}</div>
  {/if}
  {#if menu.restartRequired.length > 0}
    <div class="warn">{t("menu.restart-banner", { paths: menu.restartRequired.join(", ") })}</div>
  {/if}
  {#if menu.loading}
    <div class="dim select-none">{t("menu.loading")}</div>
  {/if}

  {#each menu.groups as group (group.name)}
    {#if group.name !== "__top"}
      <div class="group">{group.name}</div>
    {/if}
    {#each group.nodes as node (node.path)}
      <ConfigRow {node} readOnly={menu.readOnly} pools={menu.pools} applyValue={menu.apply} />
    {/each}
    {#each menu.apiKeyRows.filter((row) => row.group === group.name) as row (row.provider)}
      <ApiKeyRow
        provider={row.provider}
        envName={row.envName}
        local={row.local}
        readOnly={menu.readOnly}
        loadStatus={menu.apiKeyStatus}
        save={menu.apiKeySave}
      />
    {/each}
  {/each}

  {#if !menu.readOnly && !menu.offline}
    <!-- 主题分享：导出到 config_root/themes/，按文件名导入 -->
    <div class="group">{t("menu.theme-group")}</div>
    <div class="cfg-row">
      <div class="cfg-line">
        <button type="button" onclick={() => void exportTheme()}>{t("menu.theme-export")}</button>
        <input type="text" bind:value={importFile} placeholder={t("menu.theme-file-placeholder")} />
        <button type="button" onclick={() => void importTheme()}>{t("menu.theme-import")}</button>
      </div>
    </div>
  {/if}
</div>

<div id="panel-foot">
  <button type="button" onclick={onTogglePet}>{t("menu.toggle-pet")}</button>
  <button type="button" onclick={onQuit}>{t("menu.quit")}</button>
</div>

<style>
  /* 面板体与底栏：这两块只有本组件渲染 */
  #panel-body { flex: 1; overflow-y: auto; padding: 8px 12px; }
  #panel-foot {
    padding: 8px 12px;
    border-top: 1px solid var(--ov-divider);
    display: flex;
    gap: 8px;
  }
  #panel-foot button {
    flex: 1;
    background: var(--ov-input-bg);
    color: var(--ov-text-strong);
    border: 1px solid var(--ov-input-border);
    border-radius: var(--ov-control-radius);
    padding: 5px 0;
    cursor: pointer;
  }
  #panel-foot button:hover { background: var(--ov-hover-bg); }
  .group {
    margin: 10px 0 4px;
    font-weight: 600;
    color: var(--ov-group);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>
