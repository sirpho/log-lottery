<script setup lang='ts'>
import { useI18n } from 'vue-i18n'
import GridWaterfall from '@/components/Waterfall/index.vue'
import { AbilitySetting, DataSetting, LayoutSetting, PatternSetting, TextSetting, ThemeSetting } from './parts'
import { useViewModel } from './useViewModel'

const { t } = useI18n()
const {
    resetData,
    topTitleValue,
    languageValue,
    textSizeValue,
    currentFontValue,
    currentTitleFontValue,
    titleFontSyncGlobalValue,
    languageList,
    formErr,
    formData,
    cardSizeValue,
    isShowPrizeListValue,
    isShowAvatarValue,
    resetPersonLayout,
    isRowCountChange,
    themeValue,
    backgroundImageValue,
    cardColorValue,
    luckyCardColorValue,
    textColorValue,
    patternColorValue,
    imageList,
    rowCount,
    cardColor,
    patternColor,
    patternList,
    clearPattern,
    resetPattern,
    exportAllConfigData,
    importAllConfigData,
    definiteTimeValue,
    isWinMusicValue,
} = useViewModel()
</script>

<template>
  <div class="w-4/5 flex flex-col gap-4">
    <h2>{{ t('viewTitle.globalSetting') }}</h2>
    <!-- <div class="flex flex-wrap h-auto w-full gap-6"> -->
    <GridWaterfall>
      <!-- 数据操作 -->
      <DataSetting :reset-data="resetData" :export-all-config-data="exportAllConfigData" :import-all-config-data="importAllConfigData" />
      <!-- 文本设置（主标题、语言、文字大小） -->
      <TextSetting
        v-model:top-title-value="topTitleValue"
        v-model:language-value="languageValue"
        v-model:text-size-value="textSizeValue"
        v-model:current-font-value="currentFontValue"
        v-model:current-title-font-value="currentTitleFontValue"
        v-model:title-font-sync-global-value="titleFontSyncGlobalValue"
        v-model:language-list="languageList"
      />
     
      <!-- 功能设置 -->
      <AbilitySetting v-model:definite-time="definiteTimeValue" v-model:win-music="isWinMusicValue" />
    </GridWaterfall>
    <!-- </div> -->
  </div>
</template>

<style lang='scss' scoped></style>
