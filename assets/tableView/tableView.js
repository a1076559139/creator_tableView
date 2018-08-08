var ScrollModel = cc.Enum({ Horizontal: 0, Vertical: 1 });
var ScrollDirection = cc.Enum({ None: 0, Up: 1, Down: 2, Left: 3, Rigth: 4 });
var Direction = cc.Enum({ LEFT_TO_RIGHT__TOP_TO_BOTTOM: 0, TOP_TO_BOTTOM__LEFT_TO_RIGHT: 1 });
var ViewType = cc.Enum({ Scroll: 0, Flip: 1 });

function pSub(t, e) {
    return cc.v2(t.x - e.x, t.y - e.y)
}

function quickSort(arr, cb) {
    //如果数组<=1,则直接返回
    if (arr.length <= 1) { return arr; }
    var pivotIndex = Math.floor(arr.length / 2);
    //找基准
    var pivot = arr[pivotIndex];
    //定义左右数组
    var left = [];
    var right = [];

    //比基准小的放在left，比基准大的放在right
    for (var i = 0; i < arr.length; i++) {
        if (i !== pivotIndex) {
            if (cb) {
                if (cb(arr[i], pivot)) {
                    left.push(arr[i]);
                } else {
                    right.push(arr[i]);
                }
            } else {
                if (arr[i] <= pivot) {
                    left.push(arr[i]);
                } else {
                    right.push(arr[i]);
                }
            }
        }
    }
    //递归
    return quickSort(left, cb).concat([pivot], quickSort(right, cb));
}

