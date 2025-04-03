const cloud = require('../../utils/cloud')

Page({
  data: {
    userInfo: {},
    loading: false,
    paddleSideOptions: ['左桨', '右桨', '双桨', '未定'],
    paddleSideIndex: 0,
    newPassword: '',
    confirmPassword: '',
    showPassword: false,
    showConfirmPassword: false,
    savingToCloud: false,
    scrollTop: 0 // 新增滚动位置记录
  },

  onLoad: function() {
    // 加载用户信息
    this.loadUserInfo()
  },

  // 加载用户信息
  loadUserInfo: function() {
    // 先显示加载状态
    wx.showLoading({
      title: '加载中...',
      mask: true
    })

    // 先从全局数据获取用户信息
    const app = getApp()
    let userInfo = app.globalData.userInfo
    
    // 如果全局数据没有，则从本地存储获取
    if (!userInfo) {
      userInfo = wx.getStorageSync('userInfo') || {}
      if (userInfo._id) {
        app.globalData.userInfo = userInfo
      }
    }
    
    // 为性别数据添加默认值，用于单选按钮组
    if (!userInfo.gender) {
      userInfo.gender = 'male'
    }
    
    // 设置左右桨的默认索引
    const paddleSideIndex = this.data.paddleSideOptions.findIndex(
      side => side === userInfo.paddleSide
    )
    
    this.setData({ 
      userInfo,
      paddleSideIndex: paddleSideIndex >= 0 ? paddleSideIndex : 0
    })
    
    // 检查登录状态
    if (!userInfo || !userInfo._id) {
      wx.hideLoading()
      wx.showModal({
        title: '提示',
        content: '请先登录后再设置个人信息',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/profile/profile'
          })
        }
      })
      return
    }

    // 从服务器获取最新的用户信息
    wx.cloud.callFunction({
      name: 'user',
      data: {
        type: 'get',
        userId: userInfo._id
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result && res.result.code === 0 && res.result.data) {
        const serverUserInfo = res.result.data
        
        // 使用服务器返回的最新数据更新本地数据
        const updatedUserInfo = {
          ...userInfo,
          ...serverUserInfo
        }
        
        // 设置左右桨的默认索引
        const paddleSideIndex = this.data.paddleSideOptions.findIndex(
          side => side === updatedUserInfo.paddleSide
        )
        
        this.setData({
          userInfo: updatedUserInfo,
          paddleSideIndex: paddleSideIndex >= 0 ? paddleSideIndex : 0
        })
        
        // 更新全局状态和本地存储
        app.globalData.userInfo = updatedUserInfo
        wx.setStorageSync('userInfo', updatedUserInfo)
        
        console.log('已从服务器获取最新用户信息', updatedUserInfo)
      } else {
        console.error('获取用户信息失败', res)
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('从服务器获取用户信息失败', err)
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none'
      })
    })
  },

  // 处理导航栏返回按钮点击
  onBackTap: function() {
    wx.navigateBack({
      delta: 1
    })
  },

  // 选择头像
  onChooseAvatar: function() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 获取图片临时路径
        const tempFilePath = res.tempFilePaths[0]
        
        // 上传图片到云存储
        this.uploadAvatar(tempFilePath)
      }
    })
  },

  // 上传头像到云存储
  uploadAvatar: function(filePath) {
    wx.showLoading({
      title: '上传中...',
      mask: true
    })

    // 生成随机文件名
    const timestamp = new Date().getTime()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const cloudPath = `avatars/${this.data.userInfo._id}_${timestamp}_${randomStr}.jpg`

    // 上传图片
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: res => {
        // 获取图片链接
        const fileID = res.fileID
        
        // 更新用户头像URL
        this.setData({
          'userInfo.avatarUrl': fileID
        })
        
        wx.hideLoading()
        wx.showToast({
          title: '上传成功',
          icon: 'success'
        })
      },
      fail: err => {
        console.error('上传头像失败:', err)
        wx.hideLoading()
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        })
      }
    })
  },

  // 密码相关函数
  togglePasswordVisibility: function() {
    this.setData({ 
      showPassword: !this.data.showPassword 
    })
  },
  
  toggleConfirmPasswordVisibility: function() {
    this.setData({ 
      showConfirmPassword: !this.data.showConfirmPassword 
    })
  },
  
  onPasswordInput: function(e) {
    this.setData({ 
      newPassword: e.detail.value 
    })
  },
  
  onConfirmPasswordInput: function(e) {
    this.setData({ 
      confirmPassword: e.detail.value 
    })
  },
  
  // 左右桨变化处理
  onPaddleSideChange: function(e) {
    const index = e.detail.value
    this.setData({
      paddleSideIndex: index,
      'userInfo.paddleSide': this.data.paddleSideOptions[index]
    })
  },
  
  // 入队时间变化处理
  onJoinDateChange: function(e) {
    this.setData({
      'userInfo.joinDate': e.detail.value
    })
  },
  
  // 生日选择变化
  onBirthdayChange: function(e) {
    this.setData({
      'userInfo.birthday': e.detail.value
    })
  },
  
  // 身高输入变化
  onHeightInput: function(e) {
    this.setData({
      'userInfo.height': e.detail.value
    })
  },
  
  // 体重输入变化
  onWeightInput: function(e) {
    this.setData({
      'userInfo.weight': e.detail.value
    })
  },

  // 手机号输入变化
  onPhoneInput: function(e) {
    this.setData({
      'userInfo.phone': e.detail.value
    })
  },

  // 保存设置
  saveSettings: function() {
    if (this.data.loading || this.data.savingToCloud) return

    // 密码验证
    if (this.data.newPassword) {
      if (this.data.newPassword.length < 6) {
        wx.showToast({
          title: '密码至少需要6个字符',
          icon: 'none'
        })
        return
      }
      
      if (this.data.newPassword !== this.data.confirmPassword) {
        wx.showToast({
          title: '两次输入的密码不一致',
          icon: 'none'
        })
        return
      }
    }

    // 显示加载中
    this.setData({ 
      loading: true,
      savingToCloud: true  
    })
    
    wx.showLoading({
      title: '保存中...',
      mask: true
    })

    // 确保有正确的用户ID
    const app = getApp()
    if (!app.globalData.userInfo || !app.globalData.userInfo._id) {
      wx.hideLoading()
      wx.showToast({
        title: '用户信息不完整，请重新登录',
        icon: 'none',
        duration: 2000
      })
      this.setData({ 
        loading: false,
        savingToCloud: false  
      })
      return
    }

    // 创建要保存的用户信息对象
    const updatedUserInfo = {...this.data.userInfo}
    
    // 预防性处理：确保必要的字段存在
    updatedUserInfo.nickName = updatedUserInfo.nickName || '未命名用户'
    updatedUserInfo.gender = updatedUserInfo.gender || 'male'
    updatedUserInfo.studentId = updatedUserInfo.studentId || ''
    updatedUserInfo.paddleSide = updatedUserInfo.paddleSide || ''
    updatedUserInfo.joinDate = updatedUserInfo.joinDate || ''
    updatedUserInfo.birthday = updatedUserInfo.birthday || ''
    updatedUserInfo.height = updatedUserInfo.height || ''
    updatedUserInfo.weight = updatedUserInfo.weight || ''
    updatedUserInfo.phone = updatedUserInfo.phone || ''
    
    // 确保_id字段存在
    updatedUserInfo._id = app.globalData.userInfo._id
    
    // 如果有输入新密码，更新密码
    if (this.data.newPassword) {
      updatedUserInfo.password = this.data.newPassword
    }
    
    console.log('准备更新用户信息:', updatedUserInfo)
    
    // 直接调用云函数保存到数据库
    wx.cloud.callFunction({
      name: 'user',
      data: {
        type: 'update',
        data: updatedUserInfo
      }
    }).then(res => {
      this.setData({ savingToCloud: false })
      console.log('更新用户信息结果:', res)
      
      if (res.result && res.result.code === 0) {
        // 保存成功，更新本地数据
        const userData = res.result.data || updatedUserInfo
        
        // 更新全局状态和本地存储
        getApp().globalData.userInfo = userData
        wx.setStorageSync('userInfo', userData)
        
        this.setData({
          userInfo: userData,
          loading: false,
          newPassword: '',
          confirmPassword: ''
        })
        
        wx.hideLoading()
        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500
        })
        
        // 延迟返回
        setTimeout(() => {
          wx.navigateBack({ delta: 1 })
        }, 1500)
      } else {
        // 保存失败
        wx.hideLoading()
        this.setData({ loading: false })
        
        wx.showToast({
          title: '保存失败：' + (res.result?.message || '服务器错误'),
          icon: 'none',
          duration: 2000
        })
      }
    }).catch(err => {
      this.setData({ 
        loading: false,
        savingToCloud: false 
      })
      
      wx.hideLoading()
      console.error('保存设置失败:', err)
      
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none',
        duration: 2000
      })
    })
  },

  // 滚动事件处理
  onPageScroll: function(e) {
    this.setData({
      scrollTop: e.scrollTop
    })
  },
  
  // 恢复滚动位置
  restoreScrollPosition: function() {
    if (this.data.scrollTop > 0) {
      wx.pageScrollTo({
        scrollTop: this.data.scrollTop,
        duration: 0
      })
    }
  },
  
  onShow: function() {
    // 页面显示时恢复滚动位置
    setTimeout(() => {
      this.restoreScrollPosition()
    }, 300)
  },
}) 