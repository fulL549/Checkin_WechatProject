// app.js
App({
  globalData: {
    userInfo: null,
    isLogin: false,
    isInitialized: false  // 添加初始化标记
  },

  onLaunch: function () {
    console.log('小程序启动 - onLaunch')
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    
    wx.cloud.init({
      env: wx.cloud.DYNAMIC_CURRENT_ENV,
      traceUser: true
    })

    // 检查登录状态
    this.checkLoginStatus()
    
    // 标记初始化完成
    this.globalData.isInitialized = true
  },
  
  // 检查登录状态
  checkLoginStatus: function() {
    console.log('执行登录状态检查')
    try {
      // 尝试从本地获取登录状态和用户信息
      const isLogin = wx.getStorageSync('isLogin') || false
      const userInfo = wx.getStorageSync('userInfo')
      console.log('登录状态检查: isLogin =', isLogin, 'userInfo =', userInfo ? '存在' : '不存在')
      
      // 如果已登录且有用户信息
      if (isLogin && userInfo) {
        this.globalData.isLogin = true
        this.globalData.userInfo = userInfo
      } else {
        // 未登录或用户信息不存在，重置为默认状态
        const defaultUserInfo = {
          nickName: '微信用户',
          avatarUrl: '/images/default-avatar.png'
        }
        
        this.globalData.isLogin = false
        this.globalData.userInfo = defaultUserInfo
        
        // 跳转到登录页
        // 增加延迟时间，确保小程序初始化完成
        console.log('准备延迟跳转到登录页面')
        setTimeout(() => {
          console.log('执行延迟跳转，当前页面栈:', getCurrentPages())
          const pages = getCurrentPages()
          // 如果当前页不是登录或注册页，则跳转到登录页
          if (pages.length > 0) {
            const currentPage = pages[pages.length - 1]
            const url = currentPage.route
            if (url !== 'pages/login/login' && url !== 'pages/register/register') {
              wx.reLaunch({  // 使用reLaunch替代redirectTo
                url: '/pages/login/login'
              })
            }
          } else {
            // 页面栈为空，使用reLaunch
            wx.reLaunch({
              url: '/pages/login/login'
            })
          }
        }, 500)  // 增加延迟时间到500毫秒
      }
    } catch (e) {
      console.error('检查登录状态失败', e)
      // 错误时默认为未登录状态
      this.globalData.isLogin = false
      
      // 错误情况下也确保跳转到登录页
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/login/login'
        })
      }, 500)
    }
  },
  
  // 路由守卫，用于检查页面访问权限
  checkPagePermission: function(pageUrl) {
    // 不需要登录即可访问的页面
    const publicPages = ['pages/login/login', 'pages/register/register']
    
    // 如果是公共页面，直接允许访问
    if (publicPages.includes(pageUrl)) {
      return true
    }
    
    // 检查是否已登录
    if (!this.globalData.isLogin) {
      wx.reLaunch({  // 使用reLaunch替代redirectTo
        url: '/pages/login/login'
      })
      return false
    }
    
    return true
  },

  onShow: function() {
    console.log('小程序显示 - onShow')
    // 如果用户未登录，确保显示登录页面
    if (!this.globalData.isLogin) {
      const pages = getCurrentPages()
      if (pages.length > 0) {
        const currentPage = pages[pages.length - 1]
        const url = currentPage.route
        if (url !== 'pages/login/login' && url !== 'pages/register/register') {
          wx.reLaunch({
            url: '/pages/login/login'
          })
        }
      }
    }
  }
})
