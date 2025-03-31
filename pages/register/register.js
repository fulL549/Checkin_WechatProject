const app = getApp()

Page({
  data: {
    studentId: '',
    nickName: '',
    password: '',
    confirmPassword: '',
    errorMessage: '',
    loading: false
  },

  onLoad: function(options) {
    // 页面加载
  },

  // 处理学号输入
  onStudentIdInput: function(e) {
    this.setData({
      studentId: e.detail.value,
      errorMessage: ''
    })
  },

  // 处理昵称输入
  onNickNameInput: function(e) {
    this.setData({
      nickName: e.detail.value,
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

  // 处理确认密码输入
  onConfirmPasswordInput: function(e) {
    this.setData({
      confirmPassword: e.detail.value,
      errorMessage: ''
    })
  },

  // 处理注册按钮点击
  onRegister: function() {
    // 表单验证
    if (!this.data.studentId) {
      this.setData({ errorMessage: '请输入学号' })
      return
    }
    
    if (!this.data.password) {
      this.setData({ errorMessage: '请输入密码' })
      return
    }
    
    if (this.data.password !== this.data.confirmPassword) {
      this.setData({ errorMessage: '两次输入的密码不一致' })
      return
    }
    
    this.setData({ loading: true, errorMessage: '' })
    
    // 调用云函数注册
    wx.cloud.callFunction({
      name: 'user',
      data: {
        type: 'register',
        data: {
          studentId: this.data.studentId,
          password: this.data.password,
          nickName: this.data.nickName
        }
      }
    }).then(res => {
      console.log('注册结果', res)
      
      if (res.result && res.result.code === 0) {
        // 注册成功，保存用户信息
        const userInfo = res.result.data
        app.globalData.userInfo = userInfo
        
        try {
          wx.setStorageSync('userInfo', userInfo)
          wx.setStorageSync('isLogin', true)
        } catch (e) {
          console.error('保存用户信息失败', e)
        }
        
        wx.showToast({
          title: '注册成功',
          icon: 'success',
          duration: 2000,
          complete: () => {
            // 注册成功后跳转到首页
            setTimeout(() => {
              wx.switchTab({
                url: '/pages/index/index'
              })
            }, 2000)
          }
        })
      } else {
        // 注册失败
        this.setData({
          errorMessage: res.result?.message || '注册失败，请重试',
          loading: false
        })
      }
    }).catch(err => {
      console.error('注册失败', err)
      this.setData({
        errorMessage: '注册失败: ' + (err.message || err.errMsg || '未知错误'),
        loading: false
      })
    })
  },

  // 跳转到登录页
  goToLogin: function() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  // 返回按钮处理
  onBackTap: function() {
    wx.navigateBack()
  }
}) 