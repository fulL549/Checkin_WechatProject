const app = getApp()

Page({
  data: {
    studentId: '',
    password: '',
    errorMessage: '',
    loading: false
  },

  onLoad: function(options) {
    console.log('登录页面加载 - onLoad')
    // 初始化页面状态
    this.setData({
      studentId: '',
      password: '',
      errorMessage: '',
      loading: false
    })
  },

  // 处理学号输入
  onStudentIdInput: function(e) {
    this.setData({
      studentId: e.detail.value,
      errorMessage: ''
    })
  },

  // 处理密码输入
  onPasswordInput: function(e) {
    this.setData({
      password: e.detail.value,
      errorMessage: ''
    })
  },

  // 处理登录按钮点击
  onLogin: function() {
    console.log('开始登录流程')
    
    // 表单验证
    if (!this.data.studentId) {
      this.setData({ errorMessage: '请输入学号' })
      return
    }
    
    if (!this.data.password) {
      this.setData({ errorMessage: '请输入密码' })
      return
    }
    
    this.setData({ loading: true, errorMessage: '' })
    
    console.log('调用云函数登录...')
    
    // 调用云函数登录
    wx.cloud.callFunction({
      name: 'user',
      data: {
        type: 'login',
        data: {
          studentId: this.data.studentId,
          password: this.data.password
        }
      }
    }).then(res => {
      console.log('登录结果详情:', JSON.stringify(res.result))
      
      if (res.result && res.result.code === 0) {
        // 登录成功，保存用户信息
        const userInfo = res.result.data
        app.globalData.userInfo = userInfo
        
        try {
          wx.setStorageSync('userInfo', userInfo)
          wx.setStorageSync('isLogin', true)
          
          // 如果是队长，设置队长状态
          if (userInfo.isCaptain) {
            wx.setStorageSync('isCaptain', true)
          }
        } catch (e) {
          console.error('保存用户信息失败', e)
        }
        
        console.log('准备跳转到首页')
        
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500,
          complete: function() {  // 使用complete替代success，确保无论成功失败都执行
            // 延迟跳转，确保提示显示完毕
            setTimeout(function() {
              // 直接使用reLaunch方式跳转到首页
              wx.reLaunch({
                url: '/pages/index/index',
                success: function() {
                  console.log('跳转到首页成功')
                },
                fail: function(err) {
                  console.error('跳转到首页失败', err)
                  // 尝试使用switchTab
                  wx.switchTab({
                    url: '/pages/index/index',
                    fail: function(err2) {
                      console.error('switchTab跳转也失败', err2)
                    }
                  })
                }
              })
            }, 1500)
          }
        })
      } else {
        // 登录失败
        this.setData({
          errorMessage: res.result?.message || '学号或密码错误',
          loading: false
        })
      }
    }).catch(err => {
      console.error('登录失败', err)
      this.setData({
        errorMessage: '登录失败: ' + (err.message || err.errMsg || '未知错误'),
        loading: false
      })
    })
  },

  // 跳转到注册页
  goToRegister: function() {
    wx.navigateTo({
      url: '/pages/register/register'
    })
  },

  // 返回按钮处理
  onBackTap: function() {
    wx.navigateBack()
  }
}) 