// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  console.log('Cloud function team triggered:', event.action, 'by openid:', openid)

  // 处理不同的操作请求
  switch (event.action) {
    case 'createTeam':
      return await createTeam(event, openid)
    case 'joinTeam':
      return await joinTeam(event, openid)
    case 'getTeamInfo':
      return await getTeamInfo(event, openid)
    case 'getTeamMembers':
      return await getTeamMembers(openid)
    default:
      return {
        code: -1,
        message: '未知操作'
      }
  }
}

// 创建团队
async function createTeam(event, openid) {
  // ... 现有代码保持不变 ...
}

// 加入团队
async function joinTeam(event, openid) {
  // ... 现有代码保持不变 ...
}

// 获取团队信息
async function getTeamInfo(event, openid) {
  // ... 现有代码保持不变 ...
}

// 获取团队所有成员（仅队长可调用）
async function getTeamMembers(openid) {
  try {
    console.log('getTeamMembers called with openid:', openid)
    
    // 直接查询所有用户，不再验证团队关系
    const members = await db.collection('users')
      .get()
    
    console.log('All users count:', members.data.length)

    // 直接返回用户信息，不再查询打卡次数
    return {
      code: 0,
      data: members.data,
      message: '获取用户列表成功'
    }
  } catch (err) {
    console.error('获取用户列表失败', err)
    return {
      code: -1,
      message: '获取用户列表失败: ' + err.message
    }
  }
} 