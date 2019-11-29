# tableView

web : 线上未测试。</br>
native ：线上未测试。</br>

# 优缺点
## 缺点
```
1、如果需要使用大量label、外部图片，仍需要自己做特殊处理(比如合并label等)，否则因DC过高引起的卡顿不可避免
2、[小缺点] 现在不支持并且以后也不支持多行多列模式，用户可以使用单行单列模式模拟多行多列(在实际项目中发现，多行多列模式起到的作用非常有限，不光是没有单行单列灵活，而且还极大的增加了tableView本身的代码复杂度)
```
## 优点
```
1、显示大量cell时节省内存及cpu
2、减少节点过多时导致的发热问题
3、在同一帧进行多次insert、remove性能良好
```

# API
## ``` cell:```
cell的静态方法
```
@parma index Number cell的排序下标
@return Number cell的宽或高
static getSize(index) ;
```
cell的实例方法
```
// cell的初始化方法，tableView创建cell时会调用此方法
@parma index Number cell的排序下标
@parma data 自定义 初始化tableView时传入的data
init(index, data) ;

// 调用tableView.reload会触发
reload(data) ;

// 被卸载时触发
uninit() ;
```

## ```tableView:```
// tableView的初始化方法
```
@parma count Number cell的总个数
@parma data 自定义 此data会作为初始化cell时的第二个参数
init (count, data)
```

// 清空回收当前tableView
```
clear()
```

// 刷新cell
```
reload(start, data) ;
```

// 插入cell
```
insert(start, num, data) ;
```

// 删除cell
```
remove(start, num, data) ;
```

// scrollview中原有方法
```
scrollToBottom(timeInSecond, attenuated)
scrollToTop(timeInSecond, attenuated)
scrollToLeft(timeInSecond, attenuated)
scrollToRight(timeInSecond, attenuated)
scrollToOffset(offset, timeInSecond, attenuated)
getScrollOffset()
getMaxScrollOffset() 
```

# 具体查看本示例