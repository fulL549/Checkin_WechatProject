const cloud = require('wx-server-sdk')
cloud.init({
  env: 'cloud1-8g5yt7n443fd27f9'
})

const db = cloud.database()
const _ = db.command

// 用户登录
exports.login = async (event, context) => {
  const { code, userInfo } = event
  try {
    // 获取openid
    const { result } = await cloud.callFunction({
      name: 'getOpenId',
      data: { code }
    })
    
    const { openid } = result
    
    // 查询用户是否存在
    const user = await db.collection('users').where({
      openId: openid
    }).get()
    
    if (user.data.length === 0) {
      // 新用户，创建记录
      const newUser = {
        openId: openid,
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl,
        gender: userInfo.gender,
        studentId: '',
        totalCheckins: 0,
        monthlyCheckins: 0,
        createdAt: db.serverDate()
      }
      
      await db.collection('users').add({
        data: newUser
      })
      
      return {
        code: 0,
        message: 'success',
        data: {
          userInfo: newUser
        }
      }
    } else {
      // 更新用户信息
      await db.collection('users').where({
        openId: openid
      }).update({
        data: {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          gender: userInfo.gender
        }
      })
      
      return {
        code: 0,
        message: 'success',
        data: {
          userInfo: user.data[0]
        }
      }
    }
  } catch (err) {
    return {
      code: -1,
      message: err.message
    }
  }
}

// 获取用户信息
exports.getUserInfo = async (event, context) => {
  const { openId } = event
  try {
    const user = await db.collection('users').where({
      openId
    }).get()
    
    if (user.data.length === 0) {
      return {
        code: 1004,
        message: '用户不存在'
      }
    }
    
    return {
      code: 0,
      message: 'success',
      data: user.data[0]
    }
  } catch (err) {
    return {
      code: -1,
      message: err.message
    }
  }
} 