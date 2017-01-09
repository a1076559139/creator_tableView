cc.Class({
    extends: require('viewCell'),

    properties: {
        index: cc.Label,
        group: cc.Label,
    },

    // use this for initialization
    onLoad: function () {

    },
    init: function (index, data, group) {
        if (index >= data.array.length) {
            this.index.string = '越界';
            this.group.string = group;
            return;
        }
        this._target = data.target;
        this._data = data.array[index];
        this.index.string = index;
        this.group.string = group;
    },
    clicked: function () {
        this._target.show('下标:'+this.index.string+',组:'+this.group.string);
    }
});
