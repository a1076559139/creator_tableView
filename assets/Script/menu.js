cc.Class({
    extends: cc.Component,

    properties: {
        tableView: cc.Node,
    },

    // use this for initialization
    onLoad: function () {

    },
    show: function (text) {
        cc.log(text);
    },
    _getdata: function (num) {
        var array = [];
        for (var i = 0; i < num; ++i) {
            var obj = {};
            obj.name = 'a' + i;
            array.push(obj);
        }
        return array;
    },
    initView: function () {
        var data = this._getdata(200);
        this.tableView.getComponent('tableview2').initTableView(data.length, { array: data, target: this });
    },
    nextPage: function () {
        this.tableView.getComponent('tableview2').scrollToNextPage();
        // this.tableView.scrollToOffset({ x: 0, y: -200 }, 1);
        // this.tableView.scrollToOffset({ x: -200, y: 0 }, 1);
    },
    lastPage: function () {
        this.tableView.getComponent('tableview2').scrollToLastPage();
        // this.tableView.scrollToOffset({ x: 0, y: 200 }, 1);
        // this.tableView.scrollToOffset({ x: 200, y: 0 }, 1);
    }
});
