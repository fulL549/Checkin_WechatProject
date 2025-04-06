const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 获取下一个可用的ID
async function getNextId() {
  try {
    // 查询用户集合中的所有文档并按ID排序
    const result = await db.collection('users')
      .orderBy('_id', 'desc')
      .limit(1)
      .get();
    
    // 如果集合中没有文档，返回1作为第一个ID
    if (result.data.length === 0) {
      return 1;
    }
    
    // 尝试将最大的ID转换为数字并加1
    const lastId = result.data[0]._id;
    // 如果ID是数字字符串，解析为数字并加1
    if (!isNaN(lastId)) {
      return parseInt(lastId) + 1;
    } else {
      // 如果之前的ID不是数字格式，从1开始
      return 1;
    }
  } catch (err) {
    console.error('获取下一个ID失败:', err);
    // 出错时默认返回一个较大的数字，避免ID冲突
    return 10000;
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  // 不再从context中获取openid
  console.log('用户云函数调用:', event.type, event)
  
  try {
    switch (event.type) {
      case 'create':
        return await createUser(event.data)
      case 'get':
        return await getUser(event.userId)
      case 'register':
        return await registerUser(event)
      case 'login':
        return await loginUser(event)
      case 'update':
        return await updateUserInfo(event)
      case 'verifyCaptain':
        return await verifyCaptain(event)
      case 'getUserById':
        return await getUserById(event)
      case 'checkCaptainStatus':
        return await checkCaptainStatus(event)
      default:
        return {
          code: 404,
          message: '未知操作类型'
        }
    }
  } catch (e) {
    console.error('云函数执行错误:', e)
    return {
      code: 500,
      message: '云函数执行出错: ' + e.message
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
async function createUser(userData) {
  try {
    console.log('创建/更新用户:', userData)
    
    if (!userData._id) {
      console.error('用户ID为空');
      return {
        code: 400,
        message: '用户ID不能为空'
      }
    }
    
    // 检查用户是否已存在
    let existingUser;
    try {
      existingUser = await db.collection('users').doc(userData._id).get()
    } catch (err) {
      console.error('查询用户失败:', err);
      // 继续执行，假设用户不存在
      existingUser = { data: null };
    }

    // 准备用户数据，确保包含所有需要的字段
    const user = {
      // 基本信息
      nickName: userData.nickName || '未命名用户',
      avatarUrl: userData.avatarUrl || '',
      studentId: userData.studentId || '',
      gender: userData.gender || 'male',
      college: userData.college || '',  // 学院
      grade: userData.grade || '',      // 年级
      password: userData.password || '',
      
      // 队员信息
      teamStatus: userData.teamStatus || '在训',  // 状态：在训/退役/退队
      paddleSide: userData.paddleSide || '',      // 左右桨
      competitions: userData.competitions || [],   // 参赛记录
      
      // 个人详细信息
      birthday: userData.birthday || '',
      joinDate: userData.joinDate || '',  // 入队时间
      weight: userData.weight || '',      // 体重(kg)
      height: userData.height || '',      // 身高(cm)
      testLevel: userData.testLevel || '', // 测试水平
      phone: userData.phone || '',         // 手机号
      
      // 系统信息
      isCaptain: userData.isCaptain || false,
      updateTime: db.serverDate()
    }
    
    // 保留原有数据中可能存在的其他字段
    if (userData.city) user.city = userData.city
    if (userData.province) user.province = userData.province
    if (userData.country) user.country = userData.country
    if (userData.userId) user.userId = userData.userId

    // 如果用户不存在，创建新用户
    if (!existingUser.data) {
      // 生成新的ID
      const nextId = await getNextId();
      user._id = nextId.toString();
      user.userId = nextId;
      
      await db.collection('users').add({
        data: user
      })
    } else {
      // 如果用户存在，更新信息
      await db.collection('users').doc(userData._id).update({
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
async function getUser(userId) {
  try {
    console.log('获取用户信息, userId:', userId)
    
    if (!userId) {
      return {
        code: 404,
        message: '用户ID不能为空'
      }
    }
    
    // 根据ID直接获取
    try {
      const user = await db.collection('users').doc(userId).get()
      if (user && user.data) {
        return {
          code: 0,
          data: user.data,
          message: '获取用户信息成功'
        }
      }
    } catch (err) {
      console.log('查询用户失败', err)
      
      // 尝试使用userId字段查询
      try {
        const userQuery = await db.collection('users').where({
          userId: parseInt(userId)
        }).get()
        
        if (userQuery.data.length > 0) {
          return {
            code: 0,
            data: userQuery.data[0],
            message: '获取用户信息成功'
          }
        }
      } catch (innerErr) {
        console.log('使用userId字段查询用户失败', innerErr)
      }
      
      return {
        code: 404,
        message: '用户不存在'
      }
    }

    return {
      code: 404,
      message: '用户不存在'
    }
  } catch (err) {
    console.error('获取用户信息失败：', err)
    return {
      code: 500,
      message: '获取用户信息失败：' + err.message
    }
  }
}

// 用户信息更新
async function updateUserInfo(event) {
  try {
    console.log('更新用户信息:', event.data, '队长编辑模式:', event.isCaptainEdit)
    
    // 获取更新数据
    const userData = event.data
    const isCaptainEdit = event.isCaptainEdit || false
    
    // 验证关键字段存在
    if (!userData._id) {
      return {
        code: 400,
        message: '用户ID不能为空'
      }
    }
    
    // 检查用户是否存在 - 使用用户提供的_id进行查询
    let userId = userData._id
    let existingUser
    
    try {
      // 使用_id直接查询
      existingUser = await db.collection('users').doc(userId).get()
    } catch (err) {
      console.error('使用_id查询用户失败:', err)
      return {
        code: 404,
        message: '用户不存在'
      }
    }
    
    if (!existingUser || !existingUser.data) {
      return {
        code: 404,
        message: '用户信息不存在'
      }
    }

    // 如果是队长编辑模式，需要验证调用者是否为队长
    if (isCaptainEdit) {
      // 获取当前登录用户的ID（从event中获取）
      const callerId = event.callerId
      
      if (!callerId) {
        return {
          code: 403,
          message: '无法验证队长身份，请重新登录'
        }
      }
      
      console.log('验证队长权限，callerId:', callerId)
      
      // 获取调用者信息
      let callerUser
      try {
        // 先尝试使用_id直接查询
        callerUser = await db.collection('users').doc(callerId).get()
      } catch (err) {
        console.error('查询用户失败:', err)
        return {
          code: 403,
          message: '无法验证队长身份，用户不存在'
        }
      }
      
      // 验证调用者是否为队长
      if (!callerUser.data || !callerUser.data.isCaptain) {
        return {
          code: 403,
          message: '无权进行此操作，仅队长可编辑其他队员信息'
        }
      }
      
      console.log('队长编辑模式验证通过')
    }
    
    // 准备更新数据
    // 常规模式下只允许更新有限的字段
    const updateData = isCaptainEdit ? {
      // 队长模式下允许更新所有字段
      avatarUrl: userData.avatarUrl,
      nickName: userData.nickName,
      studentId: userData.studentId,
      gender: userData.gender,
      college: userData.college,
      grade: userData.grade,
      teamStatus: userData.teamStatus,
      testLevel: userData.testLevel,
      phone: userData.phone,
      birthday: userData.birthday,
      height: userData.height,
      weight: userData.weight,
      paddleSide: userData.paddleSide,
      joinDate: userData.joinDate,
      updateTime: db.serverDate()
    } : {
      // 常规模式下的有限字段
      avatarUrl: userData.avatarUrl,
      phone: userData.phone,
      birthday: userData.birthday,
      height: userData.height,
      weight: userData.weight,
      paddleSide: userData.paddleSide,
      joinDate: userData.joinDate,
      updateTime: db.serverDate()
    }
    
    // 如果有提供密码，增加密码更新
    if (userData.password) {
      updateData.password = userData.password
    }
    
    // 执行更新操作 - 使用确认的用户ID
    await db.collection('users').doc(userId).update({
      data: updateData
    })
    
    // 获取更新后的完整用户数据
    const updatedUser = await db.collection('users').doc(userId).get()
    
    // 返回完整的用户信息
    return {
      code: 0,
      data: updatedUser.data,
      message: '更新成功'
    }
  } catch (err) {
    console.error('更新用户信息失败:', err)
    return {
      code: 500,
      message: '操作失败: ' + err.message
    }
  }
}

// 根据用户ID获取用户信息
async function getUserById(event) {
  try {
    const { userId } = event
    if (!userId) {
      return {
        code: -1,
        message: '缺少必要参数'
      }
    }

    // 查询指定用户信息
    try {
      const user = await db.collection('users').doc(userId).get()
      
      if (!user.data) {
        return {
          code: -1,
          message: '用户不存在'
        }
      }
      
      return {
        code: 0,
        data: user.data,
        message: '获取用户信息成功'
      }
    } catch (err) {
      return {
        code: -1,
        message: '用户不存在'
      }
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
async function registerUser(event) {
  try {
    const { 
      studentId, 
      password, 
      nickName,
      gender,
      college,
      grade,
      teamStatus
    } = event.data
    
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
    
    // 获取下一个可用的ID
    const nextId = await getNextId();
    
    // 创建新用户
    const userData = {
      _id: nextId.toString(), // ID使用字符串格式
      nickName: nickName || '用户' + studentId, // 姓名
      studentId,
      password, // 实际应用中应对密码进行加密
      avatarUrl: '',
      gender: gender || 'male',
      college: college || '',  // 学院全称
      grade: grade || '',      // 年级全称
      teamStatus: teamStatus || '在训',
      paddleSide: '', // 默认值
      competitions: [], // 默认值
      birthday: '',    // 默认值
      joinDate: '',    // 默认值
      weight: '',      // 默认值
      height: '',      // 默认值
      testLevel: '',   // 默认值
      phone: '',       // 默认值
      isCaptain: false,
      userId: nextId,  // 添加数字格式的ID
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

// 检查用户的队长状态
async function checkCaptainStatus(event) {
  try {
    const { userId } = event
    
    if (!userId) {
      return {
        code: 400,
        message: '用户ID不能为空'
      }
    }
    
    // 查询用户
    let user
    try {
      user = await db.collection('users').doc(userId).get()
    } catch (err) {
      console.error('查询用户失败:', err)
      return {
        code: 404,
        message: '用户不存在'
      }
    }
    
    if (!user || !user.data) {
      return {
        code: 404,
        message: '用户不存在'
      }
    }
    
    // 返回用户的队长状态
    return {
      code: 0,
      data: {
        userId: userId,
        isCaptain: user.data.isCaptain || false
      },
      message: '获取队长状态成功'
    }
  } catch (err) {
    console.error('检查队长状态失败:', err)
    return {
      code: 500,
      message: '检查队长状态失败: ' + err.message
    }
  }
} 