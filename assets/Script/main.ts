import tableView from "../control/tableView/tableView";

const { ccclass, property } = cc._decorator;

@ccclass
export default class main extends cc.Component {

    @property(tableView)
    tv: tableView = null;

    start() {
        this.tv.init(1000)
    }
}
