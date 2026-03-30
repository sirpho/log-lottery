import type { IPersonConfig } from '@/types/storeType'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toast-notification'
import * as XLSX from 'xlsx'
import useStore from '@/store'
import { tableColumns } from './columns'

export function useViewModel() {
    const personConfig = useStore().personConfig
    const toast = useToast()
    const { t } = useI18n()

    const { getAlreadyPersonList: alreadyPersonList, getAlreadyPersonDetail: alreadyPersonDetail } = storeToRefs(personConfig)

    const isDetail = ref(false)
    function handleMoveNotPerson(row: IPersonConfig) {
        personConfig.moveAlreadyToNot(row)
    }

    // 导出数据
    function exportData() {
        const data = alreadyPersonDetail.value.map(item => ({
            编号: item.uid,
            姓名: item.name,
            奖项: item.prizeName?.join(','),
            中奖时间: item.prizeTime?.join(','),
            身份: item.identity,
            部门: item.department,
        }))

        if (data.length > 0) {
            const dataBinary = XLSX.utils.json_to_sheet(data)
            const dataBinaryBinary = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(dataBinaryBinary, dataBinary, 'Sheet1')
            XLSX.writeFile(dataBinaryBinary, 'data.xlsx')
            toast.open({
                message: t('error.exportSuccess'),
                type: 'success',
                position: 'top-right',
            })
        }
    }

    const tableColumnsList = tableColumns({ showPrizeTime: false, handleDeletePerson: handleMoveNotPerson })
    const tableColumnsDetail = tableColumns({ showPrizeTime: true, handleDeletePerson: handleMoveNotPerson })
    return {
        alreadyPersonList,
        alreadyPersonDetail,
        isDetail,
        tableColumnsList,
        tableColumnsDetail,
        exportData,
    }
}
