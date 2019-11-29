import viewCell from "../control/tableView/viewCell";

const { ccclass, property } = cc._decorator;

@ccclass
export default class item extends viewCell {
    /**
     * [en] try it
     * [zh] 尝试这里
     */
    // static getSize(){
    //     return 120
    // }

    /**
     * [en] try it
     * [zh] 尝试这里
     */
    // static getSize(index) {
    //     if(index > 100) index = 100;
    //     return 100 + index;
    // }

    @property(cc.Label)
    l1: cc.Label = null;

    @property(cc.Label)
    l2: cc.Label = null;

    @property(cc.Label)
    l3: cc.Label = null;

    init(index: number) {
        this.l1.string = `${index} - 1`;
        this.l2.string = `${index} - 2`;
        this.l3.string = `${index} - 3`;
    }
}
