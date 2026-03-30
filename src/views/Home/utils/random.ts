/**
 * 浏览器端加密安全洗牌（无需指定抽取数量）
 * @param array 要洗牌的数组
 * @returns 洗牌后的新数组
 */
function shuffleBrowserCrypto<T>(array: T[]): T[] {
    const newArray = [...array]
    if (newArray.length <= 1)
        return newArray

    // 遍历数组，每轮生成一个随机索引
    for (let i = newArray.length - 1; i > 0; i--) {
        // 步骤1：生成一个 32 位无符号加密随机数（仅需1个）
        const randomBuffer = new Uint32Array(1) // 长度1表示只生成1个随机数
        crypto.getRandomValues(randomBuffer)

        // 步骤2：将随机数映射到 [0, i] 范围（核心：动态适配当前i的范围）
        const randomIndex = randomBuffer[0] % (i + 1);

        // 步骤3：交换元素
        [newArray[i], newArray[randomIndex]] = [newArray[randomIndex], newArray[i]]
    }
    return newArray
}

function getRandom(result: any[], count: number, newArray: any[]) {
    if (newArray.length <= 0) {
        return
    }
    // 抽取 count 个元素，每轮选一个随机索引加入结果，然后从原数组移除
    for (let i = 0; i < count; i++) {
        const randomBuffer = new Uint32Array(1)
        crypto.getRandomValues(randomBuffer)
        const randomIndex = randomBuffer[0] % newArray.length

        // 添加选中的元素到结果数组
        result.push(newArray[randomIndex])
        // 从原数组中移除已选中的元素，避免重复选择
        newArray.splice(randomIndex, 1)
    }
}

/**
 * @description 从源数组中随机获取指定数量的元素
 * @param {Array} sourceArray 源数组
 * @param {number} count 要获取的元素数量
 * @param {Array} designatedPersonList 内定人员
 * @returns {Array} 随机获取的元素
 */

export function getRandomElements(sourceArray: any[], count: number, designatedPersonList?: any[]): any[] {
    if (count <= 0)
        return []
    if (count >= sourceArray.length) {
        return shuffleBrowserCrypto([...sourceArray])
    } // 抽全部=洗牌
    const result: any[] = []

    const designatedPersonIds = designatedPersonList?.map(item => item.id) || []
    const designatedSourceArray = sourceArray.filter(item => designatedPersonIds.includes(item.id))
    // 去掉已经在必中名单中的
    sourceArray = sourceArray.filter(item => !designatedPersonIds.includes(item.id))

    const designatedCount = Math.min(count, designatedPersonIds.length)
    // 先抽必中的
    getRandom(result, designatedCount, [...(designatedSourceArray || [])])
    // 剩下的
    const leftCount = count - designatedCount
    getRandom(result, leftCount, [...sourceArray])

    return result
}
