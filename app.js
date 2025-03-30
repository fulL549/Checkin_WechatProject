// app.js
App({
  globalData: {
    userInfo: null
  },

  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    
    wx.cloud.init({
      env: wx.cloud.DYNAMIC_CURRENT_ENV,
      traceUser: true
    })

    // 初始化默认用户信息
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      const defaultUserInfo = {
        nickName: '微信用户',
        avatarUrl: '/images/default-avatar.png',
        _openid: ''
      }
      wx.setStorageSync('userInfo', defaultUserInfo)
      this.globalData.userInfo = defaultUserInfo
    } else {
      this.globalData.userInfo = userInfo
    }
  }
})
