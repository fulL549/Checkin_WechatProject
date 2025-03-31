const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { type, data, page = 1, pageSize = 10, taskId, userId } = event
  const wxContext = cloud.getWXContext()

  switch (type) {
    case 'create':
      return createTask(data, userId)
    case 'list':
      return getTaskList(page, pageSize)
    case 'detail':
      return getTaskDetail(taskId)
    case 'join':
      return joinTask(taskId, userId)
    case 'getAll':
      return getAllTasks()
    case 'update':
      return updateTask(data, userId)
    case 'delete':
      return deleteTask(taskId, userId)
    default:
      return {
        code: 400,
        message: '未知的操作类型'
      }
  }
}

// 创建任务
async function createTask(data, userId) {
  if (!userId) {
    return {
      code: 403,
      message: '用户未登录'
    }
  }

  try {
    // 确保创建者ID与当前用户一致
    if (data.createdBy !== userId) {
      data.createdBy = userId
    }

    const result = await db.collection('tasks').add({
      data: {
        ...data,
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        status: 'active',
        participants: [],
        completedCount: 0
      }
    })

    // 记录任务创建日志
    await db.collection('activity_logs').add({
      data: {
        type: 'task_create',
        userId: userId,
        taskId: result._id,
        taskTitle: data.title,
        timestamp: db.serverDate()
      }
    })

    return {
      code: 0,
      data: result._id,
      message: '创建成功'
    }
  } catch (err) {
    console.error('创建任务失败：', err)
    return {
      code: 500,
      message: '创建任务失败：' + err.message
    }
  }
}

// 获取任务列表
async function getTaskList(page, pageSize) {
  try {
    const skip = (page - 1) * pageSize
    
    // 只获取活跃状态的任务
    const result = await db.collection('tasks')
      .where({
        status: 'active'
      })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()
    
    const total = await db.collection('tasks')
      .where({ status: 'active' })
      .count()
    
    return {
      code: 0,
      data: {
        list: result.data,
        total: total.total,
        page,
        pageSize
      },
      message: '获取成功'
    }
  } catch (err) {
    console.error('获取任务列表失败：', err)
    return {
      code: 500,
      message: '获取任务列表失败：' + err.message
    }
  }
}

// 获取任务详情
async function getTaskDetail(taskId) {
  if (!taskId) {
    return {
      code: 400,
      message: '任务ID不能为空'
    }
  }

  try {
    const task = await db.collection('tasks').doc(taskId).get()
    
    if (!task.data) {
      return {
        code: 404,
        message: '任务不存在'
      }
    }
    
    return {
      code: 0,
      data: task.data,
      message: '获取成功'
    }
  } catch (err) {
    console.error('获取任务详情失败：', err)
    return {
      code: 500,
      message: '获取任务详情失败：' + err.message
    }
  }
}

// 参与任务
async function joinTask(taskId, userId) {
  if (!taskId || !userId) {
    return {
      code: 400,
      message: '参数不完整'
    }
  }

  try {
    // 检查任务是否存在
    const task = await db.collection('tasks').doc(taskId).get()
    
    if (!task.data) {
      return {
        code: 404,
        message: '任务不存在'
      }
    }
    
    // 检查是否已参与
    if (task.data.participants && task.data.participants.includes(userId)) {
      return {
        code: 400,
        message: '您已参与此任务'
      }
    }
    
    // 更新任务参与者列表
    await db.collection('tasks').doc(taskId).update({
      data: {
        participants: _.addToSet(userId),
        updateTime: db.serverDate()
      }
    })
    
    // 记录活动日志
    await db.collection('activity_logs').add({
      data: {
        type: 'task_join',
        userId: userId,
        taskId: taskId,
        taskTitle: task.data.title,
        timestamp: db.serverDate()
      }
    })
    
    return {
      code: 0,
      message: '参与成功'
    }
  } catch (err) {
    console.error('参与任务失败：', err)
    return {
      code: 500,
      message: '参与任务失败：' + err.message
    }
  }
}

// 获取所有任务
async function getAllTasks() {
  try {
    // 获取所有任务，不分页
    const result = await db.collection('tasks')
      .orderBy('createTime', 'desc')
      .get()
    
    return {
      code: 0,
      data: result.data,
      message: '获取成功'
    }
  } catch (err) {
    console.error('获取所有任务失败：', err)
    return {
      code: 500,
      message: '获取所有任务失败：' + err.message
    }
  }
}

// 更新任务
async function updateTask(data, userId) {
  if (!data || !data._id) {
    return {
      code: 400,
      message: '参数不完整'
    }
  }

  try {
    // 检查任务是否存在
    const task = await db.collection('tasks').doc(data._id).get()
    
    if (!task.data) {
      return {
        code: 404,
        message: '任务不存在'
      }
    }
    
    // 检查是否有权限更新（只有创建者可以更新）
    if (task.data.createdBy !== userId) {
      return {
        code: 403,
        message: '无权限更新此任务'
      }
    }
    
    // 更新任务信息
    const taskId = data._id
    delete data._id // 移除_id字段，避免更新时出错
    
    await db.collection('tasks').doc(taskId).update({
      data: {
        ...data,
        updateTime: db.serverDate()
      }
    })
    
    return {
      code: 0,
      message: '更新成功'
    }
  } catch (err) {
    console.error('更新任务失败：', err)
    return {
      code: 500,
      message: '更新任务失败：' + err.message
    }
  }
}

// 删除任务
async function deleteTask(taskId, userId) {
  if (!taskId) {
    return {
      code: 400,
      message: '任务ID不能为空'
    }
  }

  try {
    // 检查任务是否存在
    const task = await db.collection('tasks').doc(taskId).get()
    
    if (!task.data) {
      return {
        code: 404,
        message: '任务不存在'
      }
    }
    
    // 检查是否有权限删除（只有创建者可以删除）
    if (task.data.createdBy !== userId) {
      return {
        code: 403,
        message: '无权限删除此任务'
      }
    }
    
    // 删除任务
    await db.collection('tasks').doc(taskId).remove()
    
    // 记录活动日志
    await db.collection('activity_logs').add({
      data: {
        type: 'task_delete',
        userId: userId,
        taskId: taskId,
        taskTitle: task.data.title,
        timestamp: db.serverDate()
      }
    })
    
    return {
      code: 0,
      message: '删除成功'
    }
  } catch (err) {
    console.error('删除任务失败：', err)
    return {
      code: 500,
      message: '删除任务失败：' + err.message
    }
  }
} 