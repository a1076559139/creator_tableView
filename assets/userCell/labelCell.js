cc.Class({
    extends: require('viewCell'),

    properties: {
        label: cc.Label,
    },

    // use this for initialization
    onLoad: function () {

    },
    init: function (index, data, group) {
        this._init(data.array[index], data.target, group);
    },
    _init: function (data, target, group) {//当pagevie模式下group参数才有效
        this._target = target;
        if (!data) {
            this.label.string = '空';
            return;
        }

        this.label.string = data.name;
        // this.label.string = group;
    },
    clicked: function () {
        this._target.show(this.label.string);
    }
});
