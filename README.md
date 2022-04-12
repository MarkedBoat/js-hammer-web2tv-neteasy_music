# js-hammer-web2tv-neteasy_music

### 项目为移植过来，原本是适配多网站，现在将 网易云音乐 单独择出来

### 文件说明：
js/tampermonkey/_release/singly/music.163.com/dst/index.js
最终生成的js，可以直接用于 tampermonky 

源文件目录：
js/tampermonkey/_release/singly/music.163.com/src

其中:

index.js 负责和tampermonkey，和其它js的引用

common.js 存放公共方法

layout.js 用于提供基础布局

content_provider.js 用于 具体网站的业务处理，当前文件是处理网易云音乐的


//@include:hammer/kl-hammer.js  是基础工具类

//@include:hammer/tv/grid.js    提供电视页面数据展示的工具类，如将歌曲列表展示为一个网格，提供数据选择、翻页等


# 功能演示

https://www.youtube.com/watch?v=puAGj_NXKlM
https://www.bilibili.com/video/BV1444y1V7qN/
