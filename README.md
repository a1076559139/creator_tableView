# tableView

# 缺点
```
1、不支持动态添加删除cell
```
# 优点
```
1、显示大量cell时节省内存及cpu
```

# cell:
//cell的初始化方法，tableView创建cell时会调用此方法
```
@parma index Number cell的排序下标
@parma data 自定义 初始化tableView时传入的data
init(index, data) ;
```

# tableView:
 //tableView的静态方法
```
require('tableView').reload();//刷新当前有效的所有tableView
require('tableView').clear();//清空回收当前有效的所有tableView
```

 //tableView的实例方法
 //tableView的初始化方法
```
@parma count Number cell的总个数
@parma data 自定义 此data会作为初始化cell时的第二个参数
initTableView (count, data)
```

 //清空回收当前tableView
```
clear()
```

//获得初始初始化tableView时传递的数据
```
getData()
```

//获得目前正在展示的所有cell,将以数组的形式作为回掉的参数传递
```
@parma callback function 
getCells(callback)
```

//获得目前正在展示的行或列范围,将以数组的形式作为回掉的参数传递
```
@parma callback function 
getGroupsRange(callback)
```

//翻页到某一页
```
@parma page Number 哪一页
scrollToPage(page)
```

//翻页至下一页
```
scrollToNextPage()
```

//翻页至上一页
```
scrollToLastPage()
```

//添加滚动回调
```
@parma target cc.Node    目标节点
@parma component string  组件
@parma handler string    方法名
addScrollEvent(target, component, handler)
```

//删除滚动回调
```
removeScrollEvent(target, component, handler)
```

//清空滚动回调列表
```
clearScrollEvent()
```

//添加翻页回调
```
addPageEvent(target, component, handler)
```

//删除翻页回调
```
removePageEvent(target, component, handler)
```

//清空翻页回调列表
```
clearPageEvent()
```

//scrollview中原有方法,scrollview中的其它方法不可用
```
scrollToBottom(timeInSecond, attenuated)
scrollToTop(timeInSecond, attenuated)
scrollToLeft(timeInSecond, attenuated)
scrollToRight(timeInSecond, attenuated)
scrollToOffset(offset, timeInSecond, attenuated)
getScrollOffset()
getMaxScrollOffset() 
```

使用：
```
将tableView预制添加到场景中，根据需求调整大小
编辑自己的预制cell，脚本必须继承自viewCell并必须重写init方法，init方法有两个参数，第一个参数是节点排序下标，第二个参数是初始化tableView时你传入的数据。可以重写clicked方法，无参数，被点击时调用。
将预制拖动到tableView的Cell栏中，横向纵向滚动、惯性滑动等在ScrollView下调整，ViewType和Type等属性在tableView中调整
通过外部脚本调用tableView中的initTableView方法对其进行初始化，第一个参数是有多少cell，第二个参数是会传递给cell的数据(可以为空) 
*    ViewType为scroll时，滚动列表表现与scrollview一致，但却会复用节点，提高性能
*    ViewType为single时，在scroll的基础上使cell在滑动方向上不会出现半个
*    ViewType为flip时，在scroll的基础上使滚动列表表现为翻页效果
*    Direction，规定cell的排列方向
*    isFill，当节点不能铺满一个页时，选择isFill为true会填充节点铺满整个view

比如：cell的大小规定为20x20，想5x5的显示出来，并且是横向翻页滑动，cell从左到右从上到下排列
那么tableView中content的大小就应该是100*100，tableView所在节点的height应该是100，其它(大小、锚点、位置)任意，并且选择ViewType为flip，Direction为LEFT_TO_RIGHT__TOP_TO_BOTTOM
在脚本中获取到tableView，并调用initTableView方法
```

# 具体查看本示例