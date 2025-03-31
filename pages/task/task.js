const cloud = require('../../utils/cloud')

Page({
  data: {
    form: {
      title: '',
      description: '',
      deadline: '',
      requirements: '',
      remark: ''
    },
    startDate: new Date().toISOString().split('T')[0], // 添加起始日期
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], // 添加结束日期
    userInfo: null,
    loading: false, // 添加加载状态
    isEdit: false,
    taskId: null
  },

  onLoad: function(options) {
    // 检查云函数模块是否正确加载
    console.log('cloud module:', cloud)
    if (!cloud || !cloud.task) {
      console.error('cloud module not properly loaded')
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      })
    }
    
    // 检查是否是编辑模式
    if (options.id && options.edit === '1') {
      this.setData({
        isEdit: true,
        taskId: options.id
      })
      
      // 加载任务详情
      this.loadTaskDetail(options.id)
    }
    
    this.loadUserInfo()
  },

  onShow: function() {
    this.loadUserInfo()
    this.checkLogin()
  },

  // 加载用户信息
  loadUserInfo: function() {
    const app = getApp()
    let userInfo = app.globalData.userInfo
    
    if (!userInfo) {
      userInfo = wx.getStorageSync('userInfo') || null
      if (userInfo) {
        app.globalData.userInfo = userInfo
      }
    }
    
    this.setData({ userInfo })
  },

  // 检查登录状态
  checkLogin: function() {
    if (!this.data.userInfo || !this.data.userInfo._id) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再发布任务',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/profile/profile'
          })
        }
      })
    }
  },

  // 输入框变化处理函数
  onTitleInput: function(e) {
    const form = this.data.form
    form.title = e.detail.value
    this.setData({ form })
  },

  onDescriptionInput: function(e) {
    const form = this.data.form
    form.description = e.detail.value
    this.setData({ form })
  },

  onDeadlineChange: function(e) {
    const form = this.data.form
    form.deadline = e.detail.value
    this.setData({ form })
  },

  onRequirementInput: function(e) {
    const form = this.data.form
    form.requirements = e.detail.value
    this.setData({ form })
  },

  onRemarkInput: function(e) {
    const form = this.data.form
    form.remark = e.detail.value
    this.setData({ form })
  },

  // 加载任务详情（编辑模式）
  loadTaskDetail: function(taskId) {
    wx.showLoading({
      title: '加载中...'
    })
    
    cloud.task.getTaskDetail(taskId)
      .then(task => {
        console.log('获取任务详情成功:', task)
        
        // 设置表单数据
        this.setData({
          form: {
            title: task.title || '',
            description: task.description || '',
            deadline: task.deadline || '',
            requirements: task.requirements || '',
            remark: task.remark || ''
          }
        })
        
        wx.hideLoading()
      })
      .catch(err => {
        console.error('获取任务详情失败:', err)
        wx.hideLoading()
        wx.showToast({
          title: '加载任务失败',
          icon: 'none'
        })
      })
  },

  // 提交任务
  handleSubmit: function() {
    // 再次检查登录状态
    if (!this.data.userInfo || !this.data.userInfo._id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    if (!cloud || !cloud.task) {
      console.error('cloud module not properly loaded')
      wx.showToast({
        title: '系统错误',
        icon: 'none'
      })
      return
    }

    const { form } = this.data

    // 表单验证
    if (!form.title.trim()) {
      wx.showToast({
        title: '请填写任务标题',
        icon: 'none'
      })
      return
    }

    if (!form.description.trim()) {
      wx.showToast({
        title: '请填写任务描述',
        icon: 'none'
      })
      return
    }

    if (!form.deadline) {
      wx.showToast({
        title: '请选择截止时间',
        icon: 'none'
      })
      return
    }

    // 设置加载状态
    this.setData({ loading: true })

    wx.showLoading({
      title: this.data.isEdit ? '更新中...' : '发布中...'
    })

    // 如果是编辑模式
    if (this.data.isEdit && this.data.taskId) {
      // 更新任务数据
      const taskData = {
        ...form,
        _id: this.data.taskId,
        updatedAt: new Date().getTime()
      }

      cloud.task.updateTask(taskData)
        .then(() => {
          wx.hideLoading()
          
          this.setData({ loading: false })
          
          wx.showToast({
            title: '更新成功',
            icon: 'success'
          })
          
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        })
        .catch(err => {
          console.error('更新任务失败:', err)
          
          this.setData({ loading: false })
          
          wx.hideLoading()
          wx.showToast({
            title: err.message || '更新失败，请重试',
            icon: 'none'
          })
        })
      
      return
    }

    // 添加用户信息和时间戳到任务数据
    const taskData = {
      ...form,
      createdBy: this.data.userInfo._id,
      creatorName: this.data.userInfo.nickName,
      createdAt: new Date().getTime(),
      status: 'active', // 标记任务状态为活跃
      participants: [], // 初始化参与者列表
      completedCount: 0 // 初始化完成计数
    }

    cloud.task.createTask(taskData)
      .then(() => {
        wx.hideLoading()
        
        // 重置表单数据
        this.setData({
          form: {
            title: '',
            description: '',
            deadline: '',
            requirements: '',
            remark: ''
          },
          loading: false
        })
        
        wx.showToast({
          title: '发布成功',
          icon: 'success'
        })
        
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          })
        }, 1500)
      })
      .catch(err => {
        console.error('创建任务失败:', err)
        
        this.setData({ loading: false })
        
        wx.hideLoading()
        wx.showToast({
          title: err.message || '发布失败，请重试',
          icon: 'none'
        })
      })
  },

  // 处理导航栏返回按钮点击
  onBackTap: function() {
    wx.navigateBack({
      delta: 1
    })
  }
}) 