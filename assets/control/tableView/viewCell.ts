const { ccclass, property } = cc._decorator;

import tableView from './tableView'

@ccclass
export default class viewCell extends cc.Component {
    static getSize(index: number, data?: any): number {
        return 0;
    }

    init(index: number, data?: any, tv?: tableView) {
    }

    uninit() {
    }

    reload(data?: any) {
    }
}
