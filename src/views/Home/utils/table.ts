import type { IPersonConfig } from '@/types/storeType'
import confetti from 'canvas-confetti'
import { Object3D, Vector3 } from 'three'
import { filterData } from '@/utils'
/**
 * @description 初始化表格数据
 * @param0 allPersonList 所有人的列表
 * @param1 rowCount 行数，默认是7行
 * @returns 表格数据
 */
export function initTableData({ allPersonList, rowCount }: { allPersonList: IPersonConfig[], rowCount: number }): IPersonConfig[] {
    let tableData: IPersonConfig[] = []
    if (allPersonList.length <= 0) {
        return []
    }
    const totalCount = rowCount * 7
    const allPersonLength = allPersonList.length
    if (allPersonLength < totalCount) {
        tableData = Array.from({ length: totalCount }, () => JSON.parse(JSON.stringify(allPersonList))).flat()
    }
    else {
        tableData = allPersonList.slice(0, totalCount)
    }
    tableData = filterData(tableData.slice(0, totalCount), rowCount)
    return tableData
}

/**
 * @description 横铺图形：处理数据，把每个卡片在界面的位置写入
 * @param0 tableData 表格数据
 * @param1 rowCount 每行有多少个元素
 * @param2 cardSize 卡片的大小
 * @returns  Object3D[]
 */
export function createTableVertices({ tableData, rowCount, cardSize }: { tableData: IPersonConfig[], rowCount: number, cardSize: { width: number, height: number } }): Object3D[] {
    const tableLen = tableData.length
    const objects: Object3D[] = []
    for (let i = 0; i < tableLen; i++) {
        const object = new Object3D()

        object.position.x = tableData[i].x * (cardSize.width + 40) - rowCount * 90
        object.position.y = -tableData[i].y * (cardSize.height + 20) + 1000
        object.position.z = 0
        objects.push(object)
        // targets.table.push(object)
    }
    return objects
}
/**
 * @description 创建球体
 * @param0 objectsLength 物体的个数
 * @returns Object3D[]
 */
export function createSphereVertices({ objectsLength }: { objectsLength: number }): Object3D[] {
    let i = 0
    const resObjects: Object3D[] = []
    // const objLength = objects.value.length
    const vector = new Vector3()

    for (; i < objectsLength; ++i) {
        const phi = Math.acos(-1 + (2 * i) / objectsLength)
        const theta = Math.sqrt(objectsLength * Math.PI) * phi
        const object = new Object3D()

        object.position.x = 800 * Math.cos(theta) * Math.sin(phi)
        object.position.y = 800 * Math.sin(theta) * Math.sin(phi)
        object.position.z = -800 * Math.cos(phi)

        // rotation object
        vector.copy(object.position).multiplyScalar(2)
        object.lookAt(vector)
        resObjects.push(object)
    }
    return resObjects
}

/**
 * @description 创建圆柱体
 * @returns Object3D[]
 */
export function createCylinderVertices(): Object3D[] {
    const resObjects: Object3D[] = []
    const radius = 800
    const length = 800
    const ringCount = 5
    const objectsLength = 124
    const perRing = Math.floor(objectsLength / ringCount)

    for (let i = 0; i < objectsLength; ++i) {
        const ringIndex = Math.floor(i / perRing)
        const indexInRing = i % perRing

        const stepX = length / (ringCount - 1)
        const x = -length / 2 + ringIndex * stepX

        const angle = (indexInRing / perRing) * Math.PI * 2
        const y = Math.cos(angle)
        const z = Math.sin(angle)

        const object = new Object3D()
        object.position.set(x, radius * y, radius * z)

        // 目标点为位置 + 径向法线 * 2（确保朝外）
        const target = new Vector3()
        target.copy(object.position).add(new Vector3(0, y, z).multiplyScalar(2))

        // 默认 lookAt 会尽量保持 Y 轴向上，这可能导致顶部/底部卡片旋转，但圆柱侧面正常
        object.lookAt(target)

        // 如果需要让卡片的上方向沿着圆柱母线（X轴），可以再应用一次旋转
        // 但为了保持简单，这里省略，直接使用默认行为（类似 sphere 的默认行为）

        resObjects.push(object)
    }
    return resObjects
}

export function confettiFire(index: number, maxLimit: number) {
    if (index > maxLimit) {
        return
    }
    const duration = 3 * 1000
    const end = Date.now() + duration;
    (function frame() {
        // launch a few confetti from the left edge
        confetti({
            particleCount: 2,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
        })
        // and launch a few from the right edge
        confetti({
            particleCount: 2,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
        })
        console.log('requestAnimationFrame')
        // keep going until we are out of time
        if (Date.now() < end) {
            requestAnimationFrame(frame)
        }
    }())
    centerFire(0.25, {
        spread: 26,
        startVelocity: 55,
    })
    centerFire(0.2, {
        spread: 60,
    })
    centerFire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
    })
    centerFire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
    })
    centerFire(0.1, {
        spread: 120,
        startVelocity: 45,
    })
}
function centerFire(particleRatio: number, opts: any) {
    const count = 200
    confetti({
        origin: { y: 0.7 },
        ...opts,
        particleCount: Math.floor(count * particleRatio),
    })
}
