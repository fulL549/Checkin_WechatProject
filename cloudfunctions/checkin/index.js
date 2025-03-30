const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

// 云函数入口函数
exports.main = async (event, context) => {
  const { type, data, rankingType = 'all', taskId, date, recordId, page = 1, pageSize = 10 } = event
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID

  switch (type) {
    case 'submit':
      return submitCheckin(data, openId)
    case 'ranking':
      return getRanking(rankingType)
    case 'userStats':
      return getUserStats(openId)
    case 'checkStatus':
      return checkCheckinStatus(taskId, date, openId)
    case 'getRecord':
      return getCheckinRecord(recordId, openId)
    case 'userHistory':
      return getUserHistory(openId, page, pageSize)
    case 'getMemberCheckins':
      return getMemberCheckins(event)
    default:
      return {
        code: 400,
        message: '未知的操作类型'
      }
  }
}

// 提交打卡
async function submitCheckin(data, openId) {
  try {
    // 使用客户端传入的openId或从上下文获取的openId
    const userOpenId = data.userInfo?.openId || openId

    // 检查是否已经打卡
    const existingCheckin = await db.collection('checkins')
      .where({
        openId: userOpenId,
        date: data.date,
        taskId: data.taskId
      })
      .get()

    if (existingCheckin.data.length > 0) {
      return {
        code: 400,
        message: '今日已完成此任务打卡'
      }
    }

    // 表单验证
    if (!data.content) {
      return {
        code: 400,
        message: '打卡内容不能为空'
      }
    }

    if (!data.training) {
      return {
        code: 400,
        message: '训练内容不能为空'
      }
    }

    if (!data.remark) {
      return {
        code: 400,
        message: '备注不能为空'
      }
    }

    // 创建打卡记录
    const checkinData = {
      taskId: data.taskId,
      openId: userOpenId,
      content: data.content,
      training: data.training,
      remark: data.remark,
      date: data.date,
      userInfo: data.userInfo || {
        openId: userOpenId
      },
      createTime: db.serverDate()
    }

    const result = await db.collection('checkins').add({
      data: checkinData
    })

    // 更新任务参与者打卡计数
    await db.collection('tasks').doc(data.taskId).update({
      data: {
        completedCount: _.inc(1),
        updateTime: db.serverDate()
      }
    })

    return {
      code: 0,
      data: {
        _id: result._id,
        ...checkinData
      },
      message: '打卡成功'
    }
  } catch (err) {
    console.error('打卡失败：', err)
    return {
      code: 500,
      message: '打卡失败：' + err.message
    }
  }
}

// 获取排行榜
async function getRanking(rankingType) {
  try {
    let query = db.collection('checkins')
    
    // 根据类型筛选
    if (rankingType === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      query = query.where({
        createTime: _.gte(today)
      })
    } else if (rankingType === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      query = query.where({
        createTime: _.gte(weekAgo)
      })
    }

    // 聚合查询
    const result = await query
      .aggregate()
      .group({
        _id: '$openId',
        count: $.sum(1)
      })
      .sort({
        count: -1
      })
      .limit(100)
      .end()

    // 获取用户信息
    const openIds = result.list.map(item => item._id)
    
    // 注意：users集合中使用_openid，而checkins集合中使用openId
    const users = await db.collection('users')
      .where({
        _openid: _.in(openIds)
      })
      .get()

    // 合并用户信息
    const rankingList = result.list.map(item => {
      const user = users.data.find(u => u._openid === item._id)
      return {
        _openid: item._id,
        nickName: user ? user.nickName : '未知用户',
        avatarUrl: user ? user.avatarUrl : '',
        checkInCount: item.count
      }
    })

    console.log('排行榜数据处理完成', rankingList.length, '条记录')

    return {
      code: 0,
      data: {
        list: rankingList
      },
      message: '获取成功'
    }
  } catch (err) {
    console.error('获取排行榜失败：', err)
    // 返回详细错误信息以便调试
    return {
      code: 500,
      message: '获取排行榜失败：' + err.message,
      stack: err.stack
    }
  }
}

