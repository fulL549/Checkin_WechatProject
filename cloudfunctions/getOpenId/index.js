const cloud = require('wx-server-sdk')
cloud.init({
  env: 'cloud1-8g5yt7n443fd27f9'
})

exports.main = async (event, context) => {
  const { code } = event
  try {
    const { openid } = await cloud.getOpenData({
      list: [code]
    })
    return {
      openid
    }
  } catch (err) {
    return {
      code: -1,
      message: err.message
    }
  }
} 