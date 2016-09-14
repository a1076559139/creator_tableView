var ScrollModel = cc.Enum({ Horizontal: 0, Vertical: 1 });
var ScrollDirection = cc.Enum({ None: 0, Up: 1, Down: 2, Left: 3, Rigth: 4 });
var Direction = cc.Enum({ LEFT_TO_RIGHT__TOP_TO_BOTTOM: 0, TOP_TO_BOTTOM__LEFT_TO_RIGHT: 1 });
var ViewType = cc.Enum({ Scroll: 0, Single: 1, Flip: 2 });
var Type = cc.Enum({ None: 0, Grid: 1 });

var _searchMaskParent = function (node) {
    if (cc.Mask) {
        var index = 0;
        var mask = null;
        for (var curr = node; curr && curr instanceof cc.Node; curr = curr.parent, ++index) {
            mask = curr.getComponent(cc.Mask);
            if (mask) {
                return {
                    index: index,
                    node: curr
                };
            }
        }
    }

    return null;
};

cc.Class({
    extends: cc.ScrollView,
    editor: CC_EDITOR && {
        inspector: 'packages://tableview2/inspector.js',
    },
    properties: {
        _data: null,
        _minCellIndex: 0,//cell的最小下标
        _maxCellIndex: 0,//cell的最大下标

        _count: 0,//一共有多少节点
        _cellCount: 0,//scroll下有多少节点
        _showCellCount: 0,//scroll一个屏幕能显示多少节点
        //GRID模式下，对cell进行分组管理
        _groupCellCount: null,//每组有几个节点

        _scrollDirection: ScrollDirection.None,

        _cellPool: null,
        _view: null,

        _page: 0,//当前处于那一页
        _pageTotal: 0,//总共有多少页

        _touchLayer: cc.Node,

        _initSuccess: false,//是否初始化成功

        cell: {
            default: null,
            type: cc.Prefab,
            notify: function (oldValue) {
                this._clearCache();
            }
        },

        ScrollModel: {
            default: 0,
            type: ScrollModel,
            notify: function (oldValue) {
                if (this.ScrollModel == ScrollModel.Horizontal) {
                    this.horizontal = true;
                    this.vertical = false;
                    this.verticalScrollBar = null;
                } else {
                    this.vertical = true;
                    this.horizontal = false;
                    this.horizontalScrollBar = null;
                }
            },
            tooltip: '横向纵向滑动',
        },
        ViewType: {
            default: 0,
            type: ViewType,
            notify: function (oldValue) {
                if (this.ViewType == ViewType.Flip) {
                    this.inertia = false;
                } else {
                    this.inertia = true;
                }
            },
            tooltip: '为Scroll时,不做解释\n为Flipw时，在Scroll的基础上增加翻页的行为',
        },
        isFill: {
            default: false,
            tooltip: '当节点不能铺满一页时，选择isFill为true会填充节点铺满整个view',
        },
        Direction: {
            default: 0,
            type: Direction,
            tooltip: '规定cell的排列方向',
        },
        //******************************************以下目前弃用,不要对其进行修改*************************************************//
        pageChangeEvents: {
            default: [],
            type: cc.Component.EventHandler,
            tooltip: '仅当ViewType为pageView时有效，初始化或翻页时触发回调，向回调传入两个参数，参数一为当前处于哪一页，参数二为一共多少页',
        },
        Type: {
            default: 1,
            type: Type,
            tooltip: '为NONE时，根据滚动方向单行或单列展示排列cell，位置居中\n为GRID时，会根据view的宽或高去匹配显示多少行或多少列',
        },
        stopPropagation: {
            default: true,
            tooltip: '是否禁止触摸事件向父级传递',
        },
        Padding: {
            default: 0,
            type: 'Float',
            tooltip: '节点距离上下或左右的边距，目前弃用',
            visible: false
        },
        Spacing: {
            default: 0,
            type: 'Float',
            tooltip: '节点间的边距，目前弃用',
            visible: false
        },
    },
    onLoad: function () {

    },

    _addListenerToTouchLayer: function () {
        this._touchLayer = new cc.Node();
        var widget = this._touchLayer.addComponent(cc.Widget);
        widget.isAlignTop = true;
        widget.isAlignBottom = true;
        widget.isAlignLeft = true;
        widget.isAlignRight = true;
        widget.top = 0;
        widget.bottom = 0;
        widget.left = 0;
        widget.right = 0;
        widget.isAlignOnce = true;
        this._touchLayer.parent = this._view;

        var self = this;
        // 添加单点触摸事件监听器
        this._touchListener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: false,
            ower: this._touchLayer,
            mask: _searchMaskParent(this._touchLayer),
            onTouchBegan: function (touch, event) {
                var pos = touch.getLocation();
                var node = this.ower;

                if (node._hitTest(pos, this)) {
                    self._touchstart(touch);
                    return true;
                }
                return false;
            },
            onTouchMoved: function (touch, event) {
                self._touchmove(touch);
            },
            onTouchEnded: function (touch, event) {
                self._touchend(touch);
            }
        });
        if (CC_JSB) {
            this._touchListener.retain();
        }
        cc.eventManager.addListener(this._touchListener, this._touchLayer);
    },
    setStopPropagation: function () {
        this.node.on('touchstart', function (event) {
            event.stopPropagation();
        });
        this.node.on('touchmove', function (event) {
            event.stopPropagation();
        });
        this.node.on('touchend', function (event) {
            event.stopPropagation();
        });
        this.node.on('touchcancel', function (event) {
            event.stopPropagation();
        });
    },
    //***************************************************初始化*************************************************//
    //初始化cell
    _initCell: function (cell) {
        if (this.Type == Type.Grid) {
            if ((this.horizontal && this.Direction == Direction.TOP_TO_BOTTOM__LEFT_TO_RIGHT) || (this.vertical && this.Direction == Direction.LEFT_TO_RIGHT__TOP_TO_BOTTOM)) {
                var tag = cell.tag * cell.childrenCount;
                for (var index = 0; index < cell.childrenCount; ++index) {
                    var node = cell.children[index];
                    node.getComponent('viewCell')._cellInit_();
                    node.getComponent('viewCell').init(tag + index, this._data, cell.tag);
                }
            } else {
                if (this.ViewType == ViewType.Flip) {
                    var tag = Math.floor(cell.tag / this._showCellCount);
                    var tagnum = tag * this._showCellCount * cell.childrenCount;
                    for (var index = 0; index < cell.childrenCount; ++index) {
                        var node = cell.children[index];
                        node.getComponent('viewCell')._cellInit_();
                        node.getComponent('viewCell').init(this._showCellCount * index + cell.tag % this._showCellCount + tagnum, this._data, index + tag * cell.childrenCount);
                    }
                } else {
                    for (var index = 0; index < cell.childrenCount; ++index) {
                        var node = cell.children[index];
                        node.getComponent('viewCell')._cellInit_();
                        node.getComponent('viewCell').init(index * this._count + cell.tag, this._data, index);
                    }
                }
            }
        } else {
            cell.getComponent('viewCell')._cellInit_();
            cell.getComponent('viewCell').init(cell.tag, this._data, cell.tag);
        }
    },
    //设置cell的位置
    _setCellPosition: function (node, index) {
        if (this.horizontal) {
            if (index == 0) {
                node.x = -this.content.width * this.content.anchorX + node.width * node.anchorX + this.Padding;
            } else {
                node.x = this.content.getChildByTag(index - 1).x + node.width + this.Spacing;
            }
            node.y = (node.anchorY - this.content.anchorY) * node.height;
        } else {
            if (index == 0) {
                node.y = this.content.height * (1 - this.content.anchorY) - node.height * (1 - node.anchorY) - this.Padding;
            } else {
                node.y = this.content.getChildByTag(index - 1).y - node.height - this.Spacing;
            }
            node.x = (node.anchorX - this.content.anchorX) * node.width;
        }
    },
    _addCell: function (index) {
        var cell = this._getCell();
        cell.tag = index;
        this._setCellPosition(cell, index);
        this._initCell(cell);
        cell.parent = this.content;
    },
    _addCellsToView: function () {
        for (var index = 0; index <= this._maxCellIndex; ++index) {
            this._addCell(index);
        }
    },
    _getCell: function () {
        if (this._cellPool.size() == 0) {
            if (this.Type == Type.Grid) {
                var cell = cc.instantiate(this.cell);

                var node = new cc.Node();
                node.anchorX = 0.5;
                node.anchorY = 0.5;

                var length = 0;
                if (this.horizontal) {
                    length = this.Spacing - this.Padding;
                    node.width = cell.width;
                    if (this._groupCellCount == null) {
                        this._groupCellCount = Math.floor((this.content.height - 2 * this.Padding + this.Spacing) / (cell.height + this.Spacing));
                    }
                    node.height = this.content.height;

                    for (var index = 0; index < this._groupCellCount; ++index) {
                        if (!cell) {
                            cell = cc.instantiate(this.cell);
                        }
                        cell.x = (cell.anchorX - 0.5) * cell.width;
                        cell.y = node.height / 2 - cell.height * (1 - cell.anchorY) - this.Spacing - length;
                        length += this.Spacing + cell.height;
                        cell.parent = node;
                        cell = null;
                    }
                } else {
                    length = this.Padding - this.Spacing;
                    node.height = cell.height;
                    if (this._groupCellCount == null) {
                        this._groupCellCount = Math.floor((this.content.width - 2 * this.Padding + this.Spacing) / (cell.width + this.Spacing));
                    }
                    node.width = this.content.width;

                    for (var index = 0; index < this._groupCellCount; ++index) {
                        if (!cell) {
                            cell = cc.instantiate(this.cell);
                        }
                        cell.y = (cell.anchorY - 0.5) * cell.height;
                        cell.x = -node.width / 2 + cell.width * cell.anchorX + this.Spacing + length;
                        length += this.Spacing + cell.width;
                        cell.parent = node;
                        cell = null;
                    }
                }
                this._cellPool.put(node);
            } else {
                var node = cc.instantiate(this.cell);
                this._cellPool.put(node);
            }
        }
        var cell = this._cellPool.get();
        return cell;
    },
    _getCellSize: function () {
        var cell = this._getCell();
        var cellSize = cell.getContentSize();
        this._cellPool.put(cell);
        return cellSize;
    },
    _clearCache: function () {
        if (this._cellPool) {
            this.clear();
            this._cellPool = null;
        }
    },
    clear: function () {
        for (var index = this.content.childrenCount - 1; index >= 0; --index) {
            this._cellPool.put(this.content.children[index]);
        }
    },
    reload: function () {
        for (var index = this.content.childrenCount - 1; index >= 0; --index) {
            this._initCell(this.content.children[index]);
        }
    },
    _initTableView: function () {
        if (!this._cellPool) {
            this._cellPool = new cc.NodePool('viewCell');
        }

        this.clear();

        //_getCellSize的调用应该在cc.Widget初始化之后
        this._cellSize = this._getCellSize();

        if (this.Type == Type.Grid) {
            this._count = Math.ceil(this._count / this._groupCellCount);
        }

        if (this.horizontal) {
            this._view.width = this.node.width;
            this._view.x = (this._view.anchorX - this.node.anchorX) * this._view.width;

            this._cellCount = Math.ceil(this._view.width / this._cellSize.width) + 1;
            if (this.ViewType == ViewType.Flip) {
                if (this._cellCount > this._count) {
                    if (this.isFill) {
                        this._cellCount = Math.floor(this._view.width / this._cellSize.width);
                    } else {
                        this._cellCount = this._count;
                    }
                    this._showCellCount = this._cellCount;
                    this._pageTotal = 1;
                } else {
                    this._pageTotal = Math.ceil(this._count / (this._cellCount - 1));
                    this._count = this._pageTotal * (this._cellCount - 1);
                    this._showCellCount = this._cellCount - 1;
                }
            } else {
                if (this._cellCount > this._count) {
                    if (this.isFill) {
                        this._cellCount = Math.floor(this._view.width / this._cellSize.width);
                    } else {
                        this._cellCount = this._count;
                    }
                    this._showCellCount = this._cellCount;
                } else {
                    this._showCellCount = this._cellCount - 1;
                }
            }

            this.content.width = this._count * this._cellSize.width + (this._count - 1) * this.Spacing + 2 * this.Padding;
            if (this.content.width <= this._view.width) {
                this.content.width = this._view.width + 1;
            }

            //停止_scrollView滚动
            this.stopAutoScroll();
            this.scrollToLeft();
        } else {
            this._view.height = this.node.height;
            this._view.y = (this._view.anchorY - this.node.anchorY) * this._view.height;

            this._cellCount = Math.ceil(this._view.height / this._cellSize.height) + 1;
            if (this.ViewType == ViewType.Flip) {
                if (this._cellCount > this._count) {
                    if (this.isFill) {
                        this._cellCount = Math.floor(this._view.height / this._cellSize.height);
                    } else {
                        this._cellCount = this._count;
                    }
                    this._showCellCount = this._cellCount;
                    this._pageTotal = 1;
                } else {
                    this._pageTotal = Math.ceil(this._count / (this._cellCount - 1));
                    this._count = this._pageTotal * (this._cellCount - 1);
                    this._showCellCount = this._cellCount - 1;
                }
            } else {
                if (this._cellCount > this._count) {
                    if (this.isFill) {
                        this._cellCount = Math.floor(this._view.height / this._cellSize.height);
                    } else {
                        this._cellCount = this._count;
                    }
                    this._showCellCount = this._cellCount;
                } else {
                    this._showCellCount = this._cellCount - 1;
                }
            }

            this.content.height = this._count * this._cellSize.height + (this._count - 1) * this.Spacing + 2 * this.Padding;
            if (this.content.height <= this._view.height) {
                this.content.height = this._view.height + 1;
            }

            //停止_scrollView滚动
            this.stopAutoScroll();
            this.scrollToTop();
        }

        this._changePageNum(1 - this._page);

        this._minCellIndex = 0;
        this._maxCellIndex = this._cellCount - 1;

        this._addCellsToView();

        this._initSuccess = true;
    },
    //count:cell的总个数  data:要向cell传递的数据
    initTableView: function (count, data) {
        this._count = count;
        this._data = data;

        if (!this._initSuccess) {
            if (this.ScrollModel == ScrollModel.Horizontal) {
                this.horizontal = true;
                this.vertical = false;
            } else {
                this.vertical = true;
                this.horizontal = false;
            }
            this._view = this.content.parent;
            this.addScrollEvent(this.node, "tableview2", "_scrollEvent");
            this._addListenerToTouchLayer();
            if (this.stopPropagation) {
                this.setStopPropagation();
            }
            if (this.node.getComponent(cc.Widget)) {
                var winsize = cc.winSize;
                var resolutionSize = cc.view.getDesignResolutionSize();
                if (winsize.width == resolutionSize.width && winsize.height == resolutionSize.height) {
                    this._initTableView();
                } else {
                    this.scheduleOnce(function () {
                        this._initTableView();
                    });
                }
            } else {
                this._initTableView();
            }
        } else {
            this._initTableView();
        }
    },
    //*******************************************************END*********************************************************//
    //*************************************************重写ScrollView方法*************************************************//
    scrollToBottom: function (timeInSecond, attenuated) {
        this._scrollDirection = ScrollDirection.Down;
        this._super(timeInSecond, attenuated);
    },
    scrollToTop: function (timeInSecond, attenuated) {
        this._scrollDirection = ScrollDirection.Up;
        this._super(timeInSecond, attenuated);
    },
    scrollToLeft: function (timeInSecond, attenuated) {
        this._scrollDirection = ScrollDirection.Left;
        this._super(timeInSecond, attenuated);
    },
    scrollToRight: function (timeInSecond, attenuated) {
        this._scrollDirection = ScrollDirection.Rigth;
        this._super(timeInSecond, attenuated);
    },
    scrollToOffset: function (offset, timeInSecond, attenuated) {
        var nowoffset = this.getScrollOffset();
        nowoffset.x = -nowoffset.x;
        nowoffset.y = -nowoffset.y;
        var p = cc.pSub(offset, nowoffset);
        if (this.ScrollModel == ScrollModel.Horizontal) {
            if (p.x > 0) {
                this._scrollDirection = ScrollDirection.Left;
            } else if (p.x < 0) {
                this._scrollDirection = ScrollDirection.Rigth;
            }
        } else {
            if (p.y > 0) {
                this._scrollDirection = ScrollDirection.Up;
            } else if (p.y < 0) {
                this._scrollDirection = ScrollDirection.Down;
            }
        }

        this._super(offset, timeInSecond, attenuated);
    },
    //*******************************************************END*********************************************************//

    addScrollEvent: function (target, component, handler) {
        var eventHandler = new cc.Component.EventHandler();
        eventHandler.target = this.node;
        eventHandler.component = component;
        eventHandler.handler = handler;
        this.scrollEvents.push(eventHandler);
    },
    removeScrollEvent: function (target, component, handler) {
        for (var key in this.scrollEvents) {
            var eventHandler = this.scrollEvents[key]
            if (eventHandler.target, eventHandler.component, eventHandler.handler) {
                a.splice(key, 1);
                return;
            }
        }
    },
    clearScrollEvent: function () {
        this.scrollEvents = [];
    },
    addPageEvent: function (target, component, handler) {
        var eventHandler = new cc.Component.EventHandler();
        eventHandler.target = this.node;
        eventHandler.component = component;
        eventHandler.handler = handler;
        this.pageChangeEvents.push(eventHandler);
    },
    removePageEvent: function (target, component, handler) {
        for (var key in this.pageChangeEvents) {
            var eventHandler = this.pageChangeEvents[key]
            if (eventHandler.target, eventHandler.component, eventHandler.handler) {
                a.splice(key, 1);
                return;
            }
        }
    },
    clearPageEvent: function () {
        this.pageChangeEvents = [];
    },
    scrollToNextPage: function () {
        this.scrollToPage(this._page + 1);
    },
    scrollToLastPage: function () {
        this.scrollToPage(this._page - 1);
    },
    scrollToPage: function (page) {
        if (this.ViewType != ViewType.Flip || page == this._page) {
            return;
        }

        if (page < 1 || page > this._pageTotal) {
            return;
        }

        var time = 0.3 * Math.abs(page - this._page);

        this._changePageNum(page - this._page);

        if (this._initSuccess) {
            var x = this._view.width;
            var y = this._view.height;
            x = (this._page - 1) * x;
            y = (this._page - 1) * y;
            this.scrollToOffset({ x: x, y: y }, time);
        } else {
            this.scheduleOnce(function () {
                var x = this._view.width;
                var y = this._view.height;
                x = (this._page - 1) * x;
                y = (this._page - 1) * y;
                this.scrollToOffset({ x: x, y: y }, time);
            });
        }
    },
    getCells: function (callback) {
        if (this._initSuccess) {
            callback(ppGame.util.orderBy(this.content.children, 'tag'));
        } else {
            this.scheduleOnce(function () {
                callback(ppGame.util.orderBy(this.content.children, 'tag'));
            })
        }
    },
    _changePageNum: function (num) {
        this._page += num;

        if (this._page <= 0) {
            this._page = 1;
        } else if (this._page > this._pageTotal) {
            this._page = this._pageTotal;
        }

        for (var key in this.pageChangeEvents) {
            var event = this.pageChangeEvents[key];
            event.emit([this._page, this._pageTotal]);
        }
    },
    _touchstart: function (event) {

    },
    _touchmove: function (event) {
        var p = event.getDelta();
        var x = p.x;
        var y = p.y;
        if (this.horizontal) {
            y = 0;
        } else {
            x = 0;
        }
        this._getScrollDirection(x, y);
    },
    _touchend: function (event) {
        if (this._pageTotal > 1) {
            this._pageMove(event);
        }
        this._ckickCell(event);
    },
    _ckickCell: function (event) {
        var srartp = event.getStartLocation();
        var p = event.getLocation();

        if (Math.abs(p.x - srartp.x) > 7 || Math.abs(p.y - srartp.y) > 7) {
            return;
        }

        var convertp = this.content.convertToNodeSpaceAR(p);
        for (var key in this.content.children) {
            if (this.Type == Type.Grid) {
                var cell = this.content.children[key];
                var cellbox = cell.getBoundingBox();
                if (cellbox.contains(convertp)) {
                    convertp = cell.convertToNodeSpaceAR(p);
                    for (var k in cell.children) {
                        var box = cell.children[k].getBoundingBox();
                        if (box.contains(convertp)) {
                            cell.children[k].clicked();
                            return;
                        }
                    }
                    return;
                }
            } else {
                var box = this.content.children[key].getBoundingBox();
                if (box.contains(convertp)) {
                    this.content.children[key].clicked();
                    return;
                }
            }
        }
    },

    //移动距离小于100点则不翻页
    _pageMove: function (event) {
        var x = this._view.width;
        var y = this._view.height;

        if (this.ViewType == ViewType.Flip) {
            if (this.horizontal) {
                y = 0;
                if (Math.abs(event.getLocation().x - event.getStartLocation().x) > 100) {
                    if (this._scrollDirection == ScrollDirection.Left) {
                        if (this._page < this._pageTotal) {
                            this._changePageNum(1);
                        } else {
                            return;
                        }
                    } else if (this._scrollDirection == ScrollDirection.Rigth) {
                        if (this._page > 1) {
                            this._changePageNum(-1);
                        } else {
                            return;
                        }
                    }
                }
            } else {
                x = 0;
                if (Math.abs(event.getLocation().y - event.getStartLocation().y) > 100) {
                    if (this._scrollDirection == ScrollDirection.Up) {
                        if (this._page < this._pageTotal) {
                            this._changePageNum(1);
                        } else {
                            return;
                        }
                    } else if (this._scrollDirection == ScrollDirection.Down) {
                        if (this._page > 1) {
                            this._changePageNum(-1);
                        } else {
                            return;
                        }
                    }
                }
            }

            x = (this._page - 1) * x;
            y = (this._page - 1) * y;

            this.scrollToOffset({ x: x, y: y }, 0.3);
        }
    },
    _getBoundingBoxToWorld: function (node) {
        var p = node.convertToWorldSpaceAR(cc.v2(-node.width * node.anchorX, -node.height * node.anchorY));
        return cc.rect(p.x, p.y, node.width, node.height);
    },
    _updateCells: function () {
        var viewBox = this._getBoundingBoxToWorld(this._view);

        if (this.horizontal) {
            if (this._scrollDirection == ScrollDirection.Left) {
                if (this._maxCellIndex < this._count - 1) {
                    do {
                        var node = this.content.getChildByTag(this._minCellIndex);

                        var nodeBox = this._getBoundingBoxToWorld(node);
                        // var viewBox = this._getBoundingBoxToWorld(this._view);

                        if (nodeBox.xMax <= viewBox.xMin) {

                            node.x = this.content.getChildByTag(this._maxCellIndex).x + node.width + this.Spacing;
                            this._minCellIndex++;
                            this._maxCellIndex++;
                            node.tag = this._maxCellIndex;
                            this._initCell(node);
                        } else {
                            break;
                        }

                        if (this._maxCellIndex == this._count - 1) {
                            break;
                        }
                    } while (true);
                }

            } else if (this._scrollDirection == ScrollDirection.Rigth) {
                if (this._minCellIndex > 0) {
                    do {
                        var node = this.content.getChildByTag(this._maxCellIndex);

                        var nodeBox = this._getBoundingBoxToWorld(node);
                        // var viewBox = this._getBoundingBoxToWorld(this._view);

                        if (nodeBox.xMin >= viewBox.xMax) {
                            node.x = this.content.getChildByTag(this._minCellIndex).x - node.width - this.Spacing;
                            this._minCellIndex--;
                            this._maxCellIndex--;
                            node.tag = this._minCellIndex;
                            this._initCell(node);
                        } else {
                            break;
                        }

                        if (this._minCellIndex == 0) {
                            break;
                        }
                    } while (true);
                }
            }
        } else {
            if (this._scrollDirection == ScrollDirection.Up) {
                if (this._maxCellIndex < this._count - 1) {
                    do {
                        var node = this.content.getChildByTag(this._minCellIndex);

                        var nodeBox = this._getBoundingBoxToWorld(node);
                        // var viewBox = this._getBoundingBoxToWorld(this._view);

                        if (nodeBox.yMin >= viewBox.yMax) {
                            node.y = this.content.getChildByTag(this._maxCellIndex).y - node.height - this.Spacing;
                            this._minCellIndex++;
                            this._maxCellIndex++;
                            node.tag = this._maxCellIndex;
                            this._initCell(node);
                        } else {
                            break;
                        }

                        if (this._maxCellIndex == this._count - 1) {
                            break;
                        }
                    } while (true);
                }
            } else if (this._scrollDirection == ScrollDirection.Down) {
                if (this._minCellIndex > 0) {
                    do {
                        var node = this.content.getChildByTag(this._maxCellIndex);

                        var nodeBox = this._getBoundingBoxToWorld(node);
                        // var viewBox = this._getBoundingBoxToWorld(this._view);

                        if (nodeBox.yMax <= viewBox.yMin) {
                            node.y = this.content.getChildByTag(this._minCellIndex).y + node.height + this.Spacing;
                            this._minCellIndex--;
                            this._maxCellIndex--;
                            node.tag = this._minCellIndex;
                            this._initCell(node);
                        } else {
                            break;
                        }

                        if (this._minCellIndex == 0) {
                            break;
                        }
                    } while (true);

                }
            }
        }
    },
    _getScrollDirection: function (x, y) {

        if (x < 0) {
            this._scrollDirection = ScrollDirection.Left;
        } else if (x > 0) {
            this._scrollDirection = ScrollDirection.Rigth;
        }

        if (y < 0) {
            this._scrollDirection = ScrollDirection.Down;
        } else if (y > 0) {
            this._scrollDirection = ScrollDirection.Up;
        }
    },
    _scrollEvent: function (a, b) {
        if (b == cc.ScrollView.EventType.AUTOSCROLL_ENDED) {
            if (this.ViewType == ViewType.Single) {
                if (this.ScrollModel == ScrollModel.Horizontal) {
                    if (this._scrollDirection == ScrollDirection.Left) {
                        var node = this.content.getChildByTag(this._maxCellIndex)
                        var nodeBox = this._getBoundingBoxToWorld(node);
                        var viewBox = this._getBoundingBoxToWorld(this._view);
                        if (nodeBox.xMax - viewBox.xMax > 1) {
                            var offset = this.getScrollOffset();
                            var p = cc.pAdd(offset, { x: viewBox.xMax - nodeBox.xMax, y: 0 });
                            p.x = -p.x;
                            this.scrollToOffset(p, 1);
                        } else {
                            this._scrollDirection = ScrollDirection.None;
                        }
                    } else if (this._scrollDirection == ScrollDirection.Rigth) {
                        var node = this.content.getChildByTag(this._minCellIndex)
                        var nodeBox = this._getBoundingBoxToWorld(node);
                        var viewBox = this._getBoundingBoxToWorld(this._view);
                        if (nodeBox.xMin - viewBox.xMin < -1) {
                            var offset = this.getScrollOffset();
                            var p = cc.pAdd(offset, { x: viewBox.xMin - nodeBox.xMin, y: 0 });
                            p.x = -p.x;
                            this.scrollToOffset(p, 1);
                        } else {
                            this._scrollDirection = ScrollDirection.None;
                        }
                    }
                } else {
                    if (this._scrollDirection == ScrollDirection.Up) {
                        var node = this.content.getChildByTag(this._maxCellIndex)
                        var nodeBox = this._getBoundingBoxToWorld(node);
                        var viewBox = this._getBoundingBoxToWorld(this._view);
                        if (nodeBox.yMin - viewBox.yMin < -1) {
                            var offset = this.getScrollOffset();
                            var p = cc.pAdd(offset, { x: 0, y: nodeBox.yMin - viewBox.yMin });
                            p.y = -p.y;
                            this.scrollToOffset(p, 1);
                        } else {
                            this._scrollDirection = ScrollDirection.None;
                        }
                    } else if (this._scrollDirection == ScrollDirection.Down) {
                        var node = this.content.getChildByTag(this._minCellIndex)
                        var nodeBox = this._getBoundingBoxToWorld(node);
                        var viewBox = this._getBoundingBoxToWorld(this._view);
                        if (nodeBox.yMax - viewBox.xMax > 1) {
                            var offset = this.getScrollOffset();
                            var p = cc.pAdd(offset, { x: 0, y: nodeBox.yMax - viewBox.yMax });
                            p.y = -p.y;
                            this.scrollToOffset(p, 1);
                        } else {
                            this._scrollDirection = ScrollDirection.None;
                        }
                    }
                }
            } else {
                this._scrollDirection = ScrollDirection.None;
            }
        }
    },

    // called every frame, uncomment this function to activate update callback
    update: function (dt) {
        this._super(dt);

        if (!this._initSuccess || this._pageTotal == 1) {
            return;
        }

        this._updateCells();
    },
});