// 获取用户统计数据
async function getUserStats(openId) {
  try {
    // 如果openId为空，直接返回默认数据
    if (!openId) {
      console.log('OpenID为空，返回默认数据')
      return {
        code: 0,
        data: {
          totalCheckins: 0,
          rank: '未上榜',
          recentCheckins: []
        },
        message: '获取成功(默认数据)'
      }
    }
    
    console.log('获取用户统计数据, openId:', openId)
    
    // 获取用户打卡总数
    let totalCount = { total: 0 }
    try {
      totalCount = await db.collection('checkins')
        .where({ openId })
        .count()
    } catch (countErr) {
      console.error('获取打卡总数失败:', countErr)
    }
    
    // 获取用户排名
    let rank = '未上榜'
    try {
      const rankResult = await db.collection('checkins')
        .aggregate()
        .group({
          _id: '$openId',
          count: $.sum(1)
        })
        .sort({
          count: -1
        })
        .end()
      
      // 计算排名
      rankResult.list.forEach((item, index) => {
        if (item._id === openId) {
          rank = index + 1
        }
      })
    } catch (rankErr) {
      console.error('获取排名失败:', rankErr)
    }
    
    // 获取最近打卡记录
    let recentCheckins = []
    try {
      const recentResult = await db.collection('checkins')
        .where({ openId })
        .orderBy('createTime', 'desc')
        .limit(5)
        .get()
      
      recentCheckins = recentResult.data || []
    } catch (recentErr) {
      console.error('获取最近打卡记录失败:', recentErr)
    }
    
    return {
      code: 0,
      data: {
        totalCheckins: totalCount.total || 0,
        rank: rank,
        recentCheckins: recentCheckins
      },
      message: '获取成功'
    }
  } catch (err) {
    console.error('获取用户统计数据失败：', err)
    // 出错时返回默认数据而不是错误
    return {
      code: 0,
      data: {
        totalCheckins: 0,
        rank: '未上榜',
        recentCheckins: []
      },
      message: '获取成功(默认)'
    }
  }
}

// 检查打卡状态
async function checkCheckinStatus(taskId, date, openId) {
  if (!taskId || !date || !openId) {
    return {
      code: 400,
      message: '参数不完整'
    }
  }

  try {
    // 查询用户当天是否对该任务打卡
    const checkinResult = await db.collection('checkins')
      .where({
        taskId: taskId,
        openId: openId,
        date: date
      })
      .get()

    const hasCheckedIn = checkinResult.data.length > 0
    const record = hasCheckedIn ? checkinResult.data[0] : null

    return {
      code: 0,
      data: {
        hasCheckedIn,
        record
      },
      message: '获取成功'
    }
  } catch (err) {
    console.error('检查打卡状态失败：', err)
    return {
      code: 500,
      message: '检查打卡状态失败：' + err.message
    }
  }
}

// 获取打卡记录详情
async function getCheckinRecord(recordId, openId) {
  if (!recordId) {
    return {
      code: 400,
      message: '记录ID不能为空'
    }
  }

  try {
    // 查询打卡记录详情
    const record = await db.collection('checkins').doc(recordId).get()
    
    if (!record.data) {
      return {
        code: 404,
        message: '未找到打卡记录'
      }
    }
    
    // 验证权限（仅本人或管理员可查看）
    if (record.data.openId !== openId && !isAdmin(openId)) {
      return {
        code: 403,
        message: '无权限查看该记录'
      }
    }
    
    return {
      code: 0,
      data: record.data,
      message: '获取成功'
    }
  } catch (err) {
    console.error('获取打卡记录失败：', err)
    return {
      code: 500,
      message: '获取打卡记录失败：' + err.message
    }
  }
}

// 判断是否为管理员（可根据实际需求实现）
function isAdmin(openId) {
  // 这里可以实现判断管理员的逻辑
  // 例如从数据库中查询该用户是否有管理员权限
  return false
}

