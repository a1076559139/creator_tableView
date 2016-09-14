var scrollDirection = cc.Enum({ None: 0, Up: 1, Down: 2, Left: 3, Rigth: 4 });
var viewType = cc.Enum({ tableView: 0, pageView: 1 });
var Type = cc.Enum({ NONE: 0, GRID: 1 });
var Direction = cc.Enum({ LEFT_TO_RIGHT__TOP_TO_BOTTOM: 0, TOP_TO_BOTTOM__LEFT_TO_RIGHT: 1 });

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
    extends: cc.Component,
    // editor: {
    //     inspector: 'packages://tableview/inspector.js',
    // },
    properties: {
        _data: null,
        _minCellIndex: 0,//cell的最小下标
        _maxCellIndex: 0,//cell的最大下标

        _count: 0,//一共有多少节点
        _cellCount: 0,//scroll下有多少节点
        _showCellCount: 0,//scroll一个屏幕能显示多少节点
        //GRID模式下，对cell进行分组管理
        _groupCellCount: null,//每组有几个节点

        _scrollDirection: scrollDirection.None,

        _cellPool: null,
        _scrollView: null,
        _view: null,
        _content: null,

        _page: 0,//当前处于那一页
        _pageTotal: 0,//总共有多少页
        content: cc.Node,
        cell: {
            default: null,
            type: cc.Prefab,
            notify: function (oldValue) {
                this._clearCache();
            }
        },
        touchLayer: cc.Node,
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
        viewType: {
            default: 0,
            type: viewType,
            tooltip: '为tableView时,不做解释\n为pageView时，在tableView的基础上增加翻页的行为',
        },
        Type: {
            default: 0,
            type: Type,
            tooltip: '为NONE时，根据滚动方向单行或单列展示排列cell，位置居中\n为GRID时，会根据view的宽或高去匹配显示多少行或多少列',
        },
        isFill: {
            default: false,
            tooltip: '当节点不能铺满一页时，选择isFill为true会填充节点铺满整个view',
        },
        stopPropagation: {
            default: true,
            tooltip: '是否禁止触摸事件向父级传递',
        },
        Direction: {
            default: 0,
            type: Direction,
            tooltip: '仅当Type为GRID时有效，规定cell的排列方向',
        },
        pageChangeEvents: {
            default: [],
            type: cc.Component.EventHandler,
            tooltip: '仅当viewType为pageView时有效，初始化或翻页时触发回调，向回调传入两个参数，参数一为当前处于哪一页，参数二为一共多少页',
        },

        _initSuccess: false,//是否初始化成功
    },

    onLoad: function () {
        this.addListenerToTouchLayer();

        if (this.stopPropagation) {
            this.setStopPropagation();
        }

        if (this.viewType == viewType.pageView) {
            var _scrollView = this.getComponent(cc.ScrollView);
            _scrollView.inertia = false;
        }
    },

    addListenerToTouchLayer: function () {
        var self = this;
        // 添加单点触摸事件监听器
        this._touchListener = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: false,
            ower: this.touchLayer,
            mask: _searchMaskParent(this.touchLayer),
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
        cc.eventManager.addListener(this._touchListener, this.touchLayer);
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
        if (this.Type == Type.GRID) {
            if ((this._scrollView.horizontal && this.Direction == Direction.TOP_TO_BOTTOM__LEFT_TO_RIGHT) || (this._scrollView.vertical && this.Direction == Direction.LEFT_TO_RIGHT__TOP_TO_BOTTOM)) {
                var tag = cell.tag * cell.childrenCount;
                for (var index = 0; index < cell.childrenCount; ++index) {
                    var node = cell.children[index];
                    node.getComponent('viewCell')._cellInit_();
                    node.getComponent('viewCell').init(tag + index, this._data, cell.tag);
                }
            } else {
                if (this.viewType == viewType.tableView) {
                    for (var index = 0; index < cell.childrenCount; ++index) {
                        var node = cell.children[index];
                        node.getComponent('viewCell')._cellInit_();
                        node.getComponent('viewCell').init(index * this._count + cell.tag, this._data, index);
                    }
                } else {
                    var tag = Math.floor(cell.tag / this._showCellCount);
                    var tagnum = tag * this._showCellCount * cell.childrenCount;
                    for (var index = 0; index < cell.childrenCount; ++index) {
                        var node = cell.children[index];
                        node.getComponent('viewCell')._cellInit_();
                        node.getComponent('viewCell').init(this._showCellCount * index + cell.tag % this._showCellCount + tagnum, this._data, index + tag * cell.childrenCount);
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
        if (this._scrollView.horizontal) {
            if (index == 0) {
                node.x = -this._content.width * this._content.anchorX + node.width * node.anchorX + this.Padding;
            } else {
                node.x = this._content.getChildByTag(index - 1).x + node.width + this.Spacing;
            }
            node.y = (node.anchorY - this._content.anchorY) * node.height;
        } else {
            if (index == 0) {
                node.y = this._content.height * (1 - this._content.anchorY) - node.height * (1 - node.anchorY) - this.Padding;
            } else {
                node.y = this._content.getChildByTag(index - 1).y - node.height - this.Spacing;
            }
            node.x = (node.anchorX - this._content.anchorX) * node.width;
        }
    },
    _addCell: function (index) {
        var cell = this._getCell();
        cell.tag = index;
        this._setCellPosition(cell, index);
        this._initCell(cell);
        cell.parent = this._content;
    },
    _addCellsToView: function () {
        for (var index = 0; index <= this._maxCellIndex; ++index) {
            this._addCell(index);
        }
    },
    _getCell: function () {
        if (this._cellPool.size() == 0) {
            if (this.Type == Type.GRID) {
                var cell = cc.instantiate(this.cell);

                var node = new cc.Node();
                node.anchorX = 0.5;
                node.anchorY = 0.5;

                var length = 0;
                if (this._scrollView.horizontal) {
                    length = this.Spacing - this.Padding;
                    node.width = cell.width;
                    if (this._groupCellCount == null) {
                        this._groupCellCount = Math.floor((this._view.height - 2 * this.Padding + this.Spacing) / (cell.height + this.Spacing));
                    }

                    node.height = this._view.height;

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
                        this._groupCellCount = Math.floor((this._view.width - 2 * this.Padding + this.Spacing) / (cell.width + this.Spacing));
                    }

                    node.width = this._view.width;

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
        for (var index = this._content.childrenCount - 1; index >= 0; --index) {
            this._cellPool.put(this._content.children[index]);
        }
    },
    reload: function () {
        for (var index = this._content.childrenCount - 1; index >= 0; --index) {
            this._initCell(this._content.children[index]);
        }
    },
    _initTableView: function () {
        if (!this._cellPool) {
            this._cellPool = new cc.NodePool('viewCell');
        }

        this.clear();

        //_getCellSize的调用应该在cc.Widget初始化之后
        this._cellSize = this._getCellSize();

        if (this.Type == Type.GRID) {
            this._count = Math.ceil(this._count / this._groupCellCount);
        }

        if (this._scrollView.horizontal) {
            this._cellCount = Math.ceil(this._view.width / this._cellSize.width) + 1;
            if (this.viewType == viewType.pageView) {
                if (this._cellCount > this._count) {
                    if (this.isFill) {
                        this._cellCount = Math.floor(this._view.width / this._cellSize.width);
                    } else {
                        this._cellCount = this._count
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
                        this._cellCount = this._count
                    }
                    this._showCellCount = this._cellCount;
                } else {
                    this._showCellCount = this._cellCount - 1;
                }
            }

            this._content.height = this._view.height;

            this._content.width = this._count * this._cellSize.width + (this._count - 1) * this.Spacing + 2 * this.Padding;
            if (this._content.width <= this._view.width) {
                this._content.width = this._view.width + 1;
            }

            this._content.y = (this._content.anchorY - this._view.anchorY) * this._content.height;

            //停止_scrollView滚动
            this._scrollView.node.emit('touchstart');
            this._scrollView.scrollToLeft();
        } else {
            this._cellCount = Math.ceil(this._view.height / this._cellSize.height) + 1;
            if (this.viewType == viewType.pageView) {
                if (this._cellCount > this._count) {
                    if (this.isFill) {
                        this._cellCount = Math.floor(this._view.height / this._cellSize.height);
                    } else {
                        this._cellCount = this._count
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
                        this._cellCount = this._count
                    }
                    this._showCellCount = this._cellCount;
                } else {
                    this._showCellCount = this._cellCount - 1;
                }
            }

            this._content.width = this._view.width;

            this._content.height = this._count * this._cellSize.height + (this._count - 1) * this.Spacing + 2 * this.Padding;
            if (this._content.height <= this._view.height) {
                this._content.height = this._view.height + 1;
            }

            this._content.x = (this._content.anchorX - this._view.anchorX) * this._content.width;

            //停止_scrollView滚动
            this._scrollView.node.emit('touchstart');
            this._scrollView.scrollToTop();
        }

        this._changePageNum(1 - this._page);// this._page = 1;

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
            this._content = this.content;
            this._view = this._content.parent;

            this._scrollView = this._view.getComponent(cc.ScrollView);
            var eventHandler = new cc.Component.EventHandler();
            eventHandler.target = this.node;
            eventHandler.component = "tableview";
            eventHandler.handler = "_scrollEvent";
            this._scrollView.scrollEvents.push(eventHandler);

            this._addMethodToScrollView();

            if (this._view.getComponent(cc.Widget)) {
                var winsize = cc.winSize;
                var resolutionSize = cc.view.getDesignResolutionSize();
                if (winsize.width == resolutionSize.width && winsize.height == resolutionSize.height) {
                    this._initTableView();
                } else {
                    // this._view.on('size-changed', function () {
                    //     this._initTableView();
                    // }, this);
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
    _addMethodToScrollView: function () {
        this._scrollView.scrollToPage = this.scrollToPage.bind(this);
    },
    //*********************************************************END*********************************************************//
    scrollToNextPage: function () {
        this.scrollToPage(this._page + 1);
    },
    scrollToLastPage: function () {
        this.scrollToPage(this._page - 1);
    },
    scrollToPage: function (page) {
        if (this.viewType != viewType.pageView || !this._scrollView) {
            return;
        }

        if (this._scrollView.horizontal) {
            if (page > this._page && page <= this._pageTotal) {
                this._scrollDirection = scrollDirection.Left;
            } else if (page < this._page && page > 0) {
                this._scrollDirection = scrollDirection.Rigth;
            } else {
                return;
            }
        } else {
            if (page > this._page && page <= this._pageTotal) {
                this._scrollDirection = scrollDirection.Up;
            } else if (page < this._page && page > 0) {
                this._scrollDirection = scrollDirection.Down;
            } else {
                return;
            }
        }

        var time = 0.3 * Math.abs(page - this._page);

        this._changePageNum(page - this._page);

        if (this._initSuccess) {
            var x = this._view.width;
            var y = this._view.height;
            x = (this._page - 1) * x;
            y = (this._page - 1) * y;
            this._scrollView.scrollToOffset({ x: x, y: y }, time);
        } else {
            this.scheduleOnce(function () {
                var x = this._view.width;
                var y = this._view.height;
                x = (this._page - 1) * x;
                y = (this._page - 1) * y;
                this._scrollView.scrollToOffset({ x: x, y: y }, time);
            });
        }
    },
    getCells: function (callback) {
        if (this._initSuccess) {
            callback(ppGame.util.orderBy(this._scrollView.content.children, 'tag'));
        } else {
            this.scheduleOnce(function () {
                callback(ppGame.util.orderBy(this._scrollView.content.children, 'tag'));
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
        if (this.viewType == viewType.pageView) {
            this._tempScrollDirection = this._scrollDirection;
            this._scrollDirection = scrollDirection.None;
        }
    },
    _touchmove: function (event) {
        var p = event.getDelta();
        var x = p.x;
        var y = p.y;
        if (this._scrollView.horizontal) {
            y = 0;
        } else {
            x = 0;
        }
        this._getScrollDirection(x, y);
        this._tempScrollDirection = this._scrollDirection;
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

        var convertp = this._content.convertToNodeSpaceAR(p);
        for (var key in this._content.children) {
            if (this.Type == Type.GRID) {
                var cell = this._content.children[key];
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
                var box = this._content.children[key].getBoundingBox();
                if (box.contains(convertp)) {
                    this._content.children[key].clicked();
                    return;
                }
            }
        }
    },

    //移动距离小于7点则不翻页
    _pageMove: function (event) {
        var x = this._view.width;
        var y = this._view.height;

        if (this.viewType == viewType.pageView) {
            if (this._scrollView.horizontal) {
                y = 0;
                if (Math.abs(event.getLocation().x - event.getStartLocation().x) > 100) {
                    if (this._scrollDirection == scrollDirection.Left) {
                        if (this._page < this._pageTotal) {
                            this._changePageNum(1);
                        }
                    } else if (this._scrollDirection == scrollDirection.Rigth) {
                        if (this._page > 1) {
                            this._changePageNum(-1);
                        }
                    }
                }
            } else {
                x = 0;
                if (Math.abs(event.getLocation().y - event.getStartLocation().y) > 100) {
                    if (this._scrollDirection == scrollDirection.Up) {
                        if (this._page < this._pageTotal) {
                            this._changePageNum(1);
                        }
                    } else if (this._scrollDirection == scrollDirection.Down) {
                        if (this._page > 1) {
                            this._changePageNum(-1);
                        }
                    }
                }
            }

            x = (this._page - 1) * x;
            y = (this._page - 1) * y;

            //防止page回滚出现问题
            var offset = this._scrollView.getScrollOffset();
            if (this._scrollView.horizontal) {
                if (this._scrollDirection == scrollDirection.Left) {
                    if (-offset.x > x) {
                        this._tempScrollDirection = scrollDirection.Rigth;
                    }
                } else if (this._scrollDirection == scrollDirection.Rigth) {
                    if (-offset.x < x) {
                        this._tempScrollDirection = scrollDirection.Left;
                    }
                }
            } else {
                if (this._scrollDirection == scrollDirection.Up) {
                    if (-offset.y > y) {
                        this._tempScrollDirection = scrollDirection.Down;
                    }
                } else if (this._scrollDirection == scrollDirection.Down) {
                    if (-offset.y < y) {
                        this._tempScrollDirection = scrollDirection.Up;
                    }
                }
            }

            this._scrollDirection = this._tempScrollDirection;
            var maxoffset = this._scrollView.getMaxScrollOffset();
            if (!(-offset.x <= 0 && -offset.y <= 0) && !(-offset.x >= maxoffset.x && -offset.y >= maxoffset.y)) {
                this._scrollView.scrollToOffset({ x: x, y: y }, 0.3);
            }
        }
    },
    _getBoundingBoxToWorld: function (node) {
        var p = node.convertToWorldSpaceAR(cc.v2(-node.width * node.anchorX, -node.height * node.anchorY));
        return cc.rect(p.x, p.y, node.width, node.height);
    },
    _updateCells: function () {
        if (this._scrollView.horizontal) {
            if (this._scrollDirection == scrollDirection.Left) {
                if (this._maxCellIndex < this._count - 1) {
                    do {
                        var node = this._content.getChildByTag(this._minCellIndex);

                        var nodeBox = this._getBoundingBoxToWorld(node);
                        var viewBox = this._getBoundingBoxToWorld(this._view);

                        if (nodeBox.xMax <= viewBox.xMin) {

                            node.x = this._content.getChildByTag(this._maxCellIndex).x + node.width + this.Spacing;
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

            } else if (this._scrollDirection == scrollDirection.Rigth) {
                if (this._minCellIndex > 0) {
                    do {
                        var node = this._content.getChildByTag(this._maxCellIndex);

                        var nodeBox = this._getBoundingBoxToWorld(node);
                        var viewBox = this._getBoundingBoxToWorld(this._view);

                        if (nodeBox.xMin >= viewBox.xMax) {
                            node.x = this._content.getChildByTag(this._minCellIndex).x - node.width - this.Spacing;
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
            if (this._scrollDirection == scrollDirection.Up) {
                if (this._maxCellIndex < this._count - 1) {
                    do {
                        var node = this._content.getChildByTag(this._minCellIndex);

                        var nodeBox = this._getBoundingBoxToWorld(node);
                        var viewBox = this._getBoundingBoxToWorld(this._view);

                        if (nodeBox.yMin >= viewBox.yMax) {
                            node.y = this._content.getChildByTag(this._maxCellIndex).y - node.height - this.Spacing;
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
            } else if (this._scrollDirection == scrollDirection.Down) {
                if (this._minCellIndex > 0) {
                    do {
                        var node = this._content.getChildByTag(this._maxCellIndex);

                        var nodeBox = this._getBoundingBoxToWorld(node);
                        var viewBox = this._getBoundingBoxToWorld(this._view);

                        if (nodeBox.yMax <= viewBox.yMin) {
                            node.y = this._content.getChildByTag(this._minCellIndex).y + node.height + this.Spacing;
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
            } else {
                //this._scrollDirection == scrollDirection.None
            }
        }
    },
    _getScrollDirection: function (x, y) {
        if (x < 0) {
            this._scrollDirection = scrollDirection.Left;
        } else if (x > 0) {
            this._scrollDirection = scrollDirection.Rigth;
        }

        if (y < 0) {
            this._scrollDirection = scrollDirection.Down;
        } else if (y > 0) {
            this._scrollDirection = scrollDirection.Up;
        }
    },
    _scrollEvent: function (a, b) {
        if (b == cc.ScrollView.EventType.AUTOSCROLL_ENDED) {
            this._scrollDirection = scrollDirection.None;
        }
    },

    // called every frame, uncomment this function to activate update callback
    update: function (dt) {
        if (!this._initSuccess || this._pageTotal == 1) {
            return;
        }

        this._updateCells();
    },
});