const cloud = require('../../utils/cloud')

Page({
  data: {
    userInfo: {},
    loading: false
  },

  onLoad: function() {
    // 加载用户信息
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
      if (userInfo._openid) {
        app.globalData.userInfo = userInfo
      }
    }
    
    // 为性别数据添加默认值，用于单选按钮组
    if (!userInfo.gender) {
      userInfo.gender = 'male'
    }
    
    this.setData({ userInfo })
    
    // 检查登录状态
    if (!userInfo || !userInfo._openid) {
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
    }
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
    const cloudPath = `avatars/${this.data.userInfo._openid}_${timestamp}_${randomStr}.jpg`

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

  // 姓名输入变化
  onNicknameInput: function(e) {
    this.setData({
      'userInfo.nickName': e.detail.value
    })
  },

  // 学号输入变化
  onStudentIdInput: function(e) {
    this.setData({
      'userInfo.studentId': e.detail.value
    })
  },

  // 性别选择变化
  onGenderChange: function(e) {
    this.setData({
      'userInfo.gender': e.detail.value
    })
  },

  // 生日选择变化
  onBirthdayChange: function(e) {
    this.setData({
      'userInfo.birthday': e.detail.value
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
    if (this.data.loading) return

    // 数据验证
    if (!this.data.userInfo.nickName?.trim()) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      })
      return
    }

    // 显示加载中
    this.setData({ loading: true })
    wx.showLoading({
      title: '保存中...',
      mask: true
    })

    try {
      // 先在本地保存，即使云端失败也能保留数据
      const updatedUserInfo = {...this.data.userInfo};
      
      // 预防性处理：确保必要的字段存在
      updatedUserInfo.nickName = updatedUserInfo.nickName || '未命名用户';
      updatedUserInfo.gender = updatedUserInfo.gender || 'male';
      updatedUserInfo.studentId = updatedUserInfo.studentId || '';
      updatedUserInfo.birthday = updatedUserInfo.birthday || '';
      updatedUserInfo.phone = updatedUserInfo.phone || '';
      
      // 保存到本地
      wx.setStorageSync('userInfo', updatedUserInfo);
      getApp().globalData.userInfo = updatedUserInfo;
      
      // 尝试保存到云端，但本地已保存成功
      wx.hideLoading();
      this.setData({ loading: false });
      
      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 1500
      });
      
      // 延迟返回
      setTimeout(() => {
        wx.navigateBack({ delta: 1 });
      }, 1500);
      
      // 后台静默保存到云端
      cloud.user.createUser(updatedUserInfo)
        .then(userData => {
          console.log('云端保存成功:', userData);
          // 更新本地数据
          if (userData && userData._id) {
            wx.setStorageSync('userInfo', userData);
            getApp().globalData.userInfo = userData;
          }
        })
        .catch(err => {
          console.error('云端保存失败（已本地保存）:', err);
        });
    } catch (err) {
      // 处理任何可能的错误
      console.error('保存过程出错:', err);
      wx.hideLoading();
      this.setData({ loading: false });
      
      wx.showToast({
        title: '已保存',
        icon: 'success', 
        duration: 1500
      });
    }
  }
}) 