// 获取用户打卡历史 - 保留完整任务ID信息
async function getUserHistory(openId, page = 1, pageSize = 10) {
  if (!openId) {
    console.log('获取历史记录：用户ID为空');
    return {
      code: 400,
      message: '用户ID不能为空'
    }
  }

  console.log(`获取用户打卡历史, openId: ${openId}, page: ${page}, pageSize: ${pageSize}`);
  const skip = (page - 1) * pageSize;

  try {
    // 直接获取打卡记录
    const historiesResult = await db.collection('checkins')
      .where({ openId })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();
    
    const histories = historiesResult.data || [];
    console.log(`获取到${histories.length}条打卡记录`);
    
    // 处理并返回完整数据，保留taskId和其他必要字段
    const formattedList = histories.map(history => {
      let dateStr = '未知日期';
      let timeStr = '未知时间';
      
      try {
        if (history.createTime) {
          const date = new Date(history.createTime);
          dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        } else if (history.date) {
          dateStr = history.date;
        }
      } catch (e) {
        console.error('日期格式化错误:', e);
      }
      
      // 保留原始记录的所有字段，但添加格式化的时间和默认任务标题
      return {
        ...history,
        date: dateStr,
        createTimeFormat: `${dateStr} ${timeStr}`,
        taskTitle: history.taskTitle || '打卡任务' // 保留原有标题或使用默认值
      };
    });
    
    // 获取总数
    let total = 0;
    try {
      const countResult = await db.collection('checkins')
        .where({ openId })
        .count();
      total = countResult.total || 0;
    } catch (err) {
      console.error('获取总数失败:', err);
      total = histories.length + skip;
    }
    
    return {
      code: 0,
      data: {
        list: formattedList,
        total: total,
        page,
        pageSize,
        hasMore: histories.length >= pageSize
      },
      message: '获取成功'
    };
  } catch (err) {
    console.error('获取用户打卡历史失败:', err);
    console.error('错误详情:', err.stack);
    
    return {
      code: 0,
      data: {
        list: [],
        total: 0,
        page,
        pageSize,
        hasMore: false
      },
      message: '暂无数据'
    };
  }
}

// 获取特定队员的打卡记录（仅队长可调用）
async function getMemberCheckins(event) {
  try {
    const { userId, startDate } = event
    if (!userId) {
      return {
        code: -1,
        message: '缺少必要参数'
      }
    }

    // 查询条件使用openId，保持与数据库一致
    let query = {}
    
    // 根据数据库中可能使用的字段进行兼容性查询
    if (startDate) {
      query = {
        $or: [
          { openId: userId, createTime: _.gte(new Date(startDate)) },
          { _openid: userId, createTime: _.gte(new Date(startDate)) }
        ]
      }
    } else {
      query = {
        $or: [
          { openId: userId },
          { _openid: userId }
        ]
      }
    }

    // 查询打卡记录
    const checkins = await db.collection('checkins')
      .where(query)
      .orderBy('createTime', 'desc')
      .get()

    console.log(`查询到用户${userId}的打卡记录:`, checkins.data.length, '条')

    // 查询统计信息
    const stats = await calculateCheckinStats(userId)

    return {
      code: 0,
      data: checkins.data,
      stats,
      message: '获取打卡记录成功'
    }
  } catch (err) {
    console.error('获取打卡记录失败', err)
    return {
      code: -1,
      message: '获取打卡记录失败: ' + err.message
    }
  }
}

// 计算用户打卡统计信息（总次数和连续次数）
async function calculateCheckinStats(userId) {
  try {
    // 使用兼容性查询计算总打卡次数
    const total = await db.collection('checkins')
      .where({
        $or: [
          { openId: userId },
          { _openid: userId }
        ]
      })
      .count()

    // 计算连续打卡次数
    const continuousCount = await calculateContinuousCheckins(userId)

    return {
      totalCount: total.total,
      continuousCount
    }
  } catch (err) {
    console.error('计算打卡统计失败', err)
    return {
      totalCount: 0,
      continuousCount: 0
    }
  }
}

// 计算连续打卡次数
async function calculateContinuousCheckins(userId) {
  try {
    // 获取用户所有打卡记录，按时间降序排序
    const checkins = await db.collection('checkins')
      .where({
        $or: [
          { openId: userId },
          { _openid: userId }
        ]
      })
      .orderBy('createTime', 'desc')
      .get()

    if (checkins.data.length === 0) {
      return 0
    }

    const records = checkins.data

    // 初始化变量
    let continuousCount = 1
    let lastDate = new Date(records[0].createTime)
    lastDate.setHours(0, 0, 0, 0) // 只保留日期部分

    // 遍历打卡记录，检查是否连续
    for (let i = 1; i < records.length; i++) {
      const currentDate = new Date(records[i].createTime)
      currentDate.setHours(0, 0, 0, 0)

      // 计算日期差，检查是否是前一天的打卡
      const diffDays = Math.floor((lastDate - currentDate) / (24 * 60 * 60 * 1000))

      if (diffDays === 1) {
        // 连续打卡
        continuousCount++
        lastDate = currentDate
      } else if (diffDays === 0) {
        // 同一天的多次打卡，不增加连续天数，但更新日期
        lastDate = currentDate
      } else {
        // 不连续，退出循环
        break
      }
    }

    return continuousCount
  } catch (err) {
    console.error('计算连续打卡失败', err)
    return 0
  }
} 