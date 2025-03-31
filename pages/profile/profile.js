const cloud = require('../../utils/cloud')

Page({
  data: {
    userInfo: {},
    stats: {
      totalCheckins: 0,
      rank: '未上榜'
    },
    isCaptain: false,
    refreshing: false
  },

  onLoad: function() {
    console.log('cloud module:', cloud)
    if (!cloud || !cloud.checkin) {
      console.error('cloud module not properly loaded')
      return
    }
    
    // 加载队长状态
    const isCaptain = wx.getStorageSync('isCaptain') || false;
    this.setData({ isCaptain });
    
    this.loadUserInfo()
  },

  onShow: function() {
    this.loadUserInfo()
  },

  // 加载用户信息
  loadUserInfo: function() {
    // 先从全局数据获取用户信息
    const app = getApp()
    let userInfo = app.globalData.userInfo
    
    // 如果全局数据没有，则从本地存储获取
    if (!userInfo) {
      userInfo = wx.getStorageSync('userInfo') || {}
      app.globalData.userInfo = userInfo
    }
    
    this.setData({ userInfo })
    
    // 获取用户打卡统计
    this.loadUserStats()
  },

  // 加载用户统计数据
  loadUserStats: function() {
    if (!cloud || !cloud.checkin) {
      console.error('cloud module not properly loaded')
      return
    }

    // 使用默认数据
    const defaultStats = {
      totalCheckins: 0,
      rank: '未上榜'
    }

    // 设置默认值先
    this.setData({ stats: defaultStats })
    
    // 如果用户未登录，不加载统计数据
    if (!this.data.userInfo || !this.data.userInfo._id) {
      return
    }

    // 简单使用直接调用，不使用嵌套的setTimeout
    wx.showLoading({ title: '加载中' })
    
    // 在finally中确保隐藏loading
    cloud.checkin.getUserStats()
      .then(data => {
        this.setData({
          stats: {
            totalCheckins: data.totalCheckins || 0,
            rank: data.rank || '未上榜'
          }
        })
      })
      .catch(err => {
        console.error('获取用户统计数据失败:', err)
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  // 处理模拟登录
  onLoginTap: function() {
    wx.showLoading({
      title: '登录中...'
    })
    
    // 创建测试用户信息
    const testUser = {
      nickName: '测试用户',
      avatarUrl: '/images/default-avatar.png',
      gender: Math.random() > 0.5 ? '男' : '女',
      city: '测试城市',
      province: '测试省份',
      createdAt: new Date()
    }
    
    // 调用云函数创建用户
    cloud.user.createUser(testUser)
      .then(userData => {
        // 保存到全局和本地
        getApp().globalData.userInfo = userData
        wx.setStorageSync('userInfo', userData)
        
        // 更新页面显示
        this.setData({ userInfo: userData })
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
        
        // 刷新统计数据
        this.loadUserStats()
      })
      .catch(err => {
        console.error('创建用户失败:', err)
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        })
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  // 点击发布任务
  onPublishTaskTap: function() {
    wx.navigateTo({
      url: '/pages/task/task'
    })
  },

  // 点击打卡历史
  onHistoryTap: function() {
    wx.navigateTo({
      url: '/pages/history/history'
    })
  },

  // 点击设置
  onSettingsTap: function() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  },

  // 点击关于
  onAboutTap: function() {
    wx.showToast({
      title: '打卡小程序 v1.0',
      icon: 'none'
    })
  },

  navigateToTask() {
    wx.navigateTo({
      url: '/pages/task/task'
    });
  },

  // 退出登录
  onLogoutTap: function() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储的用户信息和登录状态
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('isLogin')
          wx.removeStorageSync('isCaptain')
          
          // 清除全局数据
          const app = getApp()
          app.globalData.userInfo = null
          app.globalData.isLogin = false
          
          // 重置页面数据
          this.setData({
            userInfo: {},
            stats: {
              totalCheckins: 0,
              rank: '未上榜'
            },
            isCaptain: false
          })
          
          // 跳转到登录页面
          wx.reLaunch({
            url: '/pages/login/login'
          })
        }
      }
    })
  },

  // 点击队长模式
  onCaptainModeTap: function() {
    // 如果用户未登录，提示登录
    if (!this.data.userInfo || !this.data.userInfo._id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    // 如果已经是队长，直接进入队长界面
    if (this.data.userInfo.isCaptain) {
      this.navigateToCaptainPage()
      return
    }
    
    // 否则需要密码验证
    wx.showModal({
      title: '队长验证',
      placeholderText: '请输入队长密码',
      editable: true,
      success: (res) => {
        if (res.confirm) {
          const password = res.content
          // 调用云函数验证密码
          wx.cloud.callFunction({
            name: 'user',
            data: {
              type: 'verifyCaptain',
              userId: this.data.userInfo._id,
              password: password
            }
          }).then(res => {
            if (res.result && res.result.code === 0) {
              // 更新本地用户信息
              const userInfo = this.data.userInfo
              userInfo.isCaptain = true
              getApp().globalData.userInfo = userInfo
              wx.setStorageSync('userInfo', userInfo)
              
              this.setData({ userInfo })
              
              wx.showToast({
                title: '验证成功',
                icon: 'success'
              })
              
              // 导航到队长页面
              this.navigateToCaptainPage()
            } else {
              wx.showToast({
                title: res.result.message || '验证失败',
                icon: 'error'
              })
            }
          }).catch(err => {
            console.error('验证失败:', err)
            wx.showToast({
              title: '验证失败',
              icon: 'error'
            })
          })
        }
      }
    })
  },
  
  // 导航到队长页面
  navigateToCaptainPage: function() {
    wx.navigateTo({
      url: '/pages/captain/captain'
    });
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.setData({ refreshing: true });
    this.loadUserInfo();
    this.loadUserStats()
      .then(() => {
        this.setData({ refreshing: false });
      })
      .catch(() => {
        this.setData({ refreshing: false });
      });
  },
}); 