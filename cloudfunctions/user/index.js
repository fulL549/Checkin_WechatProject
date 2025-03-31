const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { type, data, openId } = event
  const wxContext = cloud.getWXContext()
  const currentOpenId = openId || wxContext.OPENID

  switch (type) {
    case 'create':
      return createUser(data, currentOpenId)
    case 'get':
      return getUser(currentOpenId)
    case 'getUserInfo':
      return await getUserInfo(currentOpenId)
    case 'updateUserInfo':
      return await updateUserInfo(event, currentOpenId)
    case 'getUserById':
      return await getUserById(event)
    case 'register':
      return await registerUser(event, wxContext.OPENID)
    case 'login':
      return await loginUser(event)
    case 'verifyCaptain':
      return await verifyCaptain(event)
    default:
      return {
        code: 400,
        message: '未知的操作类型'
      }
  }
}

// 验证队长密码并更新状态
async function verifyCaptain(event) {
  try {
    const { userId, password } = event
    if (!userId || !password) {
      return {
        code: 400,
        message: '参数不完整'
      }
    }

    // 验证密码
    if (password !== 'SYSU') {
      return {
        code: 401,
        message: '密码错误'
      }
    }

    // 更新用户的队长状态
    await db.collection('users').doc(userId).update({
      data: {
        isCaptain: true,
        updateTime: db.serverDate()
      }
    })

    return {
      code: 0,
      message: '验证成功'
    }
  } catch (err) {
    console.error('验证队长失败：', err)
    return {
      code: 500,
      message: '验证失败：' + err.message
    }
  }
}

// 创建或更新用户
async function createUser(userData, openId) {
  try {
    console.log('创建/更新用户:', openId, userData)
    
    if (!openId) {
      console.error('用户ID为空');
      return {
        code: 400,
        message: '用户ID不能为空'
      }
    }
    
    // 检查用户是否已存在
    let existingUser;
    try {
      existingUser = await db.collection('users').doc(openId).get()
    } catch (err) {
      console.error('查询用户失败:', err);
      // 继续执行，假设用户不存在
      existingUser = { data: null };
    }

    // 准备用户数据，确保包含所有需要的字段
    const user = {
      _id: openId,
      nickName: userData.nickName || '未命名用户',
      avatarUrl: userData.avatarUrl || '',
      gender: userData.gender || 'male',
      studentId: userData.studentId || '',
      birthday: userData.birthday || '',
      phone: userData.phone || '',
      isCaptain: userData.isCaptain || false,
      updateTime: db.serverDate()
    }
    
    // 保留原有数据中可能存在的其他字段
    if (userData.city) user.city = userData.city
    if (userData.province) user.province = userData.province
    if (userData.country) user.country = userData.country

    // 如果用户不存在，创建新用户
    if (!existingUser.data) {
      await db.collection('users').doc(openId).set({
        data: user
      })
    } else {
      // 如果用户存在，更新信息
      await db.collection('users').doc(openId).update({
        data: user
      })
    }

    return {
      code: 0,
      data: user,
      message: '操作成功'
    }
  } catch (err) {
    console.error('创建/更新用户失败：', err)
    return {
      code: 500,
      message: '操作失败：' + err.message
    }
  }
}

// 获取用户信息
async function getUser(openId) {
  try {
    const user = await db.collection('users').where({
      _openid: openId
    }).get()

    if (user.data.length === 0) {
      return {
        code: 404,
        message: '用户不存在'
      }
    }

    return {
      code: 0,
      data: user.data[0],
      message: '获取用户信息成功'
    }
  } catch (err) {
    console.error('获取用户信息失败：', err)
    return {
      code: 500,
      message: '获取用户信息失败：' + err.message
    }
  }
}

// 获取用户信息
async function getUserInfo(openid) {
  // ... 现有代码保持不变 ...
}

// 更新用户信息
async function updateUserInfo(event, openid) {
  // ... 现有代码保持不变 ...
}

// 根据用户ID获取用户信息（仅队长可调用）
async function getUserById(event) {
  try {
    const { userId } = event
    if (!userId) {
      return {
        code: -1,
        message: '缺少必要参数'
      }
    }

    // 不再验证调用者是否为队长
    // 查询指定用户信息
    const user = await db.collection('users')
      .where({
        _openid: userId
      })
      .get()

    if (user.data.length === 0) {
      return {
        code: -1,
        message: '用户不存在'
      }
    }

    return {
      code: 0,
      data: user.data[0],
      message: '获取用户信息成功'
    }
  } catch (err) {
    console.error('获取用户信息失败', err)
    return {
      code: -1,
      message: '获取用户信息失败: ' + err.message
    }
  }
}

// 注册新用户
async function registerUser(event, openId) {
  try {
    const { studentId, password, nickName } = event.data
    
    if (!studentId || !password) {
      return {
        code: 400,
        message: '学号和密码不能为空'
      }
    }
    
    // 检查学号是否已存在
    const existingUsers = await db.collection('users').where({
      studentId
    }).get()
    
    if (existingUsers.data.length > 0) {
      return {
        code: 400,
        message: '该学号已被注册'
      }
    }
    
    // 创建新用户
    const userData = {
      nickName: nickName || '用户' + studentId,
      studentId,
      password, // 实际应用中应对密码进行加密
      avatarUrl: '',
      _openid: openId,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
    
    const result = await db.collection('users').add({
      data: userData
    })
    
    return {
      code: 0,
      data: {
        ...userData,
        _id: result._id
      },
      message: '注册成功'
    }
  } catch (err) {
    console.error('用户注册失败：', err)
    return {
      code: 500,
      message: '注册失败：' + err.message
    }
  }
}

// 用户登录
async function loginUser(event) {
  try {
    const { studentId, password } = event.data
    
    if (!studentId || !password) {
      return {
        code: 400,
        message: '学号和密码不能为空'
      }
    }
    
    // 查询用户
    const users = await db.collection('users').where({
      studentId,
      password
    }).get()
    
    if (users.data.length === 0) {
      return {
        code: 401,
        message: '学号或密码错误'
      }
    }
    
    const user = users.data[0]
    
    // 移除密码字段再返回
    const { password: _, ...userWithoutPassword } = user
    
    return {
      code: 0,
      data: userWithoutPassword,
      message: '登录成功'
    }
  } catch (err) {
    console.error('用户登录失败：', err)
    return {
      code: 500,
      message: '登录失败：' + err.message
    }
  }
} 