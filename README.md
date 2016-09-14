# tableView pageView
作者：zp

initTableView- 初始化tableView，在tableView下
initTableView (count, data) ;
    count:cell的总个数
    data:要向cell传递的数据

init- 初始化cell，在viewCell下
init(index, data) ;
    index:cell的排序下标
    data:向cell传递过来的数据

scrollToPage- 视图滚动到指定页，方法在tableView和cc.ScrollView下都有
scrollToPage(page) ;
    page:哪一页

可以使用cc.ScrollView中的scrollToXXX方法

使用：
将tableView预制添加到场景中，根据需求调整大小
编辑自己的预制cell，脚本必须继承自viewCell并必须重写init方法，init方法有两个参数，第一个参数是节点排序下标，第二个参数是初始化tableView时你传入的数据。可以重写clicked方法，无参数，被点击时调用。
将预制拖动到tableView的Cell栏中，横向纵向滚动、惯性滑动等在ScrollView下调整，ViewType和Type等属性在tableView中调整
通过外部脚本调用tableView中的initTableView方法对其进行初始化，第一个参数是有多少cell，第二个参数是会传递给cell的数据(可以为空) 
*    ViewType为tableView时，滚动列表表现与scrollview一致，但却会复用节点，提高性能
*    ViewType为pageView时，在tableView的基础上使滚动列表表现为翻页效果
*    Type为NONE时，根据滚动方向单行或单列展示排列cell，位置居中
*    Type为GRID时，会根据view的宽或高去匹配显示多少行多少列
*    Direction，仅当viewType为pageView时有效，规定cell的排列方向
*    isFill，当节点不能铺满一个页时，选择isFill为true会填充节点铺满整个view


比如：cell的大小规定为20x20，想5x5的显示出来，并且是横向page滑动，cell从左到右从上到下排列
那么tableView的大小就应该是100*100，并且选择ViewType为pageView，Type为GRID模式，Direction为LEFT_TO_RIGHT__TOP_TO_BOTTOM，同时scrollview中的horizontal选中
