const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 清空现有数据
    await clearCollections()
    
    // 添加测试用户
    const users = await addTestUsers()
    
    // 添加测试任务
    const tasks = await addTestTasks()
    
    // 添加测试打卡记录
    const checkins = await addTestCheckins(users.map(u => u._openid))
    
    return {
      code: 0,
      message: '初始化测试数据成功',
      data: {
        users,
        tasks,
        checkins
      }
    }
  } catch (err) {
    console.error('初始化测试数据失败：', err)
    return {
      code: 500,
      message: '初始化测试数据失败：' + err.message
    }
  }
}

// 清空集合
async function clearCollections() {
  const collections = ['users', 'tasks', 'checkins']
  
  for (const collection of collections) {
    try {
      const data = await db.collection(collection).limit(100).get()
      
      for (const item of data.data) {
        await db.collection(collection).doc(item._id).remove()
      }
    } catch (err) {
      console.error(`清空集合 ${collection} 失败:`, err)
    }
  }
}

// 添加测试用户
async function addTestUsers() {
  const users = [
    {
      _openid: 'test_user_1',
      nickName: '测试用户1',
      avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
    },
    {
      _openid: 'test_user_2',
      nickName: '测试用户2',
      avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
    },
    {
      _openid: 'test_user_3',
      nickName: '测试用户3',
      avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
    }
  ]
  
  const results = []
  
  for (const user of users) {
    const result = await db.collection('users').add({
      data: user
    })
    results.push({
      _id: result._id,
      ...user
    })
  }
  
  return results
}

// 添加测试任务
async function addTestTasks() {
  const tasks = [
    {
      title: '每日学习打卡',
      description: '每天至少学习1小时，记录学习内容',
      createTime: db.serverDate(),
      status: 'active'
    },
    {
      title: '运动打卡',
      description: '每天运动30分钟，保持健康',
      createTime: db.serverDate(),
      status: 'active'
    },
    {
      title: '阅读打卡',
      description: '每天阅读30分钟，提升自我',
      createTime: db.serverDate(),
      status: 'active'
    }
  ]
  
  const results = []
  
  for (const task of tasks) {
    const result = await db.collection('tasks').add({
      data: task
    })
    results.push({
      _id: result._id,
      ...task
    })
  }
  
  return results
}

// 添加测试打卡记录
async function addTestCheckins(userIds) {
  const checkins = []
  
  // 为每个用户添加不同数量的打卡记录
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i]
    // 每个用户添加 (i+1)*2 条打卡记录
    for (let j = 0; j < (i + 1) * 2; j++) {
      const date = new Date()
      date.setDate(date.getDate() - j)
      
      checkins.push({
        openId: userId,
        date: date.toISOString().split('T')[0],
        content: `第${j+1}天打卡内容`,
        createTime: db.serverDate()
      })
    }
  }
  
  const results = []
  
  for (const checkin of checkins) {
    const result = await db.collection('checkins').add({
      data: checkin
    })
    results.push({
      _id: result._id,
      ...checkin
    })
  }
  
  return results
} 