<script setup lang="ts">
import { Dialog, DialogDescription, DialogPanel, DialogTitle } from '@headlessui/vue'
import { storeToRefs } from 'pinia'
import useStore from '@/store'
import HeaderTitle from './components/HeaderTitle/index.vue'
import OptionButton from './components/OptionsButton/index.vue'
import PrizeList from './components/PrizeList/index.vue'
import { useViewModel } from './useViewModel'
import 'vue-toast-notification/dist/theme-sugar.css'

const baseUrl = import.meta.env.BASE_URL.replace('./', '/')

const viewModel = useViewModel()
const { setDefaultPersonList, visible, title, luckyTargets, handleClose, tableData, currentStatus, showCount, countText, stopLottery, containerRef, startLottery, continueLottery, quitLottery, isInitialDone, titleFont, titleFontSyncGlobal } = viewModel
const globalConfig = useStore().globalConfig

const { getTopTitle: topTitle, getTextColor: textColor, getTextSize: textSize } = storeToRefs(globalConfig)
</script>

<template>
  <HeaderTitle
    :table-data="tableData"
    :text-size="textSize"
    :text-color="textColor"
    :top-title="topTitle"
    :set-default-person-list="setDefaultPersonList"
    :is-initial-done="isInitialDone"
    :title-font="titleFont"
    :title-font-sync-global="titleFontSyncGlobal"
  />
  <div class="three-wrapper">
    <!-- 倒计时 -->
    <div v-if="showCount" class="count">
      <div class="count-font">
        {{ countText }}
      </div>
    </div>
    <img :src="`${baseUrl}wrap-border-1.png`" class="wrap-border wrap-border-1" alt="">
    <img :src="`${baseUrl}wrap-border-2.png`" class="wrap-border wrap-border-2" alt="">
    <img :src="`${baseUrl}wrap-border-3.png`" class="wrap-border wrap-border-3" alt="">
    <img :src="`${baseUrl}wrap-border-4.png`" class="wrap-border wrap-border-4" alt="">
    <div id="container" ref="containerRef" class="3dContainer" />
  </div>
  <OptionButton
    :current-status="currentStatus"
    :table-data="tableData"
    :start-lottery="startLottery"
    :stop-lottery="stopLottery"
    :continue-lottery="continueLottery"
    :quit-lottery="quitLottery"
  />
  <img :src="`${baseUrl}background0120.jpg`" class="w-full h-full" alt="">
  <PrizeList class="absolute left-0 top-32" />

  <Dialog :open="visible" class="relative z-50" @close="handleClose">
    <!-- The backdrop, rendered as a fixed sibling to the panel container -->
    <div class="fixed inset-0 bg-black/30" aria-hidden="true" />
    <!-- Full-screen container to center the panel -->
    <div class="fixed inset-0 flex w-screen items-center justify-center p-4">
      <DialogPanel class="rounded w-6/10 p-6 shadow-md" style="background: #B70500">
        <DialogTitle class="font-bold text-lg">
          <p class="w-full flex items-center justify-center gap-2">
            <span>
              {{ title || '中奖人员' }}
            </span>
          </p>
        </DialogTitle>
        <div style="background: #FFFCF5; border-radius: 8px;color: #333333; margin-top: 12px">
          <DialogDescription v-for="item in luckyTargets" :key="item.uid" class="py-4 flex items-center justify-center">
            {{ item.uid }} {{ item.name }}
          </DialogDescription>
        </div>
        <div class="mr-4 mt-4 flex justify-center">
          <button class="btn" style="background: #ffd7d7; color: #b70500;border-color: #b70500; width: 220px" @click="handleClose">
            确定
          </button>
        </div>
      </DialogPanel>
    </div>
  </Dialog>
</template>

<style lang="scss" scoped>
.three-wrapper {
  position: fixed;
  width: 1200px;
  top: 200px;
  transform: translate(-50%, 0);
  left: 50%;
  height: 550px;
}

.wrap-border {
  position: absolute;
  width: 215px;
  height: 215px;
}

.wrap-border-1 {
  left: 0;
  top: 0;
}

.wrap-border-2 {
  right: 0;
  top: 0;
}

.wrap-border-3 {
  left: 0;
  bottom: 0;
}

.wrap-border-4 {
  right: 0;
  bottom: 0;
}

.count {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  background: rgba(0, 0, 0, 0.3);
  color: #e3341e;
  font-weight: 800;
  font-size: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9;
}
.count-font {
  width: 220px;
  height: 220px;
  border-radius: 50%;
  border: 6px solid #e3341e;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
