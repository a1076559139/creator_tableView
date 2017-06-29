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
        var data = this._getdata(100);
        this.tableView.getComponent('tableView').initTableView(data.length, { array: data, target: this });
    },
    //下一页(pageview下有效)
    nextPage: function () {
        this.tableView.getComponent('tableView').scrollToNextPage();
    },
    //上一页(pageview下有效)
    lastPage: function () {
        this.tableView.getComponent('tableView').scrollToLastPage();
    },
});
