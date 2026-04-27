import type { Material, Object3D } from 'three'
import type { IPersonConfig } from '@/types/storeType'
import * as TWEEN from '@tweenjs/tween.js'
import { cloneDeep, shuffle } from 'lodash-es'
import { storeToRefs } from 'pinia'
import { AmbientLight, CanvasTexture, DoubleSide, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, Scene, TextureLoader, WebGLRenderer } from 'three'
import { nextTick, onMounted, onUnmounted, ref, unref } from 'vue'
import { useToast } from 'vue-toast-notification'
import dongSound from '@/assets/audio/end.mp3'
import enterAudio from '@/assets/audio/enter.wav'
import worldCupAudio from '@/assets/audio/worldcup.mp3'
import { CONFETTI_FIRE_MAX_COUNT, SINGLE_TIME_MAX_PERSON_COUNT } from '@/constant/config'
import i18n from '@/locales/i18n'
import useStore from '@/store'
import { delayAsync } from '@/utils'
import { LotteryStatus } from './type'
import { confettiFire, getRandomElements } from './utils'

const maxAudioLimit = 10
export function useViewModel() {
    const toast = useToast()
    // store里面存储的值
    const { personConfig, globalConfig, prizeConfig } = useStore()
    const {
        getAllPersonList: allPersonList,
        getNotPersonList: notPersonList,
        getNotThisPrizePersonList: notThisPrizePersonList,
    } = storeToRefs(personConfig)
    const { getCurrentPrize: currentPrize } = storeToRefs(prizeConfig)
    const {
        getTitleFont: titleFont,
        getTitleFontSyncGlobal: titleFontSyncGlobal,
        getDefiniteTime: definiteTime,
        getWinMusic: isPlayWinMusic,
    } = storeToRefs(globalConfig)
    // three初始值
    const containerRef = ref<HTMLElement>()
    // 是否可以操作
    const canOperate = ref(true)
    let scene: any = null
    let camera: any = null
    let renderer: any = null
    let objects: any = []
    // 页面数据初始值
    const currentStatus = ref<LotteryStatus>(LotteryStatus.init) // 0为初始状态， 1为抽奖准备状态，2为抽奖中状态，3为抽奖结束状态
    const tableData = ref<any[]>([])
    const luckyTargets = ref<any[]>([])
    const luckyCount = ref(10)
    const personPool = ref<IPersonConfig[]>([])
    const intervalTimer = ref<any>(null)
    const isInitialDone = ref<boolean>(false)
    const animationFrameId = ref<any>(null)
    const playingAudios = ref<HTMLAudioElement[]>([])

    // 抽奖音乐相关
    const lotteryMusic = ref<HTMLAudioElement | null>(null)

    const CARD_W = 22.50 // 对应540px宽
    const CARD_H = 7.5 // 对应180px高
    const GAP = 0.5 // 卡片之间的垂直间距

    // 相机视野范围 (世界坐标系 Y 轴范围)
    // 相机在 z=14, fov=75°, 视野高度 ≈ 2 * 14 * tan(37.5°) ≈ 21.5
    // 屏幕可视范围: 顶部约 +10.5 ~ 底部 -10.5，为了留出边缘感，定义掉落边界：
    const TOP_VISIBLE = 9.8 // 屏幕顶部边界 (稍内收)

    // 循环复用边界: 卡片位置低于 BOTTOM_LIMIT 时立即移到队列顶部
    const BOTTOM_LIMIT = -17.0 // 略低于可视底部，保证平滑
    // 初始队列整体位于屏幕外顶部: 让最低的卡片刚好在 TOP_VISIBLE 上方 + 偏移
    // 这样初始时没有任何卡片出现在屏幕内，随着下移自然落入视野。
    let DROP_SPEED = 12 // 单位: 世界单位/秒 (匀速掉落)
    const cardList = ref<any[]>([])
    const cardBgTexture = ref<any>()

    const visible = ref(false)
    const title = ref('')

    function initThreeJs() {
        scene = new Scene()
        scene.background = null // 或者不设置
        // 纹理加载
        const textureLoader = new TextureLoader()
        cardBgTexture.value = textureLoader.load('https://fe-static.obs.cn-hz1.ctyun.cn/sirpho/border.png')

        // 透视相机: 视野75，宽高比动态，近平面0.1，远平面2000
        camera = new PerspectiveCamera(75, 1200 / 550, 0.1, 2000)
        camera.position.z = 14
        camera.position.y = 0

        renderer = new WebGLRenderer({ antialias: true, alpha: true })
        renderer.setClearColor(0x000000, 0)
        renderer.setSize(1200, 550)
        renderer.setPixelRatio(window.devicePixelRatio)
        containerRef.value!.appendChild(renderer.domElement)

        // 环境光让纹理正常显示
        const ambientLight = new AmbientLight(0xFFFFFF, 1)
        scene.add(ambientLight)
        initCardQueue()
        animateMovement()
        currentStatus.value = LotteryStatus.ready
    }

    // ---------- 创建带数字的卡片 (白底黑字 + 背景图边框) ----------
    function createCardWithText(text: string) {
        const geometry = new PlaneGeometry(CARD_W, CARD_H)
        const aspectRatio = CARD_W / CARD_H
        const canvasWidth = 800 // 基准宽度
        const canvasHeight = canvasWidth / aspectRatio // 自动计算高度

        // 创建组合材质：白色背景 + 背景图边框
        const canvas = document.createElement('canvas')
        canvas.width = canvasWidth
        canvas.height = canvasHeight
        const ctx = canvas.getContext('2d')

        // 1. 填充白色背景
        ctx!.fillStyle = '#FFFFFF'
        ctx!.fillRect(0, 0, canvas.width, canvas.height)

        // 绘制黑色数字
        ctx!.fillStyle = '#000000'
        ctx!.font = `bold 32px 'Segoe UI', 'PingFang SC', system-ui`
        ctx!.textAlign = 'center'
        ctx!.textBaseline = 'middle'
        ctx!.fillText(text, canvas.width / 2, canvas.height / 2)

        // 可选：添加细微的阴影让数字更立体（但不影响可读性）
        ctx!.shadowBlur = 0

        const numTexture = new CanvasTexture(canvas)
        numTexture.needsUpdate = true

        // 创建组: 背景图（边框纹理） + 白色底+黑色数字
        const group = new Group()

        // 背景图材质 (border.png 带透明边框和装饰)
        const bgMaterial = new MeshBasicMaterial({
            map: cardBgTexture.value,
            transparent: true,
            side: DoubleSide,
        })
        const bgPlane = new Mesh(geometry, bgMaterial)
        group.add(bgPlane)

        // 数字材质 (白色底 + 黑色数字)
        const numMaterial = new MeshBasicMaterial({
            map: numTexture,
            transparent: false, // 不透明，因为白色背景已覆盖
            side: DoubleSide,
            depthWrite: false,
        })
        const numPlane = new Mesh(geometry, numMaterial)
        numPlane.position.z = 0.02 // 稍微抬高，显示在背景图上方
        group.add(numPlane)

        return group
    }
    const isPaused = ref(false)
    // 是否已展示中中奖人员
    const isShowLuckyTargets = ref(false)
    // 动画 & 帧循环移动
    let lastTimestamp = performance.now()
    // ---------- 初始化卡片队列 (全部位于屏幕外顶部，呈连续长链) ----------
    function initCardQueue() {
        // 计算队列总长度 (从最高卡片到最低卡片的总垂直跨度)
        const unitHeight = CARD_H + GAP // 7.75
        const totalSpan = unitHeight * (tableData.value.length - 1) // 199 * 7.75 ≈ 1542.25

        // 需求: 整个队列初始时“整体在屏幕外的顶部”，即最低的卡片也高于屏幕可视区顶部
        // 设定最低卡片 (索引最大) 的 Y 坐标 = TOP_VISIBLE + 1.5 (完全位于屏幕上方不可见)
        const lowestCardY = TOP_VISIBLE + 2.2 // ≈ 12.0  > 9.8 屏幕外顶部

        // 最高卡片 (索引0) 的 Y 坐标 = lowestCardY + totalSpan
        const highestCardY = lowestCardY + totalSpan // ≈ 12 + 1542 = 1554
        // 清空现有数组
        cardList.value = []
        objects = []

        const arrayResult = shuffle(tableData.value)

        // 按照从高到低的顺序创建物体 (Y递减)
        for (let i = 0; i < arrayResult.length; i++) {
            const item = arrayResult[i]
            const card = createCardWithText(`${item.uid} ${item.name}`)
            // 计算当前卡片的Y: highestCardY - i * unitHeight
            const posY = highestCardY - i * unitHeight
            card.position.y = posY
            card.position.x = 0
            card.position.z = 0
            card.name = `${item.uid} ${item.name}`
            scene.add(card)
            cardList.value.push(card)

            // 同时填充 objects 数组，保持与 cardList 相同的索引
            objects.push({
                element: card,
                position: card.position,
                rotation: card.rotation,
                person: item,
                index: i,
            })
        }
    }
    // 每帧统一向下移动所有卡片，检测最低卡片是否低于底部界线，
    // 若是则将其移动到队列最顶部，并保持连续无缝。
    function updateRecycle() {
        if (isPaused.value) {
            if (isShowLuckyTargets.value) {
                return
            }
            else {
                isShowLuckyTargets.value = true

                // 获取所有中奖人员的 uid（或其他唯一标识）
                const luckyKeyList = luckyTargets.value.map(target => `${target.uid} ${target.name}`)
                // 找出所有中奖卡片在 cardList 中的索引
                const luckyCardIndices: number[] = []
                cardList.value.forEach((card, index) => {
                    if (luckyKeyList.includes(card.name)) {
                        luckyCardIndices.push(index)
                    }
                })

                // 将中奖卡片按索引从大到小排序（从后往前处理，避免索引错乱）
                luckyCardIndices.sort((a, b) => b - a)

                // 获取需要交换的目标位置（队列末尾）
                const totalCards = cardList.value.length
                // 从倒数第二个位置开始（倒数第一是最底部即将移除的卡片）
                const targetPositionIndex = totalCards - 2

                // 依次将中奖卡片交换到目标位置
                for (let i = 0; i < luckyCardIndices.length; i++) {
                    const luckyIndex = luckyCardIndices[i]
                    const targetIndex = targetPositionIndex - i

                    // 确保目标位置有效且不与原位置相同
                    if (targetIndex >= 0 && targetIndex !== luckyIndex) {
                        // 保存要交换的卡片和它的Y坐标
                        const tempCard = cardList.value[luckyIndex]
                        const tempY = tempCard.position.y

                        // 交换对象引用
                        cardList.value[luckyIndex] = cardList.value[targetIndex]
                        cardList.value[targetIndex] = tempCard

                        // 交换Y坐标（现在操作的是交换后的正确对象）
                        const swapY = cardList.value[luckyIndex].position.y
                        cardList.value[luckyIndex].position.y = tempY
                        cardList.value[targetIndex].position.y = swapY

                        // 同时交换 objects 数组中的位置
                        if (objects && objects[luckyIndex] && objects[targetIndex]) {
                            const tempObject = objects[luckyIndex]
                            objects[luckyIndex] = objects[targetIndex]
                            objects[targetIndex] = tempObject
                        }
                    }
                }
                render()
                return
            }
        }

        // 采用 while 处理一帧内可能多个卡片超出底部的情况
        while (cardList.value.length > 0) {
            const lowestCard = cardList.value[cardList.value.length - 1]
            // 如果最低卡片的位置低于底部界限，则需要复用到顶部
            if (lowestCard.position.y < BOTTOM_LIMIT) {
                // 1. 从数组中移除最低卡片 (末尾)
                const recycledCard = cardList.value.pop()

                // 2. 获取当前队列最顶部卡片 (索引0)
                const topCard = cardList.value[0]
                // 新位置应该在最顶部卡片的正上方 (y + 卡片高度 + 间距)
                const newTopY = topCard.position.y + (CARD_H + GAP)
                recycledCard.position.y = newTopY

                // 3. 重新插入到数组头部，维持从高到低的顺序
                cardList.value.unshift(recycledCard)
            }
            else {
                break
            }
        }
    }
    function animateMovement() {
        const now = performance.now()
        const delta = Math.min(0.033, (now - lastTimestamp) / 1000) // 限制最大delta 33ms
        lastTimestamp = now

        if (!isPaused.value && delta > 0) {
            const moveDistance = DROP_SPEED * delta // 下移距离 (正值向下)
            // 所有卡片统一向下移动
            for (let i = 0; i < cardList.value.length; i++) {
                cardList.value[i].position.y -= moveDistance
            }
            // 复用处理 (将超出底部的卡片移到顶部)
            updateRecycle()
        }

        render()
        requestAnimationFrame(animateMovement)
    }

    function render() {
        if (renderer) {
            renderer.render(scene, camera)
        }
    }
    /**
     * @description: 窗口大小改变时重新设置渲染器的大小
     */
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()

        renderer.setSize(window.innerWidth, window.innerHeight)
        render()
    }

    /**
     * @description: 开始抽奖音乐
     */
    function startLotteryMusic() {
        if (!isPlayWinMusic.value) {
            return
        }
        if (lotteryMusic.value) {
            lotteryMusic.value.pause()
            lotteryMusic.value = null
        }

        lotteryMusic.value = new Audio(worldCupAudio)
        lotteryMusic.value.loop = true
        lotteryMusic.value.volume = 0.7

        lotteryMusic.value.play().catch((error) => {
            console.error('播放抽奖音乐失败:', error)
        })
    }

    /**
     * @description: 停止抽奖音乐
     */
    function stopLotteryMusic() {
        if (!isPlayWinMusic.value) {
            return
        }
        if (lotteryMusic.value) {
            lotteryMusic.value.pause()
            lotteryMusic.value = null
        }
    }

    /**
     * @description: 播放结束音效
     */
    function playEndSound() {
        if (!isPlayWinMusic.value) {
            return
        }
        console.log('准备播放结束音效', dongSound)

        // 清理已结束的音频
        playingAudios.value = playingAudios.value.filter(audio => !audio.ended)

        try {
            const endSound = new Audio(dongSound)
            endSound.volume = 1.0

            // 简化播放逻辑
            const playPromise = endSound.play()

            if (playPromise) {
                playPromise
                    .then(() => {
                        console.log('结束音效播放成功')
                        playingAudios.value.push(endSound)
                    })
                    .catch((err) => {
                        console.error('播放失败:', err.name, err.message)
                        if (err.name === 'NotAllowedError') {
                            console.warn('自动播放被阻止，需用户交互后播放')
                        }
                    })
            }

            endSound.onended = () => {
                console.log('结束音效播放完成')
                const index = playingAudios.value.indexOf(endSound)
                if (index > -1)
                    playingAudios.value.splice(index, 1)
            }
        }
        catch (error) {
            console.error('创建音频对象失败:', error)
        }
    }

    /**
     * @description: 重置音频状态
     */
    function resetAudioState() {
        if (!isPlayWinMusic.value) {
            return
        }
        // 停止抽奖音乐
        stopLotteryMusic()

        // 清理所有正在播放的音频
        playingAudios.value.forEach((audio) => {
            if (!audio.ended && !audio.paused) {
                audio.pause()
            }
        })
        playingAudios.value = []
    }

    /**
     * @description: 抽奖准备
     */
    function enterLottery() {
        if (!canOperate.value) {
            return
        }
        // 重置音频状态
        resetAudioState()
        // 预加载音频资源以解决浏览器自动播放策略
        try {
            const audioContext = window.AudioContext || (window as any).webkitAudioContext
            if (audioContext) {
                console.log('音频上下文可用')
            }
        }
        catch (e) {
            console.warn('音频上下文不可用:', e)
        }
        canOperate.value = true
        isPaused.value = false
        isShowLuckyTargets.value = false
        currentStatus.value = LotteryStatus.ready
    }

    /**
     * @description 开始抽奖
     */
    function startLottery() {
        if (!canOperate.value) {
            return
        }
        // 验证是否已抽完全部奖项
        if (currentPrize.value.isUsed || !currentPrize.value) {
            toast.open({
                message: i18n.global.t('error.personIsAllDone'),
                type: 'warning',
                position: 'top-right',
                duration: 10000,
            })

            return
        }
        DROP_SPEED = 180
        // personPool.value = currentPrize.value.isAll ? notThisPrizePersonList.value : notPersonList.value
        personPool.value = currentPrize.value.isAll ? [...notThisPrizePersonList.value] : [...notPersonList.value]
        // 已中该奖人员
        const luckyPersonList = unref(allPersonList).filter(item => item.prizeId.includes(currentPrize.value.id))
        const luckyPersonListIds = luckyPersonList.map(item => item.id)
        // 内定人员
        const designatedList = currentPrize.value.designatedList || []
        // 还没中这个奖的内定人员
        const designatedPersonList = designatedList.filter(item => !luckyPersonListIds.includes(item.id))
        // 验证抽奖人数是否还够
        if (personPool.value.length < currentPrize.value.count - currentPrize.value.isUsedCount) {
            toast.open({
                message: i18n.global.t('error.personNotEnough'),
                type: 'warning',
                position: 'top-right',
                duration: 10000,
            })

            return
        }
        // 默认置为单次抽奖最大个数
        luckyCount.value = SINGLE_TIME_MAX_PERSON_COUNT
        // 还剩多少人未抽
        let leftover = currentPrize.value.count - currentPrize.value.isUsedCount
        const customCount = currentPrize.value.separateCount
        if (customCount && customCount.enable && customCount.countList.length > 0) {
            for (let i = 0; i < customCount.countList.length; i++) {
                if (customCount.countList[i].isUsedCount < customCount.countList[i].count) {
                    // 根据自定义人数来抽取
                    leftover = customCount.countList[i].count - customCount.countList[i].isUsedCount
                    break
                }
            }
        }
        luckyCount.value = leftover < luckyCount.value ? leftover : luckyCount.value
        // 重构抽奖函数
        luckyTargets.value = getRandomElements(personPool.value, luckyCount.value, designatedPersonList)
        luckyTargets.value.forEach((item) => {
            const index = personPool.value.findIndex(person => person.id === item.id)
            if (index > -1) {
                personPool.value.splice(index, 1)
            }
        })

        toast.open({
            // message: `现在抽取${currentPrize.value.name} ${leftover}人`,
            message: i18n.global.t('error.startDraw', { count: currentPrize.value.name, leftover }),
            type: 'default',
            position: 'top-right',
            duration: 8000,
        })

        // 开始播放抽奖音乐
        startLotteryMusic()

        currentStatus.value = LotteryStatus.running
        if (definiteTime.value) {
            setTimeout(() => {
                if (currentStatus.value === LotteryStatus.running) {
                    stopLottery()
                }
            }, definiteTime.value * 1000)
        }
    }

    const showCount = ref(false)
    const countText = ref('')
    /**
     * @description: 停止抽奖，抽出幸运人
     */
    async function stopLottery() {
        if (!canOperate.value) {
            return
        }
        countText.value = '叁'
        showCount.value = true

        await delayAsync(1)
        countText.value = '贰'

        await delayAsync(1)
        countText.value = '壹'

        await delayAsync(1)
        showCount.value = false
        await doStopLottery()
    }

    async function doStopLottery() {
        // 停止抽奖音乐
        stopLotteryMusic()

        // 播放结束音效
        playEndSound()

        isShowLuckyTargets.value = false
        isPaused.value = true

        DROP_SPEED = 12
        playWinMusic()
        confettiFire(3, CONFETTI_FIRE_MAX_COUNT)

        updateRecycle()

        await delayAsync(0.5)
        title.value = currentPrize.value.name

        canOperate.value = true
        visible.value = true
    }

    // 播放音频，中将卡片越多audio对象越多，声音越大
    function playWinMusic() {
        if (!isPlayWinMusic.value) {
            return
        }
        // 清理已结束的音频
        playingAudios.value = playingAudios.value.filter(audio => !audio.ended && !audio.paused)

        if (playingAudios.value.length > maxAudioLimit) {
            console.log('音频播放数量已达到上限，请勿重复播放')
            return
        }

        const enterNewAudio = new Audio(enterAudio)
        enterNewAudio.volume = 0.8

        playingAudios.value.push(enterNewAudio)
        enterNewAudio.play()
            .then(() => {
                // 当音频播放结束后，从数组中移除
                enterNewAudio.onended = () => {
                    const index = playingAudios.value.indexOf(enterNewAudio)
                    if (index > -1) {
                        playingAudios.value.splice(index, 1)
                    }
                }
            })
            .catch((error) => {
                console.error('播放音频失败:', error)
                // 如果播放失败，也从数组中移除
                const index = playingAudios.value.indexOf(enterNewAudio)
                if (index > -1) {
                    playingAudios.value.splice(index, 1)
                }
            })

        // 播放错误时从数组中移除
        enterNewAudio.onerror = () => {
            const index = playingAudios.value.indexOf(enterNewAudio)
            if (index > -1) {
                playingAudios.value.splice(index, 1)
            }
        }
    }
    /**
     * @description: 继续,意味着这抽奖作数，计入数据库
     */
    async function continueLottery() {
        if (!canOperate.value) {
            return
        }
        const customCount = currentPrize.value.separateCount
        if (customCount && customCount.enable && customCount.countList.length > 0) {
            for (let i = 0; i < customCount.countList.length; i++) {
                if (customCount.countList[i].isUsedCount < customCount.countList[i].count) {
                    customCount.countList[i].isUsedCount += luckyCount.value
                    break
                }
            }
        }
        currentPrize.value.isUsedCount += luckyCount.value
        luckyCount.value = 0
        if (currentPrize.value.isUsedCount >= currentPrize.value.count) {
            currentPrize.value.isUsed = true
            currentPrize.value.isUsedCount = currentPrize.value.count
        }
        personConfig.addAlreadyPersonList(luckyTargets.value, currentPrize.value)
        prizeConfig.updatePrizeConfig(currentPrize.value)
        await enterLottery()
    }
    /**
     * @description: 放弃本次抽奖，回到初始状态
     */
    function quitLottery() {
        // 停止抽奖音乐
        stopLotteryMusic()

        enterLottery()
        currentStatus.value = LotteryStatus.init
    }

    /**
     * @description: 清理资源，避免内存溢出
     */
    function cleanup() {
        // 停止所有Tween动画
        TWEEN.removeAll()

        // 清理动画循环
        if ((window as any).cancelAnimationFrame) {
            (window as any).cancelAnimationFrame(animationFrameId.value)
        }
        clearInterval(intervalTimer.value)
        intervalTimer.value = null

        // 停止抽奖音乐
        stopLotteryMusic()

        // 清理所有音频资源
        playingAudios.value.forEach((audio) => {
            if (!audio.ended && !audio.paused) {
                audio.pause()
            }
            // 释放音频资源
            audio.src = ''
            audio.load()
        })
        playingAudios.value = []

        if (scene) {
            scene.traverse((object: Object3D) => {
                if ((object as any).material) {
                    if (Array.isArray((object as any).material)) {
                        (object as any).material.forEach((material: Material) => {
                            material.dispose()
                        })
                    }
                    else {
                        (object as any).material.dispose()
                    }
                }
                if ((object as any).geometry) {
                    (object as any).geometry.dispose()
                }
                if ((object as any).texture) {
                    (object as any).texture.dispose()
                }
            })
            scene.clear()
        }

        if (objects) {
            objects.forEach((item: any) => {
                if (item.element) {
                    item.element.remove()
                }
            })
            objects = []
        }

        //   移除所有事件监听
        window.removeEventListener('resize', onWindowResize)
        scene = null
        camera = null
        renderer = null
    }
    /**
     * @description: 设置默认人员列表
     */
    function setDefaultPersonList() {
        personConfig.setDefaultPersonList()
        // 刷新页面
        window.location.reload()
    }

    /**
     * 初始化人员信息，初始化threejs
     */
    const init = () => {
        const startTime = Date.now()
        const maxWaitTime = 2000 // 2秒

        const checkAndInit = () => {
            // 如果人员列表有数据或者等待时间超过2秒，则执行初始化
            if (allPersonList.value.length > 0 || (Date.now() - startTime) >= maxWaitTime) {
                console.log('初始化完成')
                tableData.value = cloneDeep(allPersonList.value)
                initThreeJs()
                enterLottery()
                // animation()
                // containerRef.value!.style.color = `${textColor}`
                // randomBallData()
                isInitialDone.value = true
            }
            else {
                console.log('等待人员列表数据...')
                // 继续等待
                setTimeout(checkAndInit, 100) // 每100毫秒检查一次
            }
        }

        checkAndInit()
    }
    onMounted(() => {
        init()
    })
    onUnmounted(() => {
        nextTick(() => {
            cleanup()
        })
        clearInterval(intervalTimer.value)
        intervalTimer.value = null
    })

    const handleClose = () => {
        visible.value = false
        continueLottery()
    }

    return {
        setDefaultPersonList,
        startLottery,
        continueLottery,
        quitLottery,
        containerRef,
        stopLottery,
        tableData,
        currentStatus,
        isInitialDone,
        titleFont,
        titleFontSyncGlobal,
        showCount,
        countText,
        visible,
        title,
        luckyTargets,
        handleClose,
    }
}
