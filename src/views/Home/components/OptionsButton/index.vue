<script setup lang='ts'>
import { toRefs } from 'vue'
import { LotteryStatus } from '@/views/Home/type'

interface Props {
    currentStatus: LotteryStatus
    tableData: any[]
    startLottery: () => void
    stopLottery: () => void
    continueLottery: () => void
    quitLottery: () => void
}
const props = defineProps<Props>()

const { currentStatus, startLottery, stopLottery, continueLottery, quitLottery } = toRefs(props)
</script>

<template>
  <div id="menu">
    <div v-if="currentStatus === LotteryStatus.ready" class="start">
      <button class="btn-stars" @click="startLottery">
        <strong>开始抽奖</strong>
        <div id="container-stars">
          <div id="stars" />
        </div>

        <div id="glow">
          <div class="circle" />
          <div class="circle" />
        </div>
      </button>
    </div>

    <button v-if="currentStatus === LotteryStatus.running" class="btn-neon btn glass btn-lg" @click="stopLottery">
      抽取幸运儿@_@
    </button>

    <div v-if="currentStatus === LotteryStatus.end" class="flex justify-center gap-6 enStop">
      <div class="start">
        <button class="btn-stars" @click="continueLottery">
          <strong>继续</strong>
          <div id="container-stars">
            <div id="stars" />
          </div>

          <div id="glow">
            <div class="circle" />
            <div class="circle" />
          </div>
        </button>
      </div>

      <div class="start">
        <button class="btn-stars btn-cancel" @click="quitLottery">
          <strong>取消</strong>
          <div id="container-stars">
            <div id="stars" />
          </div>

          <div id="glow">
            <div class="circle" />
            <div class="circle" />
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use './index.scss';
</style>