var tableView = cc.Class({
    extends: cc.ScrollView,
    editor: CC_EDITOR && {
        menu: "添加 UI 组件/tableView(自定义)",
        help: "https://github.com/a1076559139/creator_tableView",
        inspector: 'packages://tableView/inspector.js',
    },
    properties: {
        // 缓存的数据
        _data: null,
        //cell的最小下标
        _minCellIndex: 0,
        //cell的最大下标
        _maxCellIndex: 0,
        _paramCount: 0,
        //一共有多少节点
        _count: 0,
        //scroll下有多少节点
        _cellCount: 0,
        //scroll一个屏幕能显示多少节点
        _showCellCount: 0,

        //GRID模式下，对cell进行分组管理
        //每组有几个节点
        _groupCellCount: null,

        _scrollDirection: ScrollDirection.None,

        _cellPool: null,
        _view: null,

        _page: 0,//当前处于那一页
        _pageTotal: 0,//总共有多少页

        cell: {
            default: null,
            type: cc.Prefab,
            notify: function (oldValue) {

            }
        },

        ScrollModel: {
            default: 0,
            type: ScrollModel,
            notify: function (oldValue) {
                if (this.ScrollModel === ScrollModel.Horizontal) {
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
                if (this.ViewType === ViewType.Flip) {
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
        pageChangeEvents: {
            default: [],
            type: cc.Component.EventHandler,
            tooltip: '仅当ViewType为pageView时有效，初始化或翻页时触发回调，向回调传入两个参数，参数一为当前处于哪一页，参数二为一共多少页',
        },
    },
    statics: {
        _cellPoolCache: {},
    },
    onLoad: function () {
        window.s = this;
        var self = this;
        tableView._tableView.push(this);

        //当销毁tableView的时候，回收cell
        var destroy = this.node.destroy;
        this.node.destroy = function () {
            self.clear();
            destroy.call(self.node);
        }

        var _onPreDestroy = this.node._onPreDestroy;
        this.node._onPreDestroy = function () {
            self.clear();
            _onPreDestroy.call(self.node);
        }
    },
    onDestroy: function () {
        for (var key in tableView._tableView) {
            if (tableView._tableView[key] === this) {
                tableView._tableView.splice(key);
                return;
            }
        }
    },
    //初始化cell
    _initCell: function (cell, reload) {
        if ((this.ScrollModel === ScrollModel.Horizontal && this.Direction === Direction.TOP_TO_BOTTOM__LEFT_TO_RIGHT) || (this.ScrollModel === ScrollModel.Vertical && this.Direction === Direction.LEFT_TO_RIGHT__TOP_TO_BOTTOM)) {
            var tag = cell.tag * cell.childrenCount;
            for (var index = 0; index < cell.childrenCount; ++index) {
                var node = cell.children[index];
                var viewCell = node.getComponent('viewCell');
                if (viewCell) {
                    viewCell._cellInit_(this);
                    viewCell.init(tag + index, this._data, reload, [cell.tag, index]);
                }
            }
        } else {
            if (this.ViewType === ViewType.Flip) {
                var tag = Math.floor(cell.tag / this._showCellCount);
                var tagnum = tag * this._showCellCount * cell.childrenCount;
                for (var index = 0; index < cell.childrenCount; ++index) {
                    var node = cell.children[index];
                    var viewCell = node.getComponent('viewCell');
                    if (viewCell) {
                        viewCell._cellInit_(this);
                        viewCell.init(this._showCellCount * index + cell.tag % this._showCellCount + tagnum, this._data, reload, [index + tag * cell.childrenCount, index]);
                    }
                }
            } else {
                for (var index = 0; index < cell.childrenCount; ++index) {
                    var node = cell.children[index];
                    var viewCell = node.getComponent('viewCell');
                    if (viewCell) {
                        viewCell._cellInit_(this);
                        viewCell.init(index * this._count + cell.tag, this._data, reload, [index, index]);
                    }
                }
            }
        }
    },
    //设置cell的位置
    _setCellPosition: function (node, index) {
        if (this.ScrollModel === ScrollModel.Horizontal) {
            if (index === 0) {
                node.x = -this.content.width * this.content.anchorX + node.width * node.anchorX;
            } else {
                node.x = this.content.getChildByTag(index - 1).x + node.width;
            }
            node.y = (node.anchorY - this.content.anchorY) * node.height;
        } else {
            if (index === 0) {
                node.y = this.content.height * (1 - this.content.anchorY) - node.height * (1 - node.anchorY);
            } else {
                node.y = this.content.getChildByTag(index - 1).y - node.height;
            }
            node.x = (node.anchorX - this.content.anchorX) * node.width;
        }
    },
    _addCell: function (index) {
        var cell = this._getCell();
        this._setCellAttr(cell, index);
        this._setCellPosition(cell, index);
        cell.parent = this.content;
        this._initCell(cell);
    },
    _setCellAttr: function (cell, index) {
        cell.setSiblingIndex(index >= cell.tag ? this._cellCount : 0);
        cell.tag = index;
    },
    _addCellsToView: function () {
        for (var index = 0; index <= this._maxCellIndex; ++index) {
            this._addCell(index);
        }
    },
    _getCell: function () {
        if (this._cellPool.size() === 0) {
            var cell = cc.instantiate(this.cell);

            var node = new cc.Node();
            node.anchorX = 0.5;
            node.anchorY = 0.5;

            var length = 0;
            if (this.ScrollModel === ScrollModel.Horizontal) {
                node.width = cell.width;
                var childrenCount = Math.floor((this.content.height) / (cell.height));
                node.height = this.content.height;

                for (var index = 0; index < childrenCount; ++index) {
                    if (!cell) {
                        cell = cc.instantiate(this.cell);
                    }
                    cell.x = (cell.anchorX - 0.5) * cell.width;
                    cell.y = node.height / 2 - cell.height * (1 - cell.anchorY) - length;
                    length += cell.height;
                    cell.parent = node;
                    cell = null;
                }
            } else {
                node.height = cell.height;
                var childrenCount = Math.floor((this.content.width) / (cell.width));
                node.width = this.content.width;

                for (var index = 0; index < childrenCount; ++index) {
                    if (!cell) {
                        cell = cc.instantiate(this.cell);
                    }
                    cell.y = (cell.anchorY - 0.5) * cell.height;
                    cell.x = -node.width / 2 + cell.width * cell.anchorX + length;
                    length += cell.width;
                    cell.parent = node;
                    cell = null;
                }
            }
            this._cellPool.put(node);
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
    _getGroupCellCount: function () {
        var cell = this._getCell();
        var groupCellCount = cell.childrenCount;
        this._cellPool.put(cell);
        return groupCellCount;
    },
    clear: function () {
        for (var index = this.content.childrenCount - 1; index >= 0; --index) {
            this._cellPool.put(this.content.children[index]);
        }
        this._cellCount = 0;
        this._showCellCount = 0;
    },
    reload: function (data) {
        if (data !== undefined) {
            this._data = data;
        }
        for (var index = this.content.childrenCount - 1; index >= 0; --index) {
            this._initCell(this.content.children[index], true);
        }
    },
    _getCellPoolCacheName: function () {
        if (this.ScrollModel === ScrollModel.Horizontal) {
            return this.cell.name + 'h' + this.content.height;
        } else {
            return this.cell.name + 'w' + this.content.width;
        }
    },
    _initTableView: function () {
        if (this._cellPool) {
            this.clear();
        }

        var name = this._getCellPoolCacheName();
        if (!tableView._cellPoolCache[name]) {
            tableView._cellPoolCache[name] = new cc.NodePool('viewCell');
        }
        this._cellPool = tableView._cellPoolCache[name];

        this._cellSize = this._getCellSize();
        this._groupCellCount = this._getGroupCellCount();

        this._count = Math.ceil(this._paramCount / this._groupCellCount);

        if (this.ScrollModel === ScrollModel.Horizontal) {
            this._view.width = this.node.width;
            this._view.x = (this._view.anchorX - this.node.anchorX) * this._view.width;

            this._cellCount = Math.ceil(this._view.width / this._cellSize.width) + 1;
            if (this.ViewType === ViewType.Flip) {
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

            this.content.width = this._count * this._cellSize.width;
            // if (this.content.width <= this._view.width) {
            //     this.content.width = this._view.width + 1;
            // }

            //停止_scrollView滚动
            this.stopAutoScroll();
            this.scrollToLeft();
        } else {
            this._view.height = this.node.height;
            this._view.y = (this._view.anchorY - this.node.anchorY) * this._view.height;

            this._cellCount = Math.ceil(this._view.height / this._cellSize.height) + 1;
            if (this.ViewType === ViewType.Flip) {
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

            this.content.height = this._count * this._cellSize.height;
            // if (this.content.height <= this._view.height) {
            //     this.content.height = this._view.height + 1;
            // }

            //停止_scrollView滚动
            this.stopAutoScroll();
            this.scrollToTop();
        }

        this._changePageNum(1 - this._page);

        this._lastOffset = this.getScrollOffset();
        this._minCellIndex = 0;
        this._maxCellIndex = this._cellCount - 1;

        this._addCellsToView();
    },
    //count:cell的总个数  data:要向cell传递的数据
    initTableView: function (paramCount, data) {
        this._paramCount = paramCount;
        this._data = data;

        if (this.ScrollModel === ScrollModel.Horizontal) {
            this.horizontal = true;
            this.vertical = false;
        } else {
            this.vertical = true;
            this.horizontal = false;
        }
        this._view = this.content.parent;
        //为scrollBar添加size改变的监听
        this.verticalScrollBar && this.verticalScrollBar.node.on('size-changed', function () {
            this._updateScrollBar(this._getHowMuchOutOfBoundary());
        }, this);
        this.horizontalScrollBar && this.horizontalScrollBar.node.on('size-changed', function () {
            this._updateScrollBar(this._getHowMuchOutOfBoundary());
        }, this);
        if (this.node.getComponent(cc.Widget)) {
            this.node.getComponent(cc.Widget).updateAlignment();
        }
        this._initTableView();
    },
    //*************************************************重写ScrollView方法*************************************************//
    // touch event handler
    _onTouchBegan: function (event, captureListeners) {
        this._super(event, captureListeners);
        this._touchstart(event);
    },

    _onTouchMoved: function (event, captureListeners) {
        if (!this.enabledInHierarchy) return;
        if (this._hasNestedViewGroup(event, captureListeners)) return;

        let touch = event.touch;
        if (this.content) {
            this._handleMoveLogic(touch);
        }
        // Do not prevent touch events in inner nodes
        if (!this.cancelInnerEvents) {
            return;
        }

        let deltaMove = cc.pSub(touch.getLocation(), touch.getStartLocation());
        //FIXME: touch move delta should be calculated by DPI.
        if (deltaMove.mag() > 7) {
            if (!this._touchMoved && event.target !== this.node) {
                // Simulate touch cancel for target node
                let cancelEvent = new cc.Event.EventTouch(event.getTouches(), event.bubbles);
                cancelEvent.type = cc.Node.EventType.TOUCH_CANCEL;
                cancelEvent.touch = event.touch;
                cancelEvent.simulate = true;
                // event.target.dispatchEvent(cancelEvent);
                event.target.emit(cc.Node.EventType.TOUCH_CANCEL, cancelEvent);
                this._touchMoved = true;
            }
        }
        this._stopPropagationIfTargetIsMe(event);

        this._touchmove(event);
    },

    _onTouchEnded: function (event, captureListeners) {
        this._super(event, captureListeners);
        this._touchend(event);
    },
    _onTouchCancelled: function (event, captureListeners) {
        this._super(event, captureListeners);
        this._touchend(event);
    },
    stopAutoScroll: function () {
        this._scrollDirection = ScrollDirection.None;
        this._super();
    },
    scrollToBottom: function (timeInSecond, attenuated) {
        this._scrollDirection = ScrollDirection.Up;
        this._super(timeInSecond, attenuated);
    },
    scrollToTop: function (timeInSecond, attenuated) {
        this._scrollDirection = ScrollDirection.Down;
        this._super(timeInSecond, attenuated);
    },
    scrollToLeft: function (timeInSecond, attenuated) {
        this._scrollDirection = ScrollDirection.Rigth;
        this._super(timeInSecond, attenuated);
    },
    scrollToRight: function (timeInSecond, attenuated) {
        this._scrollDirection = ScrollDirection.Left;
        this._super(timeInSecond, attenuated);
    },
    scrollToOffset: function (offset, timeInSecond, attenuated) {
        var nowoffset = this.getScrollOffset();
        var p = pSub(offset, nowoffset);
        if (this.ScrollModel === ScrollModel.Horizontal) {
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
        eventHandler.target = target;
        eventHandler.component = component;
        eventHandler.handler = handler;
        this.scrollEvents.push(eventHandler);
    },
    removeScrollEvent: function (target) {
        for (var key in this.scrollEvents) {
            var eventHandler = this.scrollEvents[key]
            if (eventHandler.target === target) {
                this.scrollEvents.splice(key, 1);
                return;
            }
        }
    },
    clearScrollEvent: function () {
        this.scrollEvents = [];
    },
    addPageEvent: function (target, component, handler) {
        var eventHandler = new cc.Component.EventHandler();
        eventHandler.target = target;
        eventHandler.component = component;
        eventHandler.handler = handler;
        this.pageChangeEvents.push(eventHandler);
    },
    removePageEvent: function (target) {
        for (var key = 0; key < this.pageChangeEvents.length; key++) {
            var eventHandler = this.pageChangeEvents[key]
            if (eventHandler.target === target) {
                this.pageChangeEvents.splice(key, 1);
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
        if (this.ViewType !== ViewType.Flip || page === this._page) {
            return;
        }

        if (page < 1 || page > this._pageTotal) {
            return;
        }

        var time = 0.3 * Math.abs(page - this._page);

        this._changePageNum(page - this._page);

        var x = this._view.width;
        var y = this._view.height;
        x = (this._page - 1) * x;
        y = (this._page - 1) * y;
        this.scrollToOffset({ x: x, y: y }, time);
    },
    getCells: function (callback) {
        var cells = [];
        var nodes = quickSort(this.content.children, function (a, b) {
            return a.tag < b.tag;
        });
        for (var key in nodes) {
            var node = nodes[key];
            for (var k in node.children) {
                cells.push(node.children[k]);
            }
        }
        callback(cells);
    },
    getData: function () {
        return this._data;
    },
    getGroupsRange: function (callback) {
        var arr = [];
        for (var i = this._minCellIndex; i <= this._maxCellIndex; i++) {
            arr.push(i);
        }
        callback(arr);
    },
    _changePageNum: function (num) {
        this._page += num;

        if (this._page <= 0) {
            this._page = 1;
        } else if (this._page > this._pageTotal) {
            this._page = this._pageTotal;
        }

        for (var key = 0; key < this.pageChangeEvents.length; key++) {
            var event = this.pageChangeEvents[key];
            event.emit([this._page, this._pageTotal]);
        }
    },
    _touchstart: function (event) {
        if (this.ScrollModel === ScrollModel.Horizontal) {
            this.horizontal = false;
        } else {
            this.vertical = false;
        }
    },
    _touchmove: function (event) {
        if (this.horizontal === this.vertical) {
            var startL = event.getStartLocation();
            var l = event.getLocation();
            if (this.ScrollModel === ScrollModel.Horizontal) {
                if (Math.abs(l.x - startL.x) <= 7) {
                    return;
                }
            } else {
                if (Math.abs(l.y - startL.y) <= 7) {
                    return;
                }
            }

            if (this.ScrollModel === ScrollModel.Horizontal) {
                this.horizontal = true;
            } else {
                this.vertical = true;
            }
        }
    },
    _touchend: function (event) {
        if (this.ScrollModel === ScrollModel.Horizontal) {
            this.horizontal = true;
        } else {
            this.vertical = true;
        }

        if (this.ViewType === ViewType.Flip && this._pageTotal > 1) {
            this._pageMove(event);
        }

        // this._ckickCell(event);
    },
    // _ckickCell: function (event) {
    //     var srartp = event.getStartLocation();
    //     var p = event.getLocation();

    //     if (this.ScrollModel === ScrollModel.Horizontal) {
    //         if (Math.abs(p.x - srartp.x) > 7) {
    //             return;
    //         }
    //     } else {
    //         if (Math.abs(p.y - srartp.y) > 7) {
    //             return;
    //         }
    //     }

    //     var convertp = this.content.convertToNodeSpaceAR(p);
    //     for (var key in this.content.children) {
    //         var node = this.content.children[key];
    //         var nodebox = node.getBoundingBox();
    //         if (nodebox.contains(convertp)) {
    //             convertp = node.convertToNodeSpaceAR(p);
    //             for (var k in node.children) {
    //                 var cell = node.children[k]
    //                 var cellbox = cell.getBoundingBox();
    //                 if (cellbox.contains(convertp)) {
    //                     if (cell.activeInHierarchy && cell.opacity !== 0) {
    //                         cell.clicked();
    //                     }
    //                     return;
    //                 }
    //             }
    //             return;
    //         }
    //     }
    // },
    //移动距离小于25%则不翻页
    _pageMove: function (event) {
        var x = this._view.width;
        var y = this._view.height;

        if (this.ViewType === ViewType.Flip) {
            var offset = this.getScrollOffset();
            var offsetMax = this.getMaxScrollOffset();

            if (this.ScrollModel === ScrollModel.Horizontal) {
                if (offset.x >= 0 || offset.x <= -offsetMax.x) {
                    return;
                }
                y = 0;
                if (Math.abs(event.getLocation().x - event.getStartLocation().x) > this._view.width / 4) {
                    if (this._scrollDirection === ScrollDirection.Left) {
                        if (this._page < this._pageTotal) {
                            this._changePageNum(1);
                        } else {
                            return;
                        }
                    } else if (this._scrollDirection === ScrollDirection.Rigth) {
                        if (this._page > 1) {
                            this._changePageNum(-1);
                        } else {
                            return;
                        }
                    }
                }
            } else {
                if (offset.y >= offsetMax.y || offset.y <= 0) {
                    return;
                }
                x = 0;
                if (Math.abs(event.getLocation().y - event.getStartLocation().y) > this._view.height / 4) {
                    if (this._scrollDirection === ScrollDirection.Up) {
                        if (this._page < this._pageTotal) {
                            this._changePageNum(1);
                        } else {
                            return;
                        }
                    } else if (this._scrollDirection === ScrollDirection.Down) {
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
        var p = node.convertToWorldSpace(cc.p(0, 0));
        return cc.rect(p.x, p.y, node.width, node.height);
    },
    _updateCells: function () {
        if (this.ScrollModel === ScrollModel.Horizontal) {
            if (this._scrollDirection === ScrollDirection.Left) {
                if (this._maxCellIndex < this._count - 1) {
                    var viewBox = this._getBoundingBoxToWorld(this._view);
                    do {
                        var node = this.content.getChildByTag(this._minCellIndex);
                        var nodeBox = this._getBoundingBoxToWorld(node);

                        if (nodeBox.xMax <= viewBox.xMin) {
                            node.x = this.content.getChildByTag(this._maxCellIndex).x + node.width;
                            this._minCellIndex++;
                            this._maxCellIndex++;
                            if (nodeBox.xMax + (this._maxCellIndex - this._minCellIndex + 1) * node.width > viewBox.xMin) {
                                this._setCellAttr(node, this._maxCellIndex);
                                this._initCell(node);
                            }
                        } else {
                            break;
                        }
                    } while (this._maxCellIndex !== this._count - 1);
                }

            } else if (this._scrollDirection === ScrollDirection.Rigth) {
                if (this._minCellIndex > 0) {
                    var viewBox = this._getBoundingBoxToWorld(this._view);
                    do {
                        var node = this.content.getChildByTag(this._maxCellIndex);
                        var nodeBox = this._getBoundingBoxToWorld(node);

                        if (nodeBox.xMin >= viewBox.xMax) {
                            node.x = this.content.getChildByTag(this._minCellIndex).x - node.width;
                            this._minCellIndex--;
                            this._maxCellIndex--;
                            if (nodeBox.xMin - (this._maxCellIndex - this._minCellIndex + 1) * node.width < viewBox.xMax) {
                                this._setCellAttr(node, this._minCellIndex);
                                this._initCell(node);
                            }
                        } else {
                            break;
                        }
                    } while (this._minCellIndex !== 0);
                }
            }
        } else {
            if (this._scrollDirection === ScrollDirection.Up) {
                if (this._maxCellIndex < this._count - 1) {
                    var viewBox = this._getBoundingBoxToWorld(this._view);
                    do {
                        var node = this.content.getChildByTag(this._minCellIndex);
                        var nodeBox = this._getBoundingBoxToWorld(node);

                        if (nodeBox.yMin >= viewBox.yMax) {
                            node.y = this.content.getChildByTag(this._maxCellIndex).y - node.height;
                            this._minCellIndex++;
                            this._maxCellIndex++;
                            if (nodeBox.yMin - (this._maxCellIndex - this._minCellIndex + 1) * node.height < viewBox.yMax) {
                                this._setCellAttr(node, this._maxCellIndex);
                                this._initCell(node);
                            }
                        } else {
                            break;
                        }
                    } while (this._maxCellIndex !== this._count - 1);
                }
            } else if (this._scrollDirection === ScrollDirection.Down) {
                if (this._minCellIndex > 0) {
                    var viewBox = this._getBoundingBoxToWorld(this._view);
                    do {
                        var node = this.content.getChildByTag(this._maxCellIndex);
                        var nodeBox = this._getBoundingBoxToWorld(node);

                        if (nodeBox.yMax <= viewBox.yMin) {
                            node.y = this.content.getChildByTag(this._minCellIndex).y + node.height;
                            this._minCellIndex--;
                            this._maxCellIndex--;
                            if (nodeBox.yMax + (this._maxCellIndex - this._minCellIndex + 1) * node.width > viewBox.yMin) {
                                this._setCellAttr(node, this._minCellIndex);
                                this._initCell(node);
                            }
                        } else {
                            break;
                        }
                    } while (this._minCellIndex !== 0);

                }
            }
        }
    },
    _getScrollDirection: function () {
        var offset = this.getScrollOffset();

        var lastOffset = this._lastOffset;
        this._lastOffset = offset;
        offset = pSub(offset, lastOffset);

        if (this.ScrollModel === ScrollModel.Horizontal) {
            if (offset.x > 0) {
                this._scrollDirection = ScrollDirection.Rigth;
            } else if (offset.x < 0) {
                this._scrollDirection = ScrollDirection.Left;
            } else {
                this._scrollDirection = ScrollDirection.None;
            }
        } else {
            if (offset.y < 0) {

                this._scrollDirection = ScrollDirection.Down;
            } else if (offset.y > 0) {
                this._scrollDirection = ScrollDirection.Up;
            } else {
                this._scrollDirection = ScrollDirection.None;
            }
        }
    },

    // called every frame, uncomment this function to activate update callback
    update: function (dt) {
        this._super(dt);

        if (this._cellCount === this._showCellCount || this._pageTotal === 1) {
            return;
        }
        this._getScrollDirection();
        this._updateCells();
    },
});
tableView._tableView = [];
tableView.reload = function () {
    for (var key in tableView._tableView) {
        tableView._tableView[key].reload();
    }
}
tableView.clear = function () {
    for (var key in tableView._tableView) {
        tableView._tableView[key].clear();
    }
}

cc.tableView = module.export = tableView;