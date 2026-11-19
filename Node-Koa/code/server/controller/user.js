const User = require('../models/user');
const { Op } = require('sequelize');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');

// 查询全部用户
const listAll = async (ctx) => {
    const page = Math.max(parseInt(ctx.query.page) || 1, 1);
    // 每页条数限制在 1~100，避免 ?pagesize=999999 一次性把整表拉出来
    const pagesize = Math.min(Math.max(parseInt(ctx.query.pagesize) || 10, 1), 100);
    const name = ctx.query.name || '';

    // 计算偏移量
    const offset = (page - 1) * pagesize;
    // 分页查询
    const result = await User.findAndCountAll({
        where: name ? { name: { [Op.like]: `%${name}%` } } : undefined,
        offset,
        limit: pagesize,
        order: [['createdAt', 'ASC']]
    });
    success(ctx, {
        list: result.rows,
        count: result.count,
        page,
        pagesize
    })
};


// 新增用户
// 兼容两种调用：
//   GET  /users/add          —— 视频写死的测试数据
//   POST /users/add  { name, age, sexlabel, birth, addr }
const create = async (ctx) => {
    const params = ctx.request.body || {};

    await User.create(params);

    success(ctx, "创建成功")
};

// 编辑用户
// POST /users/edit  { id, name, age, sexlabel, birth, addr }
const update = async (ctx) => {
    // 从 URL 路径里拿 id (ctx.params)
    const id = Number(ctx.params.id);  
    // Body 里只拿需要修改的字段
    const fields = ctx.request.body;

    const [updated] = await User.update(fields, { where: { id } });
    if (!updated) {
        throw new AppError('用户不存在', 404, 10002);
    }

   success(ctx, '修改成功');
};

// 删除用户
// GET /users/delete?id=1
const remove = async (ctx) => {
    // 从 URL 路径里拿 id
    const id = Number(ctx.params.id);  
   
    const deleted = await User.destroy({ where: { id } });
    if (!deleted) {
        throw new AppError('用户不存在', 404, 10002);
    }
    
    success(ctx, '删除成功');
};

module.exports = {
  listAll,
  create,
  update,
  remove
};
