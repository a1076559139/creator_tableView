cc.Class({
    extends: cc.Component,

    properties: {
        tableView: cc.Node,
    },

    // use this for initialization
    onLoad: function () {
        this.tableView.getComponent('tableView').addPageEvent(this.node, 'pageLabel', 'setPage');
    },
    setPage: function (page, totalNum) {
        this.getComponent(cc.Label).string = page + '/' + totalNum;
    }

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});
