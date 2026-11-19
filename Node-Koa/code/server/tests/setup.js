// 直接引入项目根目录下的 iconv-lite，而不是指定 mysql2 内部的路径
require('iconv-lite').encodingExists('foo');