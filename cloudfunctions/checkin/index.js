const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

// 云函数入口函数
exports.main = async (event, context) => {
  const { type, data, rankingType = 'all', taskId, date, recordId, page = 1, pageSize = 10, userId } = event
  const wxContext = cloud.getWXContext()

  switch (type) {
    case 'submit':
      return submitCheckin(data, userId)
    case 'ranking':
      return getRanking(rankingType)
    case 'userStats':
      return getUserStats(userId)
    case 'checkStatus':
      return checkCheckinStatus(taskId, date, userId)
    case 'getRecord':
      return getCheckinRecord(recordId, userId)
    case 'userHistory':
      return getUserHistory(userId, page, pageSize)
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
async function submitCheckin(data, userId) {
  try {
    // 使用传入的userId参数
    if (!userId) {
      return {
        code: 403,
        message: '用户未登录'
      }
    }

    // 检查是否已经打卡
    const existingCheckin = await db.collection('checkins')
      .where({
        userId: userId,
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

    // 获取打卡任务信息，用于判断打卡类型
    const taskInfo = await db.collection('tasks').doc(data.taskId).get()
    const isTrainingCheckin = taskInfo.data && taskInfo.data.checkinType && 
      (taskInfo.data.checkinType.includes('集训上午') || taskInfo.data.checkinType.includes('集训下午'))

    // 表单验证 - 根据打卡类型执行不同的验证
    if (isTrainingCheckin) {
      // 集训打卡验证
      if (!data.trainingContent && !data.content) {
        return {
          code: 400,
          message: '训练内容不能为空'
        }
      }
    } else {
      // 非集训打卡验证 - 检查是否有训练动作数据
      if (!data.exercises && !data.content) {
        return {
          code: 400,
          message: '训练内容不能为空'
        }
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
      userId: userId,
      // 兼容旧版字段
      content: data.content || '',
      training: data.training || '',
      // 新增字段
      trainingContent: data.trainingContent || data.content || '',
      exercises: data.exercises || [], // 训练动作数组
      remark: data.remark,
      date: data.date,
      userInfo: data.userInfo,
      createTime: db.serverDate()
    }

    // 如果有图片信息，添加到记录中
    if (data.fileID) {
      checkinData.fileID = data.fileID
    }
    if (data.imageUrl) {
      checkinData.imageUrl = data.imageUrl
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
        _id: '$userId',
        count: $.sum(1)
      })
      .sort({
        count: -1
      })
      .limit(100)
      .end()

    // 获取用户信息
    const userIds = result.list.map(item => item._id)
    
    // 使用_id查询用户
    const users = await db.collection('users')
      .where({
        _id: _.in(userIds)
      })
      .get()

    // 合并用户信息
    const rankingList = result.list.map(item => {
      const user = users.data.find(u => u._id === item._id)
      return {
        userId: item._id,
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
async function getUserStats(userId) {
  try {
    // 如果userId为空，直接返回默认数据
    if (!userId) {
      console.log('用户ID为空，返回默认数据')
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
    
    console.log('获取用户统计数据, userId:', userId)
    
    // 获取用户打卡总数
    let totalCount = { total: 0 }
    try {
      totalCount = await db.collection('checkins')
        .where({ userId })
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
          _id: '$userId',
          count: $.sum(1)
        })
        .sort({
          count: -1
        })
        .end()
      
      // 计算排名
      rankResult.list.forEach((item, index) => {
        if (item._id === userId) {
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
        .where({ userId })
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
async function checkCheckinStatus(taskId, date, userId) {
  if (!taskId || !date || !userId) {
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
        userId: userId,
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
async function getCheckinRecord(recordId, userId) {
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
    if (record.data.userId !== userId && !isAdmin(userId)) {
      return {
        code: 403,
        message: '无权限查看该记录'
      }
    }
    
    // 如果是新格式数据，确保所有需要的字段都存在
    const checkinData = { ...record.data }
    
    // 确保exercises字段存在
    if (!checkinData.exercises) {
      checkinData.exercises = []
      
      // 尝试从content字段解析exercises数据
      if (checkinData.content) {
        try {
          // 尝试解析JSON
          const exercises = JSON.parse(checkinData.content)
          if (exercises && Array.isArray(exercises)) {
            checkinData.exercises = exercises
          } else {
            // 如果不是数组，创建简单的训练动作数据
            checkinData.exercises = [
              { name: '训练动作', content: checkinData.content || '' },
              { name: '附加训练', content: checkinData.training || '' }
            ]
          }
        } catch (e) {
          // 解析失败，创建简单的训练动作数据
          checkinData.exercises = [
            { name: '训练动作', content: checkinData.content || '' },
            { name: '附加训练', content: checkinData.training || '' }
          ]
        }
      }
    }
    
    // 确保trainingContent字段存在
    if (!checkinData.trainingContent) {
      checkinData.trainingContent = checkinData.training || checkinData.content || ''
    }
    
    return {
      code: 0,
      data: checkinData,
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
function isAdmin(userId) {
  // 这里可以实现判断管理员的逻辑
  // 例如从数据库中查询该用户是否有管理员权限
  return false
}

// 获取用户打卡历史
async function getUserHistory(userId, page = 1, pageSize = 10) {
  if (!userId) {
    console.log('获取历史记录：用户ID为空');
    return {
      code: 400,
      message: '用户ID不能为空'
    }
  }

  console.log(`获取用户打卡历史, userId: ${userId}, page: ${page}, pageSize: ${pageSize}`);
  const skip = (page - 1) * pageSize;

  try {
    // 获取打卡记录
    const historiesResult = await db.collection('checkins')
      .where({ userId })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();
    
    const histories = historiesResult.data || [];
    console.log(`获取到${histories.length}条打卡记录`);
    
    // 处理并返回完整数据
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

      // 处理打卡内容，确保新旧格式兼容
      let contentSummary = '';
      
      // 判断是否是集训打卡（使用trainingContent字段或checkinType字段）
      const isTrainingCheckin = history.trainingContent || 
        (history.taskInfo && history.taskInfo.checkinType && 
         (history.taskInfo.checkinType.includes('集训上午') || 
          history.taskInfo.checkinType.includes('集训下午')));
      
      if (isTrainingCheckin) {
        // 集训打卡，使用trainingContent或旧字段
        contentSummary = history.trainingContent || history.training || history.content || '无内容';
      } else {
        // 非集训打卡，检查exercises数组
        if (history.exercises && Array.isArray(history.exercises) && history.exercises.length > 0) {
          // 使用前三个训练动作的名称
          const exerciseNames = history.exercises
            .slice(0, 3)
            .filter(ex => ex && ex.name)
            .map(ex => ex.name);
          
          contentSummary = exerciseNames.join('、') || '训练动作';
        } else if (history.content) {
          // 尝试解析content字段
          try {
            const exercises = JSON.parse(history.content);
            if (exercises && Array.isArray(exercises) && exercises.length > 0) {
              const exerciseNames = exercises
                .slice(0, 3)
                .filter(ex => ex && ex.name)
                .map(ex => ex.name);
              
              contentSummary = exerciseNames.join('、') || '训练动作';
            } else {
              // 无法解析为数组，使用原始内容
              contentSummary = history.content.substring(0, 20) + (history.content.length > 20 ? '...' : '');
            }
          } catch (e) {
            // 解析失败，使用原始内容
            contentSummary = history.content.substring(0, 20) + (history.content.length > 20 ? '...' : '');
          }
        } else {
          contentSummary = '无训练内容';
        }
      }
      
      return {
        ...history,
        date: dateStr,
        createTimeFormat: `${dateStr} ${timeStr}`,
        taskTitle: history.taskTitle || '打卡任务',
        contentSummary: contentSummary // 添加内容摘要
      };
    });
    
    // 获取总数
    let total = 0;
    try {
      const countResult = await db.collection('checkins')
        .where({ userId })
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

    // 使用userId查询
    let query = {}
    
    if (startDate) {
      query = {
        userId: userId,
        createTime: _.gte(new Date(startDate))
      }
    } else {
      query = {
        userId: userId
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
    // 使用userId查询
    const total = await db.collection('checkins')
      .where({ userId })
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
      .where({ userId })
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