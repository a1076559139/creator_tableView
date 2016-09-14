cc.Class({
    extends: cc.Component,

    properties: {
        // foo: {
        //    default: null,
        //    url: cc.Texture2D,  // optional, default is typeof default
        //    serializable: true, // optional, default is true
        //    visible: true,      // optional, default is true
        //    displayName: 'Foo', // optional
        //    readonly: false,    // optional, default is false
        // },
        // ...
        _isCellInit_: false
    },

    //不可以重写
    _cellAddMethodToNode_: function () {
        this.node.clicked = this.clicked.bind(this);
        var on = this.node.on;

        this.node.on = function () {
            cc.warn(this.name + '：主节点的点击事件，请请重写clicked方法');
            on.apply(this, arguments);
        }
    },
    _cellInit_: function () {
        if (!this._isCellInit_) {
            this._cellAddMethodToNode_();
            this._isCellInit_ = true;
        }
    },

    //可以重写的方法

    //出现时调用
    reuse: function () {

    },

    //消失时调用
    unuse: function () {

    },

    //需要重写的方法

    //cell中的子节点可以使用on事件
    //被点击时相应的方法
    clicked: function () {

    },

    //加载需要初始化数据时调用
    init: function (index, data, group) {

    },



    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});
